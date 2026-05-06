import { useEffect, useState } from 'react';
import { Target, Zap, BrainCircuit, Code2, Globe } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';

const TEAM = [
  {
    name: 'Juan Camilo Neuta',
    role: 'Full Stack Developer',
    bio: 'Arquitectura backend, modelos LSTM y pipeline de datos LSC.',
    initials: 'JN',
    from: '#6366f1', to: '#a855f7', shadow: 'rgba(99,102,241,0.45)',
  },
  {
    name: 'Cristian Tafur',
    role: 'Full Stack Developer',
    bio: 'Integración MediaPipe, captura de señas y diseño de interfaz.',
    initials: 'CT',
    from: '#10b981', to: '#06b6d4', shadow: 'rgba(16,185,129,0.45)',
  },
  {
    name: 'Santiago Tovar',
    role: 'Full Stack Developer',
    bio: 'WebSocket en tiempo real, clasificador LSC y optimización frontend.',
    initials: 'ST',
    from: '#f59e0b', to: '#ef4444', shadow: 'rgba(245,158,11,0.45)',
  },
];

// ── Pipeline de detección (8 pasos) ─────────────────────────
const PIPELINE = [
  { label: 'Cámara',        detail: '20 fps',       color: '#6366f1', icon: '📷' },
  { label: 'Canvas JPEG',   detail: '640 × 480',    color: '#8b5cf6', icon: '🖼' },
  { label: 'WebSocket',     detail: 'blob directo', color: '#a855f7', icon: '⚡' },
  { label: 'MediaPipe',     detail: '168 kp/frame', color: '#06b6d4', icon: '🤲' },
  { label: 'Normalización', detail: '174 features', color: '#10b981', icon: '📐' },
  { label: 'Buffer',        detail: '5 frames',     color: '#34d399', icon: '📦' },
  { label: 'BiLSTM',        detail: 'votación 2/2', color: '#fbbf24', icon: '🧠' },
  { label: 'Resultado',     detail: '~500 ms total',color: '#f97316', icon: '✓'  },
];

// ── Stack tecnológico ────────────────────────────────────────
const STACK = [
  {
    title: 'Frontend',
    color: '#6366f1',
    items: [
      { name: 'React 18',           detail: 'UI framework'        },
      { name: 'TypeScript',         detail: 'tipado estático'     },
      { name: 'Three.js',           detail: 'avatar 3D'           },
      { name: 'Zustand',            detail: 'estado global'       },
      { name: 'Vite',               detail: 'build tool'          },
      { name: 'TailwindCSS',        detail: 'estilos'             },
    ],
  },
  {
    title: 'Backend',
    color: '#06b6d4',
    items: [
      { name: 'FastAPI',            detail: 'REST + WebSocket'    },
      { name: 'MediaPipe Holistic', detail: '168 kp por frame'    },
      { name: 'OpenCV',             detail: 'procesamiento imagen'},
      { name: 'Uvicorn',            detail: 'servidor ASGI'       },
    ],
  },
  {
    title: 'IA / ML',
    color: '#10b981',
    items: [
      { name: 'TensorFlow 2.17',    detail: 'entrenamiento LSTM'  },
      { name: 'BiLSTM',             detail: 'arquitectura modelo' },
      { name: 'NumPy',              detail: 'augmentación + kp'   },
      { name: 'h5py',               detail: 'fallback sin TF'     },
    ],
  },
];

