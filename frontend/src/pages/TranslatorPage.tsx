import React from 'react';
import { CameraCapture } from '../components/camera/CameraCapture';
import { AvatarContainer } from '../components/avatar/AvatarContainer';

const TranslatorPage: React.FC = () => (
  <div className="page">
    {/* Header */}
    <header className="header">
      <div className="header-badge">
        <div className="dot" />
        Beta · Fase 1
      </div>
      <h1>🤟 Manos que Hablan</h1>
      <p>Traductor en tiempo real de Lengua de Señas Colombiana · LSC</p>
    </header>

    {/* Two-column layout: camera left, avatar right */}
    <main className="translator-grid">
      <div className="main-card">
        <CameraCapture />
      </div>
      <div className="main-card">
        <AvatarContainer />
      </div>
    </main>

    <footer className="footer">
      © {new Date().getFullYear()} Manos que Hablan — Proyecto académico LSC
    </footer>
  </div>
);

export default TranslatorPage;
