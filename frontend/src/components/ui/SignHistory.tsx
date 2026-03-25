// ============================================================
//  SignHistory — Historial de las últimas 5 señas detectadas
// ============================================================

import React, { useEffect, useRef } from 'react';

export interface SignEntry {
  sign: string;
  confidence: number;
  timestamp: Date;
}

interface SignHistoryProps {
  entries: SignEntry[];
}

export const SignHistory: React.FC<SignHistoryProps> = ({ entries }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="sign-history">
      <div className="sign-history-header">
        <span className="sign-history-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Historial
        </span>
        <span className="sign-history-count">{entries.length}/5</span>
      </div>

      <div className="sign-history-list">
        {entries.length === 0 ? (
          <div className="sign-history-empty">
            Las señas detectadas aparecerán aquí…
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={index} className="sign-history-item">
              <span className="sign-history-name">
                {entry.sign.replace('_', ' ').toUpperCase()}
              </span>
              <span className="sign-history-meta">
                {Math.round(entry.confidence * 100)}% · {formatTime(entry.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};