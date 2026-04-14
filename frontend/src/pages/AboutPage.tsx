import { Target, Zap, BrainCircuit, Code2, Globe } from 'lucide-react';

const TEAM = [
  {
    name: 'Juan Camilo Neuta',
    role: 'Full Stack Developer',
    bio: 'Arquitectura backend, modelos LSTM y pipeline de datos LSC.',
    initials: 'JN',
    from: '#6366f1',
    to: '#a855f7',
    shadow: 'rgba(99,102,241,0.45)',
  },
  {
    name: 'Cristian Tafur',
    role: 'Full Stack Developer',
    bio: 'Integración MediaPipe, captura de señas y diseño de interfaz.',
    initials: 'CT',
    from: '#10b981',
    to: '#06b6d4',
    shadow: 'rgba(16,185,129,0.45)',
  },
  {
    name: 'Santiago Tovar',
    role: 'Full Stack Developer',
    bio: 'WebSocket en tiempo real, clasificador LSC y optimización frontend.',
    initials: 'ST',
    from: '#f59e0b',
    to: '#ef4444',
    shadow: 'rgba(245,158,11,0.45)',
  },
];

export default function AboutPage() {
  return (
    <div className="page">

      {/* Background orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#6366f1] opacity-[0.06] blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-[-5%] w-[500px] h-[500px] bg-emerald-500 opacity-[0.05] blur-[110px] pointer-events-none rounded-full" />

      {/* ── Header ── */}
      <div className="text-center mb-16 relative z-10 pt-20">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-xs font-bold tracking-widest text-[#a5b4fc] uppercase bg-[#4f46e5]/10 border border-[#6366f1]/20 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.15)] backdrop-blur-md">
          <Zap size={13} className="text-[#818cf8]" /> V1.0 Beta
        </span>
        <h1 className="text-1xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f3f4f6] to-[#9ca3af] mb-6 tracking-tighter">
          Acerca del Proyecto
        </h1>
        <p className="text-lg text-[#9ca3af] max-w-2xl mx-auto font-light leading-relaxed">
          Superando barreras de comunicación a través de inteligencia artificial de{' '}
          <span className="text-white font-medium">próxima generación</span>.
        </p>
      </div>

      {/* ── Misión card ── */}
      <div className="w-full max-w-3xl relative z-10 mb-20">
        <div className="group relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent p-[1px] overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(99,102,241,0.12)] hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="h-full w-full bg-[#050914]/90 backdrop-blur-3xl rounded-[23px] p-10 border border-white/[0.02]">
            <div className="flex items-center gap-5 mb-5">
              <div className="p-4 bg-[#6366f1]/15 rounded-[1.25rem] flex-shrink-0 border border-[#6366f1]/20 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]">
                <Target size={26} className="text-[#818cf8]" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Nuestra Misión</h2>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-[#6366f1]/40 via-[#6366f1]/10 to-transparent mb-7" />
            <p className="text-[#d1d5db] leading-[1.85] text-base mb-8 font-light">
              "Manos que Hablan" nace como un esfuerzo tecnológico y social para crear un puente
              visual e interactivo entre la comunidad sorda y oyente de habla hispana. Usamos redes
              neuronales LSTM entrenadas con datos reales de LSC para traducir señas en tiempo real
              directamente desde la cámara.
            </p>
            <div className="flex items-center gap-3 text-sm font-semibold tracking-wide text-[#a5b4fc] bg-[#6366f1]/10 px-4 py-2.5 rounded-xl w-fit border border-[#6366f1]/15">
              <BrainCircuit size={17} className="text-[#818cf8]" /> Impulsado por Redes Neuronales Profundas (LSTM)
            </div>
          </div>
        </div>
      </div>

      {/* ── Team section ── */}
      <div className="w-full max-w-5xl relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-[0.2em] text-[#6366f1] uppercase mb-3">El equipo</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Somos un equipo de
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a5b4fc] to-[#34d399]">
              desarrolladores apasionados
            </span>
          </h2>
          <p className="text-[#6b7280] max-w-lg mx-auto text-base">
            Estudiantes de ingeniería comprometidos con la accesibilidad y la tecnología de impacto social.
          </p>
        </div>

        {/* Cards with scale effect */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TEAM.map(({ name, role, bio, initials, from, to, shadow }) => (
            <div
              key={name}
              className="group cursor-default"
              style={{ transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div
                className="relative h-full rounded-2xl border border-white/[0.07] bg-[#0b0f1e]/80 backdrop-blur-xl p-8 flex flex-col items-center text-center overflow-hidden"
                style={{
                  boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
                  transition: 'box-shadow 0.35s ease',
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.boxShadow = `0 8px 48px ${shadow}, 0 0 0 1px rgba(255,255,255,0.08)`)
                }
                onMouseLeave={e =>
                  (e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`)
                }
              >
                {/* Glow blob */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 opacity-0 group-hover:opacity-100 blur-3xl pointer-events-none transition-opacity duration-500"
                  style={{ background: `radial-gradient(ellipse, ${from}55, transparent 70%)` }}
                />

                {/* Avatar */}
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-5 relative shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${from}, ${to})`,
                    boxShadow: `0 0 32px ${shadow}`,
                  }}
                >
                  <span className="text-white font-black text-2xl select-none tracking-wide">
                    {initials}
                  </span>
                  {/* Ring */}
                  <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${from}44, ${to}44)`,
                      boxShadow: `0 0 0 4px ${from}33`,
                    }}
                  />
                </div>

                {/* Info */}
                <h3 className="text-white font-bold text-lg tracking-tight mb-1">{name}</h3>
                <p
                  className="text-xs font-bold tracking-[0.15em] uppercase mb-4"
                  style={{ color: from }}
                >
                  {role}
                </p>
                <p className="text-[#6b7280] text-sm leading-relaxed">{bio}</p>

                {/* Social icons placeholder */}
                <div className="flex items-center gap-3 mt-6 opacity-30 group-hover:opacity-70 transition-opacity duration-300">
                  <Code2 size={16} className="text-white" />
                  <Globe size={16} className="text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <p className="relative z-10 mt-20 text-sm text-[#374151] text-center">
        Proyecto Ingenieria de Software II · Ingenieria de Software · 2026 · Fundación Escuela Tecnologica de Neiva "Jesús Oviedo Perez"
      </p>
    </div>
  );
}
