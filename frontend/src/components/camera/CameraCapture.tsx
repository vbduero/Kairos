// ============================================================
//  CameraCapture — Componente principal de captura
//  Integra MediaPipe + Clasificador LSC en tiempo real
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SignDisplay } from '../ui/SignDisplay';
import { ConfidenceBar } from '../ui/ConfidenceBar';
import { useTranslatorStore } from '../../store/translatorStore';

// ── Calcula en qué tercio (col, row) está una muñeca ─────────
// El browser muestra la cámara frontal ya espejada, y el backend
// procesa el frame también espejado → coordenadas coinciden directo.
function wristZone(kp: number[], offset: number): { col: number; row: number } | null {
  const x = kp[offset];
  const y = kp[offset + 1];
  if (x === 0 && y === 0) return null;
  return {
    col: Math.min(2, Math.floor(x * 3)),
    row: Math.min(2, Math.floor(y * 3)),
  };
}

// ── SVG de zonas activas + cuadrícula de tercios ─────────────
const ThirdGrid: React.FC<{ keypoints: number[]; handsCount: number }> = ({ keypoints, handsCount }) => {
  const zones = useMemo(() => {
    if (!keypoints.length) return [];
    const result: { col: number; row: number; isSecond: boolean }[] = [];
    const z1 = wristZone(keypoints, 0);
    if (z1) result.push({ ...z1, isSecond: false });
    if (handsCount >= 2) {
      const z2 = wristZone(keypoints, 63);
      if (z2) result.push({ ...z2, isSecond: true });
    }
    return result;
  }, [keypoints, handsCount]);

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 300 300" preserveAspectRatio="none"
    >
      {/* Zonas activas — fill sutil + borde de color */}
      {zones.map((z, i) => {
        const x = z.col * 100;
        const y = z.row * 100;
        const fill   = z.isSecond ? 'rgba(250,204,21,0.12)' : 'rgba(0,255,120,0.12)';
        const stroke = z.isSecond ? 'rgba(250,204,21,0.85)' : 'rgba(0,255,120,0.85)';
        return (
          <rect key={i} x={x + 1} y={y + 1} width={98} height={98}
            fill={fill} stroke={stroke} strokeWidth="2" rx="2" />
        );
      })}
      {/* Líneas verticales */}
      <line x1="100" y1="0" x2="100" y2="300" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="200" y1="0" x2="200" y2="300" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="4 4" />
      {/* Líneas horizontales */}
      <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="0" y1="200" x2="300" y2="200" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="4 4" />
      {/* Puntos de intersección */}
      {([[100,100],[200,100],[100,200],[200,200]] as [number,number][]).map(([cx,cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="1.5" fill="rgba(255,255,255,0.6)" />
        </g>
      ))}
    </svg>
  );
};

