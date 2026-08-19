import React from 'react';

export const Sidebar: React.FC = () => {
  const menuItems = [
    { icon: '🏠', label: 'Dashboard', active: true },
    { icon: '📖', label: 'Diccionario', active: false },
    { icon: '🎓', label: 'Lecciones', active: false },
    { icon: '📈', label: 'Progreso', active: false },
    { icon: '⚙️', label: 'Configuración', active: false },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-section" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <img src="/logo.png" alt="Kairós Logo" style={{ maxWidth: '140px', height: 'auto', objectFit: 'contain' }} />
      </div>

      <nav className="nav-menu">
        {menuItems.map((item, index) => (
          <div key={index} className={`nav-item ${item.active ? 'active' : ''}`}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="level-badge">Nivel 5</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pro LSC</span>
        </div>
        <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '65%', background: 'var(--accent)' }} />
        </div>
      </div>
    </aside>
  );
};
