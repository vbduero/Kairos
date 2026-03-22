import React from 'react';

export const LearningPanel: React.FC = () => {
  return (
    <div className="didactic-panel">
      {/* Sign of the Day */}
      <div className="glass-card sign-of-day">
        <h3 className="card-title">✨ Seña del día</h3>
        <div className="sign-visual">👋</div>
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '18px', marginBottom: '4px' }}>"Hola"</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Categoría: Saludos</p>
        </div>
        <button style={{ 
          width: '100%', 
          marginTop: '16px', 
          padding: '10px', 
          borderRadius: '8px', 
          border: 'none', 
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '700',
          cursor: 'pointer'
        }}>
          Aprender más
        </button>
      </div>

      {/* Quick Tips */}
      <div className="glass-card">
        <h3 className="card-title">💡 Tips Pro</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span>•</span> Asegúrate de tener buena iluminación.
          </li>
          <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span>•</span> Mantén las manos dentro del recuadro.
          </li>
          <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span>•</span> Realiza los movimientos con calma.
          </li>
        </ul>
      </div>

      {/* Stats */}
      <div className="glass-card" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '700', textTransform: 'uppercase' }}>Sesión actual</p>
            <p style={{ fontSize: '20px', fontWeight: '800' }}>12 señas</p>
          </div>
          <div style={{ fontSize: '24px' }}>⚡</div>
        </div>
      </div>
    </div>
  );
};
