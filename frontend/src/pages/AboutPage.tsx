import React from 'react';
import { Target, Users, Zap, BrainCircuit } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="page min-h-screen flex flex-col justify-center py-20 px-4 w-full items-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#6366f1] opacity-[0.07] blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] bg-emerald-500 opacity-[0.05] blur-[100px] pointer-events-none rounded-full" />

      <div className="text-center mb-14 relative z-10 pt-4 md:pt-8">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-10 text-xs font-bold tracking-widest text-[#a5b4fc] uppercase bg-[#4f46e5]/10 border border-[#6366f1]/20 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-md">
          <Zap size={14} className="text-[#818cf8]" /> V1.0 Beta
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f3f4f6] to-[#9ca3af] mb-10 tracking-tighter drop-shadow-sm">
          Acerca del Proyecto
        </h1>
        <p className="text-lg md:text-xl text-[#9ca3af] max-w-2xl mx-auto font-light leading-[1.7]">
          Superando barreras de comunicación a través de inteligencia artificial de <span className="text-white font-medium">próxima generación</span>.
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative z-10 px-4 lg:px-0">
        
        {/* Misión Card */}
        <div className="group relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent p-[1px] overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="h-full w-full bg-[#050914]/90 backdrop-blur-3xl rounded-[23px] p-10 border border-white/[0.02]">
            <div className="flex flex-col">
              <div className="flex items-center gap-5 mb-5">
                <div className="p-4 bg-[#6366f1]/15 rounded-[1.25rem] flex-shrink-0 border border-[#6366f1]/20 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]">
                  <Target size={28} className="text-[#818cf8]" strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Nuestra Misión</h2>
              </div>
              <div className="w-full h-[1px] bg-gradient-to-r from-[#6366f1]/40 via-[#6366f1]/10 to-transparent mb-7" />
            </div>
            <p className="text-[#d1d5db] leading-[1.8] text-base mb-8 font-light">
              "Manos que Hablan" nace como un esfuerzo tecnológico y social para crear un puente visual e interactivo entre la comunidad sorda y oyente de habla hispana. 
            </p>
            <div className="flex items-center gap-3 text-sm font-semibold tracking-wide text-[#a5b4fc] bg-[#6366f1]/10 px-4 py-2.5 rounded-xl w-fit">
               <BrainCircuit size={18} className="text-[#818cf8]"/> Impulsado por Redes Neuronales Profundas
            </div>
          </div>
        </div>

        {/* Equipo Card */}
        <div className="group relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent p-[1px] overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(52,211,153,0.1)] hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-bl from-[#34d399]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="h-full w-full bg-[#050914]/90 backdrop-blur-3xl rounded-[23px] p-10 border border-white/[0.02]">
             <div className="flex flex-col">
               <div className="flex items-center gap-5 mb-5">
                 <div className="p-4 bg-[#34d399]/15 rounded-[1.25rem] flex-shrink-0 border border-[#34d399]/20 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]">
                   <Users size={28} className="text-[#34d399]" strokeWidth={2} />
                 </div>
                 <h2 className="text-3xl font-bold text-white tracking-tight">El Equipo</h2>
               </div>
               <div className="w-full h-[1px] bg-gradient-to-r from-[#34d399]/40 via-[#34d399]/10 to-transparent mb-7" />
             </div>
             
             <div className="flex flex-col">
                {['Juan Camilo Neuta', 'Cristian Tafur', 'Santiago Tovar'].map((name, i) => (
                  <div key={name} className="flex flex-col py-4 border-b border-white/10 border-l-[4px] border-[#34d399]/30 pl-6 transition-all hover:border-[#34d399] hover:pl-8 cursor-default relative last:border-b-0">
                    <span className="text-white font-semibold text-lg tracking-wide">{name}</span>
                    <span className="text-xs text-[#9ca3af] uppercase tracking-[0.2em] mt-2 font-bold">Desarrollador Fullstack</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
