import React from 'react';
import { CameraCapture } from '../components/camera/CameraCapture';

const TranslatorPage: React.FC = () => (
  <div className="page" style={{ gap: 0, justifyContent: 'flex-start', paddingTop: 170 }}>

    {/* Subtítulo compacto */}
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <h1 className="text-1xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f3f4f6] to-[#9ca3af] mb-6 tracking-tighter">
        Traductor LSC · Seña a Texto
      </h1>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 14px', borderRadius: 999,
        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
        fontSize: 12, fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.4px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
        Captura de manos en tiempo real - LSC
      </span>
    </div>

    {/* Tarjeta principal */}
    <main className="translator-single">
      <div className="main-card">
        <CameraCapture />
      </div>
    </main>

  </div>
);

export default TranslatorPage;
