import React from 'react';
import { CameraCapture } from '../components/camera/CameraCapture';

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

    {/* Card */}
    <main className="main-card">
      <CameraCapture />
    </main>

    <footer className="footer">
      © {new Date().getFullYear()} Manos que Hablan — Proyecto académico LSC
    </footer>
  </div>
);

export default TranslatorPage;
