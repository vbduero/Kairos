// ============================================================
//  AvatarPage — Traductor texto → LSC
//  El usuario escribe en español y el avatar 3D reproduce
//  las señas correspondientes animando el esqueleto de manos.
// ============================================================

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Hueso, CONEXIONES } from '../components/avatar/HandSkeleton';

const API = 'http://localhost:8000/api/v1';
const FACTOR_INTERP = 18;                              // 5fps × 18 → ~270 frames a ~17ms ≈ 60fps suave
const MS_POR_FRAME = Math.round(1000 / 60);           // ≈ 17ms — sincronizado con pantalla
const MS_PAUSA = 350;                             // pausa entre señas

// ── Sleep sincronizado con requestAnimationFrame ─────────────
// Más suave que setTimeout porque usa el ciclo de renderizado del browser
const rafSleep = (ms: number): Promise<void> => new Promise(resolve => {
  const start = performance.now();
  function tick(now: number) {
    if (now - start >= ms) resolve();
    else requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});

// ── Vocabulario disponible (coincide con sequences/) ────────
const VOCAB = new Set([
  'hola', 'adios', 'gracias', 'por favor', 'si', 'no', 'ayuda',
  'm', 'n', 'ñ', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
]);

// ── Normaliza texto: minúsculas + quita tildes ───────────────
function normalizar(s: string): string {
  return s.toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u');
}

// ── Tokeniza texto → lista de señas disponibles ─────────────
function tokenizar(texto: string): { token: string; encontrado: boolean }[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const resultado: { token: string; encontrado: boolean }[] = [];
  let i = 0;
  while (i < palabras.length) {
    if (i + 1 < palabras.length) {
      const bigrama = normalizar(`${palabras[i]} ${palabras[i + 1]}`);
      if (VOCAB.has(bigrama)) { resultado.push({ token: bigrama, encontrado: true }); i += 2; continue; }
    }
    const palabra = normalizar(palabras[i]);
    if (VOCAB.has(palabra)) {
      resultado.push({ token: palabra, encontrado: true });
    } else {
      for (const letra of palabra) {
        if (VOCAB.has(letra)) resultado.push({ token: letra, encontrado: true });
        else if (/[a-zñ]/.test(letra)) resultado.push({ token: letra, encontrado: false });
      }
    }
    i++;
  }
  return resultado;
}

// ── Interpolación Catmull-Rom cúbica entre frames ───────────
// Suaviza la trayectoria usando los vecinos como puntos de control,
// eliminando las aceleraciones bruscas de la interpolación lineal.
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function interpolarFrames(frames: number[][]): number[][] {
  const out: number[][] = [];
  const n = frames.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = frames[Math.max(0, i - 1)];
    const p1 = frames[i];
    const p2 = frames[i + 1];
    const p3 = frames[Math.min(n - 1, i + 2)];
    out.push(p1);
    for (let j = 1; j < FACTOR_INTERP; j++) {
      const t = j / FACTOR_INTERP;
      out.push(p1.map((_, k) => catmullRom(p0[k], p1[k], p2[k], p3[k], t)));
    }
  }
  out.push(frames[n - 1]);
  return out;
}

// ── Parsing de mano normalizado relativo a la muñeca ────────
// Centra y orienta la mano de frente independientemente de
// dónde estaba en el encuadre al momento de la grabación.
function parsearManoAvatar(kp: number[], offset: number): THREE.Vector3[] | null {
  const wx = kp[offset];
  const wy = kp[offset + 1];
  if (wx === 0 && wy === 0) return null;  // mano no grabada
  const wz = kp[offset + 2];

  return Array.from({ length: 21 }, (_, i) => new THREE.Vector3(
    (kp[offset + i * 3] - wx) * 3.5,  // relativo a muñeca, escalado
    (kp[offset + i * 3 + 1] - wy) * -3.5,  // relativo a muñeca, y invertido
    (kp[offset + i * 3 + 2] - wz) * 1.0,  // profundidad mínima → mano de frente
  ));
}

// ── Componente de una mano (usa puntos pre-calculados) ───────
function ManoAvatar({ kp, offset, colorJoint, colorBone }: {
  kp: number[]; offset: number; colorJoint: string; colorBone: string;
}) {
  const puntos = useMemo(() => parsearManoAvatar(kp, offset), [kp, offset]);
  if (!puntos) return null;
  return (
    <group position={[0, -0.25, 0]}>
      {puntos.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[i === 0 ? 0.04 : 0.025, 10, 10]} />
          <meshStandardMaterial color={colorJoint} emissive={colorJoint} emissiveIntensity={0.25} roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
      {CONEXIONES.map(([a, b], i) => (
        <Hueso key={i} a={puntos[a]} b={puntos[b]} color={colorBone} />
      ))}
    </group>
  );
}

