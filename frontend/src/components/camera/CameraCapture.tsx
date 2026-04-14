// ============================================================
//  CameraCapture — Componente principal de captura
//  Integra MediaPipe + Clasificador LSC en tiempo real
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SignDisplay } from '../ui/SignDisplay';
import { ConfidenceBar } from '../ui/ConfidenceBar';
import { useTranslatorStore } from '../../store/translatorStore';

export const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, response, startSendingFrames, stopSendingFrames } = useWebSocket();
  const [isCapturing, setIsCapturing]   = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.50);
  const [lastValidPrediction, setLastValidPrediction] = useState<{ sign: string; confidence: number } | null>(null);

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
          <video ref={videoRef} autoPlay playsInline muted />
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
