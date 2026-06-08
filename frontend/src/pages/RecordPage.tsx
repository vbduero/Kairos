import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'http://localhost:8000/api/v1';
const TARGET_SAMPLES = 50;
const FRAMES_PER_SEQ = 20;
const FRAME_GAP_MS = 100;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const Ring: React.FC<{ count: number; color: string }> = ({ count, color }) => {
  const pct = Math.min(count / TARGET_SAMPLES, 1);
  const r = 9; const circ = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(10, 31, 68, 0.05)" strokeWidth="2.5"/>
      <circle cx="12" cy="12" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 12 12)"/>
    </svg>
  );
};

export default function RecordPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvas = useRef<HTMLCanvasElement>(null);

  const { stream, error: camError, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, response, startSendingFrames, stopSendingFrames } = useWebSocket();

  const [vocab, setVocab] = useState<any[]>([]);
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [phase, setPhase] = useState<'idle'|'countdown'|'recording'>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (isActive && isConnected && stream && videoRef.current)
      startSendingFrames(videoRef.current);
  }, [isActive, isConnected, stream, startSendingFrames]);

  useEffect(() => {
    fetch(`${API}/record/vocabulary`).then(r => r.json()).then(setVocab).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      stopSendingFrames(); 
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSign = (sign: string, count: number) => {
    if (phase !== 'idle') return;
    setSelectedSign(sign);
    setSampleCount(count);
  };

  const grabFrame = useCallback((): string | null => {
    const v = videoRef.current;
    const c = captureCanvas.current;
    if (!v || !c || v.readyState < v.HAVE_ENOUGH_DATA) return null;
    c.width = 640; c.height = 480;
    const ctx = c.getContext('2d')!;
    ctx.save(); ctx.scale(-1, 1);
    ctx.drawImage(v, -c.width, 0, c.width, c.height);
    ctx.restore();
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, []);

  const handleCapture = useCallback(async () => {
    if (!selectedSign || !isActive || phase !== 'idle') return;
    setPhase('countdown');
    for (let i = 3; i >= 1; i--) { setCountdown(i); await sleep(800); }
    setCountdown(null);
    setPhase('recording');

    const frames: string[] = [];
    for (let i = 0; i < FRAMES_PER_SEQ; i++) {
      const f = grabFrame();
      if (f) frames.push(f);
      await sleep(FRAME_GAP_MS);
    }

    try {
      const res = await fetch(`${API}/record/sample`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sign: selectedSign, frames }),
      });
      if (res.ok) {
        const data = await res.json();
        setSampleCount(data.total_samples);
        setVocab(prev => prev.map(v => v.sign === selectedSign ? { ...v, count: data.total_samples, complete: data.total_samples >= TARGET_SAMPLES } : v));
      }
    } catch (e) {} finally { setPhase('idle'); }
  }, [selectedSign, isActive, phase, grabFrame]);

  return (
    <div style={{ padding: '100px 24px 64px', maxWidth: 1440, margin: '0 auto', minHeight: '100vh', width: '100%' }}>
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0A1F44] to-[#005B96] mb-8 tracking-tight">
        Dashboard de Datos
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>
        
        {/* Left: Camera */}
        <div style={{ 
          position: 'relative', aspectRatio: '4/3', 
          background: '#000000', borderRadius: 24, overflow: 'hidden', 
          border: '1px solid rgba(10, 31, 68, 0.08)', boxShadow: '0 16px 40px rgba(0,0,0,0.05)' 
        }}>
          {!isActive ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', background: '#F8FAFC' }}>
              <button onClick={startCamera} style={{ padding: '12px 24px', background: '#0A1F44', color: 'white', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,31,68,0.2)' }}>
                Activar Cámara
              </button>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}/>
          )}

          {countdown !== null && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: 130, fontWeight: 900, color: '#00C9A7', textShadow: '0 0 40px rgba(0, 201, 167, 0.5)' }}>{countdown}</span>
            </div>
          )}
          {phase === 'recording' && <div style={{ position: 'absolute', inset: 0, border: '4px solid #00C9A7', borderRadius: 24, pointerEvents: 'none' }}/>}
          <canvas ref={captureCanvas} style={{ display: 'none' }}/>
        </div>

        {/* Right: Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 24, border: '1px solid rgba(10, 31, 68, 0.08)', boxShadow: '0 8px 24px rgba(10,31,68,0.04)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Control de Captura</h3>
            <button onClick={handleCapture} disabled={phase !== 'idle' || !selectedSign}
              style={{
                width: '100%', padding: 16, borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none', cursor: phase === 'idle' && selectedSign ? 'pointer' : 'not-allowed',
                background: phase === 'recording' ? 'rgba(0, 201, 167, 0.15)' : phase === 'countdown' ? 'rgba(245, 158, 11, 0.15)' : '#0A1F44',
                color: phase === 'recording' ? '#00C9A7' : phase === 'countdown' ? '#F59E0B' : '#FFFFFF',
                boxShadow: phase === 'idle' && selectedSign ? '0 4px 12px rgba(10, 31, 68, 0.2)' : 'none',
                transition: 'all 0.2s'
              }}>
              {phase === 'recording' ? 'Grabando...' : phase === 'countdown' ? 'Prepárate...' : 'Capturar Muestra'}
            </button>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 24, border: '1px solid rgba(10, 31, 68, 0.08)', boxShadow: '0 8px 24px rgba(10,31,68,0.04)', flex: 1 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Vocabulario</h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {vocab.map(v => (
                <div key={v.sign} onClick={() => selectSign(v.sign, v.count)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    background: selectedSign === v.sign ? '#F1F5F9' : '#FFFFFF',
                    border: selectedSign === v.sign ? '1px solid #005B96' : '1px solid rgba(10, 31, 68, 0.08)',
                    boxShadow: selectedSign === v.sign ? '0 4px 12px rgba(0, 91, 150, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}>
                  <Ring count={v.count} color={v.complete ? '#10B981' : selectedSign === v.sign ? '#005B96' : '#94A3B8'} />
                  <span style={{ color: selectedSign === v.sign ? '#0A1F44' : '#475569', fontWeight: selectedSign === v.sign ? 700 : 500, textTransform: 'capitalize' }}>
                    {v.sign}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