// ── Escena 3D ────────────────────────────────────────────────
function EscenaAvatar({ keypoints, orbitRef }: { keypoints: number[]; orbitRef: React.RefObject<any> }) {
  const hayMano = keypoints.length >= 126;  // acepta 126 (legacy) y 168 (nuevo)
  return (
    <>
      <color attach="background" args={['#07090f']} />
      <ambientLight intensity={0.4} />
      <pointLight position={[1.5, 2, 2]} intensity={1.2} color="#a5b4fc" />
      <pointLight position={[-2, -1, 1]} intensity={0.5} color="#6ee7b7" />
      {hayMano && (
        <>
          <ManoAvatar kp={keypoints} offset={0} colorJoint="#818cf8" colorBone="#4f46e5" />
          <ManoAvatar kp={keypoints} offset={63} colorJoint="#34d399" colorBone="#059669" />
        </>
      )}
      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        enableZoom={true}
        minDistance={0.8}
        maxDistance={4}
        autoRotate={false}
      />
    </>
  );
}

// ── Chip de seña en la cola ──────────────────────────────────
function ChipSena({ token, estado }: {
  token: string;
  estado: 'pendiente' | 'activo' | 'hecho' | 'no_disponible';
}) {
  const estilos: Record<string, React.CSSProperties> = {
    pendiente: { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
    activo: { background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.5)' },
    hecho: { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' },
    no_disponible: { background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
  };
  const iconos = { pendiente: '○', activo: '▶', hecho: '✔', no_disponible: '✕' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20, fontSize: 12,
      fontWeight: estado === 'activo' ? 700 : 500,
      transition: 'all 0.2s', ...estilos[estado],
    }}>
      <span style={{ fontSize: 10 }}>{iconos[estado]}</span>
      {token.toUpperCase()}
    </span>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function AvatarPage() {
  const [texto, setTexto] = useState('');
  const [keypoints, setKeypoints] = useState<number[]>([]);
  const [tokens, setTokens] = useState<{ token: string; encontrado: boolean }[]>([]);
  const [indiceActivo, setIndiceActivo] = useState<number | null>(null);
  const [hechos, setHechos] = useState<Set<number>>(new Set());
  const [reproduciendo, setReproduciendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const orbitRef = useRef<any>(null);

  const zoomIn = () => { if (orbitRef.current) { orbitRef.current.dollyIn(1.3); orbitRef.current.update(); } };
  const zoomOut = () => { if (orbitRef.current) { orbitRef.current.dollyOut(1.3); orbitRef.current.update(); } };

  const traducir = useCallback(async () => {
    if (!texto.trim() || reproduciendo) return;
    const lista = tokenizar(texto);
    if (lista.length === 0) return;

    setTokens(lista);
    setHechos(new Set());
    setIndiceActivo(null);
    setKeypoints([]);
    setError(null);
    setReproduciendo(true);
    cancelRef.current = false;

    for (let i = 0; i < lista.length; i++) {
      if (cancelRef.current) break;
      const { token, encontrado } = lista[i];
      setIndiceActivo(i);

      if (!encontrado) { await rafSleep(300); setHechos(prev => new Set(prev).add(i)); continue; }

      try {
        const res = await fetch(`${API}/signs/${encodeURIComponent(token)}/sequence`);
        if (!res.ok) throw new Error(`Sin secuencia para "${token}"`);
        const data: { frames: number[][] } = await res.json();

        // Interpolar de 5fps → 30fps para animación fluida
        const frames = interpolarFrames(data.frames);

        for (const frame of frames) {
          if (cancelRef.current) break;
          setKeypoints(frame);
          await rafSleep(MS_POR_FRAME);
        }
      } catch (e: any) { setError(e.message); }

      if (cancelRef.current) break;
      setHechos(prev => new Set(prev).add(i));
      setKeypoints([]);
      await rafSleep(MS_PAUSA);
    }

    setIndiceActivo(null);
    setReproduciendo(false);
  }, [texto, reproduciendo]);

  const detener = () => {
    cancelRef.current = true;
    setReproduciendo(false);
    setKeypoints([]);
    setIndiceActivo(null);
  };

  return (
    <div className="page" style={{ paddingTop: 100, gap: 5, justifyContent: 'flex-start' }}>

      {/* Subtítulo compacto */}
      <div style={{ textAlign: 'center', marginBottom: 24, pointerEvents: 'none', marginTop: 65 }}>
        <h1 className="text-1xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f3f4f6] to-[#9ca3af] mb-6 tracking-tighter">
          Avatar LSC · Texto a Seña
        </h1>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 14px', borderRadius: 999,
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
          fontSize: 12, fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.4px',
        }}>

          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
          Avatar LSC · Texto a Seña
        </span>
      </div>

      {/* Input */}
      <div style={{ width: '100%', maxWidth: 860, margin: '0 auto 24px', padding: '0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={texto}
            onChange={e => { setTexto(e.target.value); setTokens([]); setHechos(new Set()); }}
            onKeyDown={e => e.key === 'Enter' && !reproduciendo && traducir()}
            placeholder="Escribe aquí... (ej: hola gracias, o letras: n o p q)"
            disabled={reproduciendo}
            style={{
              flex: 1, padding: '12px 18px', borderRadius: 12, fontSize: 15,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
          {reproduciendo ? (
            <button onClick={detener} className="btn-capture stop" style={{ whiteSpace: 'nowrap' }}>⏹ Detener</button>
          ) : (
            <button onClick={traducir} disabled={!texto.trim()} className="btn-capture start"
              style={{ whiteSpace: 'nowrap', opacity: !texto.trim() ? 0.5 : 1 }}>
              ▶ Traducir
            </button>
          )}
        </div>
        {texto.trim() && (() => {
          const noDisp = tokenizar(texto).filter(t => !t.encontrado).map(t => t.token);
          return noDisp.length ? (
            <p style={{ fontSize: 12, color: '#f87171', marginTop: 8, paddingLeft: 4 }}>
              Sin seña disponible para: {noDisp.map(t => `"${t}"`).join(', ')}
            </p>
          ) : null;
        })()}
      </div>

      {/* Grid */}
      <main className="translator-grid" style={{ alignItems: 'start' }}>

        {/* Canvas 3D */}
        <div className="main-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: 460 }}>
            <Canvas camera={{ position: [0, 0, 2], fov: 50 }} gl={{ antialias: true }}>
              <EscenaAvatar keypoints={keypoints} orbitRef={orbitRef} />
            </Canvas>
          </div>

          {/* Botones de zoom */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {[{ label: '+', fn: zoomIn }, { label: '−', fn: zoomOut }].map(({ label, fn }) => (
              <button key={label} onClick={fn} style={{
                width: 30, height: 30, borderRadius: 8, fontSize: 16, fontWeight: 700,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer', lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{label}</button>
            ))}
          </div>

          {/* Label de seña activa */}
          {indiceActivo !== null && tokens[indiceActivo]?.encontrado && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(99,102,241,0.85)', backdropFilter: 'blur(8px)',
              padding: '6px 22px', borderRadius: 20,
              fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 2, textTransform: 'uppercase',
            }}>
              {tokens[indiceActivo].token}
            </div>
          )}

          {!reproduciendo && keypoints.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 10, pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 48 }}>🤟</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Escribe algo y presiona Traducir
              </span>
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="main-card" style={{ display: 'flex', flexDirection: 'column', gap: 30, padding: 20, maxHeight: 460, overflowY: 'auto' }}>

          {/* Cola */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: 15, marginTop: 20 }}>
              Cola de señas
            </p>
            {tokens.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Escribe un texto para ver las señas aquí.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tokens.map((t, i) => (
                  <ChipSena key={i} token={t.token} estado={
                    !t.encontrado ? 'no_disponible'
                      : hechos.has(i) ? 'hecho'
                        : i === indiceActivo ? 'activo'
                          : 'pendiente'
                  } />
                ))}
              </div>
            )}
            {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>⚠ {error}</p>}
          </div>

          {/* Vocabulario */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Vocabulario disponible
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[...VOCAB].map(s => (
                <button key={s} disabled={reproduciendo}
                  onClick={() => setTexto(prev => prev ? `${prev} ${s}` : s)}
                  style={{
                    padding: '3px 10px', borderRadius: 14, fontSize: 12,
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    color: '#a5b4fc', cursor: reproduciendo ? 'default' : 'pointer',
                  }}>
                  {s}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
              Haz clic en una seña para agregarla al texto. · {FACTOR_INTERP}× interpolación · {MS_POR_FRAME}ms/frame
            </p>
          </div>

        </div>
      </main>

    </div>
  );
}
