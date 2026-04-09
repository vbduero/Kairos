import React from 'react';

export const AvatarContainer: React.FC = () => {
  return (
    <>
      {/* Avatar viewport — mirrors the camera-section structure */}
      <div className="avatar-section">
        {/* Phase badge */}
        <div className="avatar-badge">Fase 2B</div>

        {/* Avatar placeholder */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse-dot 3s ease-in-out infinite',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
            fill="none" stroke="rgba(165,180,252,0.6)" strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '0 24px' }}>
          Avatar 3D · Three.js
        </p>
      </div>

      {/* Info panel — mirrors the bottom-panel structure */}
      <div className="bottom-panel">

        {/* Title row */}
        <div className="controls-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            🤖 Avatar LSC
          </span>
          <div className="info-chip">
            En desarrollo
          </div>
        </div>

        {/* Description */}
        <div style={{
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.12)',
          borderRadius: 12,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            El avatar reflejará en tiempo real las señas detectadas, permitiendo aprendizaje
            visual bidireccional entre hablantes y oyentes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Renderizado 3D con Three.js',
              'Animaciones generativas por seña',
              'Sincronización en tiempo real con el clasificador',
            ].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(99,102,241,0.5)', flexShrink: 0 }} />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Current detected sign display */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
            Última seña detectada
          </span>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}>
            Esperando traducción del clasificador...
          </div>
        </div>

      </div>
    </>
  );
};