export default function AboutPage() {
  const [vocabCount, setVocabCount] = useState<number | null>(null);

  // Número real de señas disponibles en el backend
  useEffect(() => {
    fetch(`${API}/signs`)
      .then(r => r.json())
      .then((data: { available: boolean }[]) => {
        setVocabCount(data.filter(s => s.available).length);
      })
      .catch(() => setVocabCount(17));
  }, []);

  const STATS = [
    { value: '100%',                       label: 'Precisión en test', sub: 'dataset 80/20',        color: '#34d399' },
    { value: String(vocabCount ?? '—'),    label: 'Señas disponibles', sub: 'vocabulario activo',   color: '#a5b4fc' },
    { value: '~500ms',                     label: 'Latencia total',    sub: 'buffer + inferencia',  color: '#fbbf24' },
    { value: '174',                        label: 'Features / frame',  sub: 'kp + zona espacial',   color: '#f97316' },
  ];

  return (
    <div className="page" style={{ paddingTop: 100 }}>

      {/* Background orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#6366f1] opacity-[0.06] blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-[-5%] w-[500px] h-[500px] bg-emerald-500 opacity-[0.05] blur-[110px] pointer-events-none rounded-full" />

      {/* ── Header ── */}
      <div className="text-center mb-14 relative z-10 pt-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-xs font-bold tracking-widest text-[#a5b4fc] uppercase bg-[#4f46e5]/10 border border-[#6366f1]/20 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.15)] backdrop-blur-md">
          <Zap size={13} className="text-[#818cf8]" /> Beta v1.0
        </span>
        <h1 className="text-1xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f3f4f6] to-[#9ca3af] mb-5 tracking-tighter">
          Manos que Hablan
        </h1>
        <p className="text-lg text-[#9ca3af] max-w-2xl mx-auto font-light leading-relaxed">
          Traductor bidireccional de{' '}
          <span className="text-white font-medium">Lenguaje de Señas Colombiano</span>
          {' '}en tiempo real — solo necesitas una webcam.
        </p>
      </div>

      {/* ── Stats del modelo ── */}
      <div className="w-full max-w-4xl relative z-10 mb-16">
        <p className="text-xs font-bold tracking-[0.2em] text-[#6366f1] uppercase mb-6 text-center">
          Métricas del modelo
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {STATS.map(({ value, label, sub, color }) => (
            <div key={label} style={{
              padding: '24px 20px', borderRadius: 16, textAlign: 'center',
              background: 'rgba(17,24,39,0.75)', border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.borderColor = color + '44';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px', lineHeight: 1, marginBottom: 8 }}>
                {value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pipeline de detección ── */}
      <div className="w-full max-w-5xl relative z-10 mb-16">
        <p className="text-xs font-bold tracking-[0.2em] text-[#06b6d4] uppercase mb-6 text-center">
          Pipeline de detección — Seña → Texto
        </p>
        <div style={{
          background: 'rgba(17,24,39,0.75)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, padding: '28px 24px', backdropFilter: 'blur(12px)',
          overflowX: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 700 }}>
            {PIPELINE.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE.length - 1 ? '1 1 0' : 'unset' }}>
                {/* Step box */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '14px 10px', borderRadius: 12, minWidth: 88, flexShrink: 0,
                  background: step.color + '12', border: `1px solid ${step.color}33`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${step.color}22`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: 20 }}>{step.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: step.color, textAlign: 'center', lineHeight: 1.2 }}>{step.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{step.detail}</span>
                </div>
                {/* Arrow */}
                {i < PIPELINE.length - 1 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
                    <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${step.color}50, ${PIPELINE[i+1].color}50)` }}/>
                    <svg width="8" height="10" viewBox="0 0 8 10" style={{ flexShrink: 0 }}>
                      <path d="M0 0 L8 5 L0 10 Z" fill={PIPELINE[i+1].color + '80'}/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stack tecnológico ── */}
      <div className="w-full max-w-4xl relative z-10 mb-16">
        <p className="text-xs font-bold tracking-[0.2em] text-[#10b981] uppercase mb-6 text-center">
          Stack tecnológico
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {STACK.map(({ title, color, items }) => (
            <div key={title} style={{
              padding: '20px', borderRadius: 16,
              background: 'rgba(17,24,39,0.75)', border: `1px solid ${color}22`,
              backdropFilter: 'blur(12px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(({ name, detail }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>{name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Misión card ── */}
      <div className="w-full max-w-3xl relative z-10 mb-16">
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
              <BrainCircuit size={17} className="text-[#818cf8]" /> Impulsado por Redes Neuronales Profundas (BiLSTM)
            </div>
          </div>
        </div>
      </div>

      {/* ── Team ── */}
      <div className="w-full max-w-5xl relative z-10">
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-[0.2em] text-[#6366f1] uppercase mb-3">El equipo</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Somos un equipo de<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a5b4fc] to-[#34d399]">
              desarrolladores apasionados
            </span>
          </h2>
          <p className="text-[#6b7280] max-w-lg mx-auto text-base">
            Estudiantes de ingeniería comprometidos con la accesibilidad y la tecnología de impacto social.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TEAM.map(({ name, role, bio, initials, from, to, shadow }) => (
            <div key={name} className="group cursor-default"
              style={{ transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div className="relative h-full rounded-2xl border border-white/[0.07] bg-[#0b0f1e]/80 backdrop-blur-xl p-8 flex flex-col items-center text-center overflow-hidden"
                style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`, transition: 'box-shadow 0.35s ease' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 48px ${shadow}, 0 0 0 1px rgba(255,255,255,0.08)`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`)}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 opacity-0 group-hover:opacity-100 blur-3xl pointer-events-none transition-opacity duration-500"
                  style={{ background: `radial-gradient(ellipse, ${from}55, transparent 70%)` }} />
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5 relative shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 0 32px ${shadow}` }}>
                  <span className="text-white font-black text-2xl select-none tracking-wide">{initials}</span>
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${from}44, ${to}44)`, boxShadow: `0 0 0 4px ${from}33` }} />
                </div>
                <h3 className="text-white font-bold text-lg tracking-tight mb-1">{name}</h3>
                <p className="text-xs font-bold tracking-[0.15em] uppercase mb-4" style={{ color: from }}>{role}</p>
                <p className="text-[#6b7280] text-sm leading-relaxed">{bio}</p>
                <div className="flex items-center gap-3 mt-6 opacity-30 group-hover:opacity-70 transition-opacity duration-300">
                  <Code2 size={16} className="text-white" />
                  <Globe size={16} className="text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <p className="relative z-10 mt-20 text-sm text-[#374151] text-center">
        Proyecto Ingeniería de Software II · Ingeniería de Software · 2026 · Fundación Escuela Tecnológica de Neiva "Jesús Oviedo Pérez"
      </p>
    </div>
  );
}