export const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, response, startSendingFrames, stopSendingFrames } = useWebSocket();
  const [isCapturing, setIsCapturing]   = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.50);
  const [lastValidPrediction, setLastValidPrediction] = useState<{ sign: string; confidence: number } | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const lastSpokenRef = useRef<string | null>(null);

  const updateTranslator = useTranslatorStore(s => s.update);
  // Auto-clear: se resetea con cada nueva predicción válida.
  // Dispara 1.5 s después de la ÚLTIMA predicción recibida → limpia independientemente
  // de hand_detected (resuelve el bug de 15-20 s con smooth_landmarks=True).
  const autoClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce de pérdida de mano: limpia inmediatamente si la mano desaparece
  // de forma estable (tolerando drops breves de 1-2 frames).
  const handLostTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Asignar el stream al elemento de video cuando esté disponible
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Iniciar el envío de frames cuando TODAS las condiciones estén listas
  useEffect(() => {
    if (!isCapturing || !isConnected || !stream || !videoRef.current) return;
    startSendingFrames(videoRef.current);
  }, [isCapturing, isConnected, stream, startSendingFrames]);

  // ── Manejar respuestas del backend ──
  useEffect(() => {
    if (!response) return;

    if (!response.hand_detected) {
      // Debounce de 300 ms: tolera drops breves de MediaPipe sin parpadear.
      // Si la mano reaparece antes de 300 ms, cancela la limpieza.
      if (!handLostTimerRef.current) {
        handLostTimerRef.current = setTimeout(() => {
          // Mano perdida: reset completo del estado de display
          setLastValidPrediction(null);
          if (autoClearTimerRef.current) {
            clearTimeout(autoClearTimerRef.current);
            autoClearTimerRef.current = null;
          }
          handLostTimerRef.current = null;
        }, 200);  // 200 ms: tolera drops breves sin parpadear (4 frames a 20fps)
      }
      return;
    }

    // Mano detectada → cancelar cualquier limpieza pendiente por pérdida
    if (handLostTimerRef.current) {
      clearTimeout(handLostTimerRef.current);
      handLostTimerRef.current = null;
    }

    const sign       = response.predicted_sign;
    const confidence = response.confidence;

    if (sign && confidence >= confidenceThreshold) {
      // Actualizar la seña y resetear el timer de auto-clear.
      // Siempre creamos un objeto nuevo para que el timer se reinicie
      // aunque sea el mismo signo (garantiza que se limpia 1.5 s tras la
      // ÚLTIMA predicción recibida, no tras la primera).
      setLastValidPrediction({ sign, confidence });
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = setTimeout(() => {
        setLastValidPrediction(null);
        autoClearTimerRef.current = null;
      }, 1500);
    }
  }, [response, confidenceThreshold]);

  // Cleanup al desmontar
  useEffect(() => () => {
    stopSendingFrames();
    stopCamera();
    if (autoClearTimerRef.current)  clearTimeout(autoClearTimerRef.current);
    if (handLostTimerRef.current)   clearTimeout(handLostTimerRef.current);
  }, []);

  // ── Sincronizar keypoints y estado de mano al translatorStore ──
  useEffect(() => {
    if (!response) return;
    updateTranslator({
      keypoints:    response.keypoints ?? [],
      handDetected: response.hand_detected,
      handsCount:   response.hands_count,
    });
  }, [response, updateTranslator]);

  // ── Sincronizar seña validada al translatorStore ──
  useEffect(() => {
    updateTranslator({
      predictedSign: lastValidPrediction?.sign ?? null,
      confidence:    lastValidPrediction?.confidence ?? 0,
    });
  }, [lastValidPrediction, updateTranslator]);

  // ── Text-to-speech: habla la seña cuando cambia y TTS está activo ──
  useEffect(() => {
    if (!ttsEnabled || !lastValidPrediction) return;
    const text = lastValidPrediction.sign.replace(/_/g, ' ');
    // No repetir la misma seña consecutivamente
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'es-ES';
    utt.rate  = 1.1;
    utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  }, [lastValidPrediction, ttsEnabled]);

  const handleToggle = async () => {
    if (!isCapturing) {
      if (!isActive) await startCamera();
      setIsCapturing(true);
    } else {
      stopSendingFrames();
      setIsCapturing(false);
    }
  };

  const handsCount    = (response?.hand_detected && response?.hands_count) ? response.hands_count : 0;
  const bufferProgress = response?.buffer_progress ?? 0;

  return (
    <div className="capture-layout">

      {/* ── Izquierda: cámara ── */}
      <div className="camera-section">
        {error ? (
          <div className="camera-placeholder">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
            </svg>
            <p className="camera-error">{error}</p>
          </div>
        ) : !isActive ? (
          <div className="camera-placeholder">
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
            </svg>
            <p style={{ fontSize: 13, marginTop: 4 }}>Presiona "Iniciar captura" para activar la cámara</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted />
            <ThirdGrid
              keypoints={response?.keypoints ?? []}
              handsCount={response?.hands_count ?? 0}
            />
          </>
        )}

        {/* Estado de conexión */}
        <div className="status-badge">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span style={{ color: isConnected ? '#86efac' : '#fca5a5' }}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {/* Indicadores en cámara */}
        {isCapturing && (
          <div className="camera-chips">
            <div className="info-chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#10b981">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span className="val">20 fps</span>
            </div>
            {handsCount > 0 && (
              <div className="info-chip">
                {handsCount === 2 ? '🤲' : '🖐'} <span className="val">{handsCount}</span>
              </div>
            )}
            {bufferProgress > 0 && bufferProgress < 1 && (
              <div className="info-chip">
                ⏳ <span className="val">{Math.round(bufferProgress * 100)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Derecha: controles y resultado ── */}
      <div className="side-panel">

        {/* Sección: control de captura */}
        <div className="panel-section">
          <p className="panel-section-label">Control</p>
          <button onClick={handleToggle} className={`btn-capture ${isCapturing ? 'stop' : 'start'} full-width`}>
            {isCapturing ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Detener captura
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8"/>
                  <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>
                Iniciar captura
              </>
            )}
          </button>
        </div>

        {/* Sección: voz */}
        <div className="panel-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="panel-section-label" style={{ margin: 0 }}>Voz</p>
            <button
              onClick={() => {
                if (ttsEnabled) window.speechSynthesis.cancel();
                lastSpokenRef.current = null;
                setTtsEnabled(v => !v);
              }}
              title={ttsEnabled ? 'Desactivar voz' : 'Activar voz'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: ttsEnabled ? 'rgba(99,102,241,0.20)' : 'rgba(255,255,255,0.06)',
                color: ttsEnabled ? '#a5b4fc' : 'var(--text-muted)',
                outline: ttsEnabled ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {ttsEnabled ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/>
                  <line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              )}
              {ttsEnabled ? 'Activa' : 'Silencio'}
            </button>
          </div>
        </div>

        {/* Sección: seña detectada */}
        <div className="panel-section">
          <p className="panel-section-label">Seña detectada</p>
          <SignDisplay
            sign={lastValidPrediction?.sign ?? null}
            confidence={lastValidPrediction?.confidence ?? 0}
            handDetected={response?.hand_detected ?? false}
            confidenceThreshold={confidenceThreshold}
          />
        </div>

        {/* Sección: confianza en tiempo real */}
        <div className="panel-section">
          <p className="panel-section-label">Confianza en tiempo real</p>
          <ConfidenceBar
            confidence={response?.confidence ?? 0}
            handDetected={response?.hand_detected ?? false}
          />
        </div>

        {/* Sección: umbral */}
        <div className="panel-section">
          <div className="threshold-header">
            <span className="panel-section-label">Umbral mínimo</span>
            <span className="threshold-value">{Math.round(confidenceThreshold * 100)}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={95}
            value={Math.round(confidenceThreshold * 100)}
            onChange={e => setConfidenceThreshold(Number(e.target.value) / 100)}
            className="threshold-slider"
          />
          <div className="threshold-hints">
            <span>50% más sensible</span>
            <span>95% más estricto</span>
          </div>
        </div>

      </div>
    </div>
  );
};
