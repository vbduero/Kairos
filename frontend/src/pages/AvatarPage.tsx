import React from 'react';

export default function AvatarPage() {
  return (
    <div className="page pt-24">
      <div className="header">
        <span className="header-badge">
          <span className="dot"></span> Próximamente
        </span>
        <h1>Traductor a Lengua de Señas</h1>
        <p>Escribe en español y nuestro Avatar 3D lo interpretará en tiempo real.</p>
      </div>
      <div className="main-card flex flex-col items-center justify-center min-h-[400px] p-8 text-center text-gray-400">
        <div className="w-24 h-24 mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Módulo en Desarrollo (Fase 2B)</h2>
        <p className="max-w-md">La integración de Three.js para el renderizado del avatar y las animaciones 3D generativas está programada para la próxima etapa del proyecto.</p>
      </div>
    </div>
  );
}
