// ============================================================
//  RecordPage — Versión web de recolectar_datos.py
//  Mismo pipeline: seleccionar seña → countdown → 5 frames →
//  backend extrae 168 kp raw → augmentar → preprocesar → entrenar
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera }    from '../hooks/useCamera';
import { useWebSocket } from '../hooks/useWebSocket';

const API            = 'http://localhost:8000/api/v1';
const TARGET_SAMPLES = 50;
const FRAMES_PER_SEQ = 5;
const FRAME_GAP_MS   = 160;   // ~6 fps de captura, igual que el script (200 ms)

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Cuadrícula de tercios (igual que CameraCapture) ──────────
const ThirdGrid: React.FC<{ handDetected: boolean }> = ({ handDetected }) => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    viewBox="0 0 300 300" preserveAspectRatio="none">
    {handDetected && (
      <rect x="1" y="1" width="298" height="298" fill="none"
        stroke="rgba(16,185,129,0.7)" strokeWidth="2.5" rx="3" />
    )}
    <line x1="100" y1="0"   x2="100" y2="300" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 4"/>
    <line x1="200" y1="0"   x2="200" y2="300" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 4"/>
    <line x1="0"   y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 4"/>
    <line x1="0"   y1="200" x2="300" y2="200" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 4"/>
    {([[100,100],[200,100],[100,200],[200,200]] as [number,number][]).map(([cx,cy]) => (
      <g key={`${cx}-${cy}`}>
        <circle cx={cx} cy={cy} r="5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r="1.5" fill="rgba(255,255,255,0.5)"/>
      </g>
    ))}
  </svg>
);

// ── Mini-anillo de progreso ──────────────────────────────────
const Ring: React.FC<{ count: number; color: string }> = ({ count, color }) => {
  const pct = Math.min(count / TARGET_SAMPLES, 1);
  const r   = 9; const circ = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5"/>
      <circle cx="12" cy="12" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 12 12)"/>
    </svg>
  );
};

// ── Tipos ────────────────────────────────────────────────────
interface VocabEntry { sign: string; count: number; complete: boolean; in_vocab: boolean }
interface RetrainState { status: 'idle'|'running'|'done'|'error'; message: string }

