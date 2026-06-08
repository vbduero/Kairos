import React from 'react';
import { CameraCapture } from '../components/camera/CameraCapture';

const TranslatorPage: React.FC = () => (
  <div className="page" style={{ gap: 0, justifyContent: 'flex-start', paddingTop: 100, minHeight: '100vh', width: '100%', maxWidth: '1440px', margin: '0 auto', paddingLeft: 24, paddingRight: 24 }}>

    {/* Header */}
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif' }} className="text-4xl md:text-6xl font-black text-[#0A1F44] mb-4">
        ¡Hola! 👋 Vamos a aprender señas
      </h1>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '8px 20px', borderRadius: 999,
        background: '#FFFFFF', border: '2px solid #00C9A7',
        fontSize: 16, fontWeight: 800, color: '#005B96',
        boxShadow: '0 8px 24px rgba(0, 201, 167, 0.15)'
      }}>
        <span style={{ fontSize: 20 }}>✨</span>
        Muestra una letra a la cámara
      </span>
    </div>

    {/* Main content */}
    <main style={{ width: '100%' }}>
      <CameraCapture />
    </main>

  </div>
);

export default TranslatorPage;
