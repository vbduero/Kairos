import React from 'react';

export const AvatarContainer: React.FC = () => {
  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 className="card-title">🤖 Avatar LSC</h3>
      <div style={{ 
        flex: 1, 
        background: 'rgba(0,0,0,0.2)', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px dashed rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Placeholder for 3D Canvas */}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <p style={{ fontSize: '12px' }}>Avatar 3D (Three.js)</p>
          <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6 }}>Esperando traducción...</p>
        </div>

        {/* Status indicator */}
        <div style={{ 
          position: 'absolute', 
          bottom: '12px', 
          right: '12px', 
          padding: '4px 8px', 
          background: 'rgba(0,0,0,0.5)', 
          borderRadius: '4px', 
          fontSize: '9px',
          color: 'var(--accent)'
        }}>
          READY
        </div>
      </div>
      
      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.1)' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          "El avatar reflejará las señas traducidas del texto para aprendizaje mutuo."
        </p>
      </div>
    </div>
  );
};
