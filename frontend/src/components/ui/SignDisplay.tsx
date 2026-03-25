// ============================================================
//  SignDisplay — Muestra la seña detectada en grande
// ============================================================

import React from 'react';

interface SignDisplayProps {
  sign: string | null;
  confidence: number;
  handDetected: boolean;
  confidenceThreshold: number;
}

export const SignDisplay: React.FC<SignDisplayProps> = ({
  sign,
  confidence,
  handDetected,
  confidenceThreshold
}) => {

  const getEstado = () => {
    if (!handDetected) return { mensaje: 'Sin mano detectada', clase: 'sign-waiting' };
    if (!sign || confidence < confidenceThreshold) return { mensaje: 'Seña no reconocida', clase: 'sign-unrecognized' };
    return { mensaje: sign.replace('_', ' ').toUpperCase(), clase: 'sign-detected' };
  };

  const { mensaje, clase } = getEstado();

  return (
    <div className={`sign-display ${clase}`}>
      {clase === 'sign-detected' ? (
        <>
          <span className="sign-label">Seña detectada</span>
          <span className="sign-name">{mensaje}</span>
          <span className="sign-confidence">{(confidence * 100).toFixed(1)}% confianza</span>
        </>
      ) : (
        <>
          <span className="sign-icon">{!handDetected ? '🤚' : '🔍'}</span>
          <span className="sign-waiting-text">{mensaje}</span>
        </>
      )}
    </div>
  );
};