export default function RecordPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const captureCanvas = useRef<HTMLCanvasElement>(null);

  const { stream, error: camError, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, response, startSendingFrames, stopSendingFrames } = useWebSocket();

  const [vocab,        setVocab]        = useState<VocabEntry[]>([]);
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [sampleCount,  setSampleCount]  = useState(0);
  const [phase,        setPhase]        = useState<'idle'|'countdown'|'recording'>('idle');
  const [countdown,    setCountdown]    = useState<number | null>(null);
  const [lastMsg,      setLastMsg]      = useState<{ text: string; ok: boolean } | null>(null);
  const [retrain,      setRetrain]      = useState<RetrainState>({ status: 'idle', message: 'Listo' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Conectar stream al video ─────────────────────────────
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  // ── Enviar frames al WS para live hand detection ─────────
  useEffect(() => {
    if (isActive && isConnected && stream && videoRef.current)
      startSendingFrames(videoRef.current);
  }, [isActive, isConnected, stream, startSendingFrames]);

  // ── Cargar vocabulario al montar ─────────────────────────
  useEffect(() => { fetchVocab(); }, []);

  // ── Cleanup ──────────────────────────────────────────────
  useEffect(() => () => {
    stopSendingFrames(); stopCamera();
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const fetchVocab = async () => {
    try {
      const data: VocabEntry[] = await fetch(`${API}/record/vocabulary`).then(r => r.json());
      setVocab(data);
    } catch { /* backend puede no estar listo */ }
  };

  // ── Seleccionar seña ─────────────────────────────────────
  const selectSign = (sign: string, count: number) => {
    if (phase !== 'idle') return;
    setSelectedSign(sign);
    setSampleCount(count);
    setLastMsg(null);
  };

  // ── Capturar un frame como base64 JPEG ──────────────────
  const grabFrame = useCallback((): string | null => {
    const v = videoRef.current;
    const c = captureCanvas.current;
    if (!v || !c || v.readyState < v.HAVE_ENOUGH_DATA) return null;
    c.width  = Math.min(v.videoWidth  || 640, 640);
    c.height = Math.min(v.videoHeight || 480, 480);
    const ctx = c.getContext('2d')!;
    // Espejo igual que useWebSocket (backend espera frame ya espejado)
    ctx.save(); ctx.scale(-1, 1);
    ctx.drawImage(v, -c.width, 0, c.width, c.height);
    ctx.restore();
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, []);

  // ── Flujo principal de captura ───────────────────────────
  const handleCapture = useCallback(async () => {
    if (!selectedSign || !isActive || phase !== 'idle') return;

    // ── Countdown 3-2-1 (igual que el script) ──────────────
    setPhase('countdown');
    for (let i = 3; i >= 1; i--) {
      setCountdown(i); await sleep(800);
    }
    setCountdown(null);
    setPhase('recording');
    setLastMsg(null);

    // ── Capturar FRAMES_PER_SEQ frames ─────────────────────
    const frames: string[] = [];
    for (let i = 0; i < FRAMES_PER_SEQ; i++) {
      const f = grabFrame();
      if (f) frames.push(f);
      await sleep(FRAME_GAP_MS);
    }

    if (frames.length < FRAMES_PER_SEQ) {
      setLastMsg({ text: 'Error al capturar frames — ¿cámara activa?', ok: false });
      setPhase('idle'); return;
    }

    // ── Enviar al backend ────────────────────────────────────
    try {
      const res = await fetch(`${API}/record/sample`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sign: selectedSign, frames }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Error desconocido');
      }

      const data = await res.json();
      setSampleCount(data.total_samples);
      setLastMsg({ text: `✓ Muestra ${data.total_samples}/${TARGET_SAMPLES} guardada (${data.frames_with_hand}/5 con mano)`, ok: true });
      // Actualizar el chip en el grid
      setVocab(prev => prev.map(v =>
        v.sign === selectedSign
          ? { ...v, count: data.total_samples, complete: data.total_samples >= TARGET_SAMPLES }
          : v
      ));
    } catch (e: any) {
      setLastMsg({ text: `Error: ${e.message}`, ok: false });
    } finally {
      setPhase('idle');
    }
  }, [selectedSign, isActive, phase, grabFrame]);

  // ── Reentrenamiento ──────────────────────────────────────
  const handleRetrain = async () => {
    if (retrain.status === 'running') return;
    try {
      await fetch(`${API}/record/retrain`, { method: 'POST' });
      setRetrain({ status: 'running', message: 'Iniciando...' });
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const data: RetrainState = await fetch(`${API}/record/retrain/status`).then(r => r.json());
          setRetrain(data);
          if (data.status !== 'running') { clearInterval(pollRef.current!); pollRef.current = null; }
        } catch { /* silencioso */ }
      }, 1500);
    } catch (e: any) {
      setRetrain({ status: 'error', message: e.message });
    }
  };

  // ── Derivados ────────────────────────────────────────────
  const handDetected   = response?.hand_detected ?? false;
  const progress       = Math.min(sampleCount / TARGET_SAMPLES, 1);
  const totalSamples   = vocab.reduce((s, v) => s + v.count, 0);
  const completedSigns = vocab.filter(v => v.complete).length;
  const globalPct      = vocab.length > 0 ? completedSigns / vocab.length : 0;
  const busy           = phase !== 'idle';

  return (
    <div className="page" style={{ gap: 0, paddingTop: 110, paddingBottom: 64 }}>

      {/* ── Cabecera global ── */}
      <div style={{ textAlign: 'center', marginBottom: 24, width: '100%', maxWidth: 1040 }}>
        <h1 className="text-1xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f3f4f6] to-[#9ca3af] mb-3 tracking-tighter">
          Recolección de Señas LSC
        </h1>
        {/* Barra de progreso global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 6 }}>
          <div style={{ width: 260, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${globalPct * 100}%`, borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#10b981)', transition: 'width 0.5s' }}/>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#34d399', fontWeight: 700 }}>{completedSigns}</span>
            <span style={{ color: 'var(--text-muted)' }}> / {vocab.length} señas completas</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 10 }}>· {totalSamples} muestras totales</span>
          </span>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, width: '100%', maxWidth: 1040, alignItems: 'start' }}>

        {/* ── Cámara ── */}
        <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden', background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)' }}>
          {!isActive ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <svg width="52" height="52" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"/>
              </svg>
              <p style={{ fontSize: 13 }}>Activa la cámara para comenzar</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}/>
              <ThirdGrid handDetected={handDetected}/>
            </>
          )}

          {/* Overlay countdown */}
          {countdown !== null && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
              <span style={{ fontSize: 130, fontWeight: 900, color: '#fff', textShadow: '0 0 50px rgba(99,102,241,0.85)', lineHeight: 1 }}>
                {countdown}
              </span>
            </div>
          )}

          {/* Borde verde al grabar */}
          {phase === 'recording' && (
            <div style={{ position: 'absolute', inset: 0, border: '3px solid #10b981', borderRadius: 16, pointerEvents: 'none', boxShadow: 'inset 0 0 40px rgba(16,185,129,0.15)' }}/>
          )}

          {/* Seña activa encima de la cámara */}
          {selectedSign && isActive && (
            <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Grabando:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f9fafb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{selectedSign}</span>
              <span style={{ fontSize: 12, color: sampleCount >= TARGET_SAMPLES ? '#34d399' : '#fbbf24' }}>{sampleCount}/{TARGET_SAMPLES}</span>
            </div>
          )}

          {/* Indicador de mano */}
          {isActive && (
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: handDetected ? '#10b981' : '#4b5563', transition: 'background 0.2s', display: 'inline-block' }}/>
              <span style={{ fontSize: 11, color: handDetected ? '#34d399' : 'var(--text-muted)' }}>
                {handDetected ? 'Mano detectada' : 'Sin mano'}
              </span>
            </div>
          )}

          {/* Estado WS */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', display: 'inline-block' }}/>
            <span style={{ fontSize: 10, color: isConnected ? '#86efac' : '#fca5a5' }}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {camError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#f87171', fontSize: 13 }}>{camError}</p>
            </div>
          )}

          <canvas ref={captureCanvas} style={{ display: 'none' }}/>
        </div>

        {/* ── Panel derecho ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Seña seleccionada */}
          <div className="panel-section">
            <p className="panel-section-label">Seña seleccionada</p>
            {selectedSign ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#f9fafb' }}>
                    {selectedSign}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: sampleCount >= TARGET_SAMPLES ? '#34d399' : '#fbbf24' }}>
                    {sampleCount} / {TARGET_SAMPLES}
                  </span>
                </div>
                {/* Barra de progreso */}
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${progress * 100}%`, borderRadius: 99, transition: 'width 0.4s', background: progress >= 1 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#6366f1,#a855f7)' }}/>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {sampleCount < TARGET_SAMPLES
                    ? `Faltan ${TARGET_SAMPLES - sampleCount} muestras`
                    : 'Objetivo alcanzado ✓ — puedes grabar más'}
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Haz clic en una seña del vocabulario para seleccionarla
              </p>
            )}
          </div>

          {/* Cámara + Captura */}
          <div className="panel-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="panel-section-label">Control</p>
            {!isActive ? (
              <button onClick={startCamera} className="btn-capture start full-width">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4" fill="white"/></svg>
                Activar cámara
              </button>
            ) : (
              <>
                <button
                  onClick={handleCapture}
                  disabled={busy || !selectedSign}
                  style={{
                    width: '100%', padding: '11px 16px', borderRadius: 10, fontSize: 14,
                    fontWeight: 700, cursor: busy || !selectedSign ? 'not-allowed' : 'pointer',
                    opacity: !selectedSign ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    border: 'none', transition: 'all 0.2s',
                    background: phase === 'recording'
                      ? 'rgba(16,185,129,0.2)'
                      : phase === 'countdown'
                        ? 'rgba(251,191,36,0.15)'
                        : 'linear-gradient(135deg,rgba(99,102,241,0.85),rgba(168,85,247,0.85))',
                    color: phase === 'recording' ? '#34d399' : phase === 'countdown' ? '#fbbf24' : '#fff',
                  }}
                >
                  {phase === 'countdown' ? `Prepárate... ${countdown ?? ''}` :
                   phase === 'recording' ? (
                    <>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-dot 0.8s ease infinite' }}/>
                      Grabando...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5" fill="white"/></svg>
                      Capturar muestra
                    </>
                  )}
                </button>
                <button onClick={() => { stopSendingFrames(); stopCamera(); }}
                  style={{ padding: '7px', borderRadius: 10, fontSize: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Apagar cámara
                </button>
              </>
            )}
          </div>

          {/* Mensaje de resultado */}
          {lastMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.5,
              background: lastMsg.ok ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
              border: `1px solid ${lastMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: lastMsg.ok ? '#34d399' : '#f87171',
            }}>
              {lastMsg.text}
            </div>
          )}

          {/* Reentrenamiento */}
          <div className="panel-section">
            <p className="panel-section-label" style={{ marginBottom: 8 }}>Pipeline de entrenamiento</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
              Augmentar (×5) → Preprocesar → Entrenar BiLSTM<br/>
              ~5–10 min · El modelo se recarga automáticamente
            </p>
            <button onClick={handleRetrain}
              disabled={retrain.status === 'running' || totalSamples === 0}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                fontWeight: 600, cursor: retrain.status === 'running' || totalSamples === 0 ? 'not-allowed' : 'pointer',
                opacity: totalSamples === 0 ? 0.35 : 1,
                background: retrain.status === 'running' ? 'rgba(251,191,36,0.10)' : retrain.status === 'done' ? 'rgba(16,185,129,0.10)' : retrain.status === 'error' ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.05)',
                border: retrain.status === 'running' ? '1px solid rgba(251,191,36,0.3)' : retrain.status === 'done' ? '1px solid rgba(16,185,129,0.3)' : retrain.status === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.09)',
                color: retrain.status === 'running' ? '#fbbf24' : retrain.status === 'done' ? '#34d399' : retrain.status === 'error' ? '#f87171' : '#f9fafb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
              }}>
              {retrain.status === 'running' ? (
                <><span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #fbbf24', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}/>{retrain.message}</>
              ) : retrain.status === 'done'  ? `✓ ${retrain.message}`
                : retrain.status === 'error' ? '✗ Error — ver consola'
                : 'Reentrenar modelo'}
            </button>
            {retrain.status === 'error' && (
              <p style={{ fontSize: 10, color: '#f87171', marginTop: 6, wordBreak: 'break-all' }}>{retrain.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Vocabulario grid ── */}
      <div style={{ width: '100%', maxWidth: 1040, marginTop: 26, background: 'rgba(17,24,39,0.65)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
            Vocabulario — {vocab.length} señas
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Objetivo: {TARGET_SAMPLES} muestras/seña · haz clic para seleccionar
          </span>
        </div>

        {/* Palabras y frases */}
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Palabras y frases</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {vocab.filter(v => v.in_vocab && v.sign.length > 1).map(entry => (
            <VocabChip key={entry.sign} entry={entry} selected={selectedSign === entry.sign} onSelect={selectSign} busy={busy}/>
          ))}
        </div>

        {/* Alfabeto */}
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alfabeto</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: vocab.some(v => !v.in_vocab) ? 16 : 0 }}>
          {vocab.filter(v => v.in_vocab && v.sign.length === 1).map(entry => (
            <VocabChip key={entry.sign} entry={entry} selected={selectedSign === entry.sign} onSelect={selectSign} busy={busy}/>
          ))}
        </div>

        {/* Señas extra (grabadas por el usuario fuera del vocabulario) */}
        {vocab.some(v => !v.in_vocab) && (
          <>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Señas extra</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {vocab.filter(v => !v.in_vocab).map(entry => (
                <VocabChip key={entry.sign} entry={entry} selected={selectedSign === entry.sign} onSelect={selectSign} busy={busy}/>
              ))}
            </div>
          </>
        )}

        {/* Input para nueva seña no en vocabulario */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Agregar seña personalizada..."
            id="custom-sign-input"
            disabled={busy}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 9, fontSize: 13,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#f9fafb', outline: 'none',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim().toLowerCase();
                if (v) { selectSign(v, vocab.find(x => x.sign === v)?.count ?? 0); (e.target as HTMLInputElement).value = ''; }
              }
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Enter para seleccionar</span>
        </div>
      </div>

      <style>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}

// ── Chip de seña en el vocabulario ──────────────────────────
function VocabChip({ entry, selected, onSelect, busy }: {
  entry: VocabEntry;
  selected: boolean;
  onSelect: (s: string, c: number) => void;
  busy: boolean;
}) {
  const pct    = Math.min(entry.count / TARGET_SAMPLES, 1);
  const isDone = entry.complete;

  return (
    <div
      onClick={() => !busy && onSelect(entry.sign, entry.count)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px 5px 7px', borderRadius: 9,
        cursor: busy ? 'not-allowed' : 'pointer',
        userSelect: 'none', transition: 'all 0.15s',
        background: selected
          ? 'rgba(99,102,241,0.20)'
          : isDone ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
        border: selected
          ? '1px solid rgba(99,102,241,0.55)'
          : isDone ? '1px solid rgba(16,185,129,0.28)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: selected ? '0 0 12px rgba(99,102,241,0.25)' : 'none',
      }}
    >
      <Ring count={entry.count} color={isDone ? '#10b981' : selected ? '#6366f1' : '#4b5563'}/>
      <span style={{ fontSize: 12, fontWeight: selected ? 700 : 500, color: selected ? '#c7d2fe' : isDone ? '#6ee7b7' : '#9ca3af' }}>
        {entry.sign}
      </span>
      {entry.count > 0 && !isDone && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entry.count}</span>
      )}
      {isDone && (
        <span style={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>✓</span>
      )}
    </div>
  );
}
