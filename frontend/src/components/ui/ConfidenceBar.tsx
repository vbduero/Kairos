// ============================================================
//  ConfidenceBar — Barra de progreso de confianza
//  Verde > 85%, Amarillo > 60%, Rojo < 60%
// ============================================================

import React from 'react';

interface ConfidenceBarProps {
  confidence: number;
  handDetected: boolean;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ confidence, handDetected }) => {
  const porcentaje = Math.round(confidence * 100);

  const getColor = () => {
    if (!handDetected || porcentaje === 0) return '#4b5563';
    if (porcentaje >= 85) return '#10b981'; // verde
    if (porcentaje >= 60) return '#f59e0b'; // amarillo
    return '#ef4444';                        // rojo
  };

  return (
    <div className="confidence-bar-container">
      <div className="confidence-bar-header">
        <span className="confidence-bar-label">Confianza</span>
        <span className="confidence-bar-value" style={{ color: getColor() }}>
          {handDetected ? `${porcentaje}%` : '—'}
        </span>
      </div>
      <div className="confidence-bar-track">
        <div
          className="confidence-bar-fill"
          style={{
            width: handDetected ? `${porcentaje}%` : '0%',
            backgroundColor: getColor(),
            transition: 'width 0.3s ease, background-color 0.3s ease'
          }}
        />
      </div>
    </div>
  );
};