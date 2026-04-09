// ============================================================
//  CameraCapture — Componente principal de captura
//  Integra MediaPipe + Clasificador LSC en tiempo real
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SignDisplay } from '../ui/SignDisplay';
import { ConfidenceBar } from '../ui/ConfidenceBar';
import { SignHistory } from '../ui/SignHistory';
import type { SignEntry } from '../ui/SignHistory';

export const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, response, startSendingFrames, stopSendingFrames } = useWebSocket();
  const [isCapturing, setIsCapturing] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [history, setHistory] = useState<SignEntry[]>([]);
  const lastSignRef = useRef<string | null>(null);
  const noHandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Asignar el stream al elemento de video cuando esté disponible
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Iniciar el envío de frames cuando TODAS las condiciones estén listas:
  // captura activa + WS conectado + stream disponible
  // Esto resuelve la condición de carrera que requería dos clics
  useEffect(() => {
    if (!isCapturing || !isConnected || !stream || !videoRef.current) return;
    startSendingFrames(videoRef.current);
  }, [isCapturing, isConnected, stream, startSendingFrames]);

  // ── Manejar historial de señas ──
  useEffect(() => {
    if (!response) return;

    if (!response.hand_detected) {
      // Limpiar historial si no hay mano por más de 2 segundos
      if (!noHandTimerRef.current) {
        noHandTimerRef.current = setTimeout(() => {
          lastSignRef.current = null;
        }, 2000);
      }
      return;
    }

    // Cancelar timer de limpieza si hay mano
    if (noHandTimerRef.current) {
      clearTimeout(noHandTimerRef.current);
      noHandTimerRef.current = null;
    }

    // Agregar al historial si la seña cambió y supera el umbral
    const sign = response.predicted_sign;
    const confidence = response.confidence;

    if (sign && confidence >= confidenceThreshold && sign !== lastSignRef.current) {
      lastSignRef.current = sign;
      setHistory(prev => {
        const nueva: SignEntry = { sign, confidence, timestamp: new Date() };
        return [nueva, ...prev].slice(0, 5); // máximo 5 entradas
      });
    }
  }, [response, confidenceThreshold]);

  useEffect(() => () => {
    stopSendingFrames();
    stopCamera();
    if (noHandTimerRef.current) clearTimeout(noHandTimerRef.current);
  }, []);

  const handleToggle = async () => {
    if (!isCapturing) {
      if (!isActive) await startCamera();
      setIsCapturing(true);
      // startSendingFrames se dispara automáticamente desde el useEffect
      // cuando isCapturing, isConnected y stream estén listos
    } else {
      stopSendingFrames();
      setIsCapturing(false);
    }
  };

  const handsCount = response?.hands_count ?? 0;
  const bufferProgress = response?.buffer_progress ?? 0;

  return (
    <>
      {/* Camera viewport */}
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

        {/* WS Status */}
        <div className="status-badge">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span style={{ color: isConnected ? '#86efac' : '#fca5a5' }}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bottom-panel">

        {/* Controls */}
        <div className="controls-row">
          <button onClick={handleToggle} className={`btn-capture ${isCapturing ? 'stop' : 'start'}`}>
            {isCapturing ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Detener captura
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8"/>
                  <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>
                Iniciar captura
              </>
            )}
          </button>

          {isCapturing && (
            <div className="info-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#10b981">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Transmitiendo <span className="val">5 fps</span>
            </div>
          )}

          {handsCount > 0 && (
            <div className="info-chip">
              {handsCount === 2 ? '🤲' : '🖐'} <span className="val">{handsCount} mano{handsCount > 1 ? 's' : ''}</span> detectada{handsCount > 1 ? 's' : ''}
            </div>
          )}

          {isCapturing && bufferProgress > 0 && bufferProgress < 1 && (
            <div className="info-chip">
              ⏳ Buffer: <span className="val">{Math.round(bufferProgress * 100)}%</span>
            </div>
          )}
        </div>

        {/* Seña detectada */}
        <SignDisplay
          sign={response?.predicted_sign ?? null}
          confidence={response?.confidence ?? 0}
          handDetected={response?.hand_detected ?? false}
          confidenceThreshold={confidenceThreshold}
        />

        {/* Barra de confianza */}
        <ConfidenceBar
          confidence={response?.confidence ?? 0}
          handDetected={response?.hand_detected ?? false}
        />

        {/* Slider de umbral */}
        <div className="threshold-section">
          <div className="threshold-header">
            <span className="threshold-label">Umbral mínimo de confianza</span>
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
            <span>50% (más sensible)</span>
            <span>95% (más estricto)</span>
          </div>
        </div>

        {/* Historial */}
        <SignHistory entries={history} />

      </div>
    </>
  );
};