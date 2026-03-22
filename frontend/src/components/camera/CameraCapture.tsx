import React, { useEffect, useRef, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useWebSocket } from '../../hooks/useWebSocket';

export const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, keypoints, startSendingFrames, stopSendingFrames } = useWebSocket();
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleToggle = async () => {
    if (!isCapturing) {
      if (!isActive) await startCamera();
      if (videoRef.current) startSendingFrames(videoRef.current);
      setIsCapturing(true);
    } else {
      stopSendingFrames();
      setIsCapturing(false);
    }
  };

  useEffect(() => () => { stopSendingFrames(); stopCamera(); }, []);

  const kpCount = keypoints?.num_keypoints ?? 0;

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

      {/* Controls */}
      <div className="bottom-panel">
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
              Transmitiendo <span className="val">10 fps</span>
            </div>
          )}

          {kpCount > 0 && (
            <div className="info-chip">
              🖐 <span className="val">{kpCount} keypoints</span> detectados
            </div>
          )}
        </div>

        {/* Keypoints */}
        <div className="keypoints-section">
          <div className="keypoints-header">
            <span className="keypoints-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/>
              </svg>
              Keypoints raw
            </span>
            {kpCount > 0 && <span className="kp-count-badge">{kpCount} valores</span>}
          </div>

          <div className="keypoints-box">
            {keypoints ? (
              <pre>{JSON.stringify(keypoints.keypoints, null, 2)}</pre>
            ) : (
              <div className="keypoints-placeholder">
                Inicia la captura y muestra tu mano a la cámara…
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

