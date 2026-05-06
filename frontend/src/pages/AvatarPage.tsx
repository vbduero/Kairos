// ============================================================
//  AvatarPage — Traductor texto → LSC
//  El usuario escribe en español y el avatar 3D reproduce
//  las señas correspondientes animando el esqueleto de manos.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const API = 'http://localhost:8000/api/v1';
const FACTOR_INTERP = 18;                              // 5fps × 18 → ~270 frames a ~17ms ≈ 60fps suave
const MS_POR_FRAME = Math.round(1000 / 60);           // ≈ 17ms — sincronizado con pantalla
const MS_PAUSA = 350;                             // pausa entre señas

interface SignMeta { word: string; available: boolean; }

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


// ── Normaliza texto: minúsculas + quita tildes ───────────────
function normalizar(s: string): string {
  return s.toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u');
}

// ── Tokeniza texto → lista de señas disponibles ─────────────
function tokenizar(texto: string, vocab: Set<string>): { token: string; encontrado: boolean }[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const resultado: { token: string; encontrado: boolean }[] = [];
  let i = 0;
  while (i < palabras.length) {
    if (i + 1 < palabras.length) {
      const bigrama = normalizar(`${palabras[i]} ${palabras[i + 1]}`);
      if (vocab.has(bigrama)) { resultado.push({ token: bigrama, encontrado: true }); i += 2; continue; }
    }
    const palabra = normalizar(palabras[i]);
    if (vocab.has(palabra)) {
      resultado.push({ token: palabra, encontrado: true });
    } else {
      for (const letra of palabra) {
        if (vocab.has(letra)) resultado.push({ token: letra, encontrado: true });
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

// ── Paleta del maniquí ───────────────────────────────────────
const SKIN  = '#d4956a';
const SHIRT = '#3b4e9e';
const HAIR  = '#1a0f05';

// ── Posiciones fijas del cuerpo (nunca cambian entre frames) ─
const HOMBRO_L = new THREE.Vector3(-0.30, 0.12, 0);
const HOMBRO_R = new THREE.Vector3( 0.30, 0.12, 0);
const CABEZA   = new THREE.Vector3(0,  0.82, 0);
const CUELLO_B = new THREE.Vector3(0,  0.40, 0);
const CUELLO_T = new THREE.Vector3(0,  0.58, 0);
const TORSO_C  = new THREE.Vector3(0, -0.05, 0);

// ── Muñeca en world-space (mapeada desde imagen) ─────────────
// Mapeamos solo la muñeca (landmark 0) al espacio mundial.
// El centro de imagen (0.5, 0.5) → (0, 0.12) para alinearse con los hombros.
function mapMuneca(kp: number[], off: number): THREE.Vector3 | null {
  const x = kp[off], y = kp[off + 1];
  if (x === 0 && y === 0) return null;
  return new THREE.Vector3(
    (x - 0.5) * 1.6,           // ±0.8 horizontal
    -(y - 0.5) * 1.6 + 0.12,   // centrado verticalmente con los hombros
    kp[off + 2] * 0.25,
  );
}

// ── Dedos relativos a la muñeca (landmark 0 = origen) ────────
function parsearDedos(kp: number[], off: number): THREE.Vector3[] | null {
  const wx = kp[off], wy = kp[off + 1], wz = kp[off + 2];
  if (wx === 0 && wy === 0) return null;
  return Array.from({ length: 21 }, (_, i) => new THREE.Vector3(
    (kp[off + i * 3]     - wx) * 2.0,
    -(kp[off + i * 3 + 1] - wy) * 2.0,
    (kp[off + i * 3 + 2] - wz) * 0.5,
  ));
}

// ── Cápsula entre dos puntos ─────────────────────────────────
function Capsula({ a, b, r, color }: { a: THREE.Vector3; b: THREE.Vector3; r: number; color: string }) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 0.002) return null;
  const mid = a.clone().lerp(b, 0.5);
  const q   = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return (
    <mesh position={mid} quaternion={q}>
      <capsuleGeometry args={[r, Math.max(0, len - r * 2), 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.68} metalness={0.06} />
    </mesh>
  );
}

// ── Esfera articulación ──────────────────────────────────────
function Articulacion({ pos, r, color }: { pos: THREE.Vector3; r: number; color: string }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[r, 10, 10]} />
      <meshStandardMaterial color={color} roughness={0.68} metalness={0.06} />
    </mesh>
  );
}

// ── Conexiones de una mano ───────────────────────────────────
const MANO_SEGS: [number, number, number][] = [
  [0,1,16],[1,2,15],[2,3,14],[3,4,13],
  [0,5,18],[5,6,15],[6,7,14],[7,8,13],
  [9,10,15],[10,11,14],[11,12,13],
  [13,14,14],[14,15,13],[15,16,12],
  [17,18,13],[18,19,12],[19,20,11],
  [5,9,20],[9,13,20],[13,17,19],[0,17,18],[0,9,18],
];

// ── Mano 3D: recibe dedos ya calculados + posición de muñeca ─
function Mano3D({ dedos, muneca }: { dedos: THREE.Vector3[]; muneca: THREE.Vector3 }) {
  return (
    <group position={muneca}>
      {MANO_SEGS.map(([a, b, g], i) => (
        <Capsula key={i} a={dedos[a]} b={dedos[b]} r={g / 1000} color={SKIN} />
      ))}
      {dedos.map((p, i) => (
        <Articulacion key={i} pos={p} r={i === 0 ? 0.024 : 0.016} color={SKIN} />
      ))}
    </group>
  );
}

// ── Escena 3D — maniquí estable ──────────────────────────────
function EscenaAvatar({ keypoints, orbitRef }: { keypoints: number[]; orbitRef: React.RefObject<any> }) {
  const kp    = keypoints;
  const hasKp = kp.length >= 126;

  // Muñecas en world-space (solo se mueven los brazos/manos)
  const mun1  = useMemo(() => hasKp ? mapMuneca(kp, 0)  : null, [kp]);
  const mun2  = useMemo(() => hasKp ? mapMuneca(kp, 63) : null, [kp]);
  // Dedos relativos a la muñeca (pose de la mano)
  const ded1  = useMemo(() => hasKp ? parsearDedos(kp, 0)  : null, [kp]);
  const ded2  = useMemo(() => hasKp ? parsearDedos(kp, 63) : null, [kp]);

  return (
    <>
      <color attach="background" args={['#07090f']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 5, 3]}  intensity={1.3} color="#fff5e8" />
      <pointLight       position={[-2, 2, 2]}  intensity={0.7} color="#a8c4ff" />
      <pointLight       position={[0, -1, 2]}  intensity={0.3} color="#ffffff" />

      {/* ── Cabeza ── */}
      <mesh position={CABEZA}>
        <sphereGeometry args={[0.175, 24, 24]} />
        <meshStandardMaterial color={SKIN} roughness={0.70} />
      </mesh>
      <mesh position={CABEZA.clone().add(new THREE.Vector3(0, 0.04, 0))}>
        <sphereGeometry args={[0.182, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color={HAIR} roughness={0.95} />
      </mesh>
      {/* Ojos */}
      {([-0.065, 0.065] as number[]).map((ex, i) => (
        <mesh key={i} position={CABEZA.clone().add(new THREE.Vector3(ex, 0.02, 0.165))}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.3} />
        </mesh>
      ))}

      {/* ── Cuello ── */}
      <Capsula a={CUELLO_B} b={CUELLO_T} r={0.054} color={SKIN} />

      {/* ── Torso ── */}
      <mesh position={TORSO_C}>
        <boxGeometry args={[0.54, 0.50, 0.18]} />
        <meshStandardMaterial color={SHIRT} roughness={0.85} />
      </mesh>

      {/* ── Hombros (fijos) ── */}
      <Articulacion pos={HOMBRO_L} r={0.054} color={SHIRT} />
      <Articulacion pos={HOMBRO_R} r={0.054} color={SHIRT} />

      {/* ── Brazos: hombro fijo → muñeca dinámica ── */}
      {mun1 && <Capsula a={HOMBRO_L} b={mun1} r={0.036} color={SKIN} />}
      {mun2 && <Capsula a={HOMBRO_R} b={mun2} r={0.036} color={SKIN} />}

      {/* ── Manos ── */}
      {mun1 && ded1 && <Mano3D dedos={ded1} muneca={mun1} />}
      {mun2 && ded2 && <Mano3D dedos={ded2} muneca={mun2} />}

      <OrbitControls ref={orbitRef} enablePan={false} enableZoom={true}
        minDistance={0.8} maxDistance={5} autoRotate={false} />
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
  const [vocabDisponible, setVocabDisponible] = useState<string[]>([]);
  const cancelRef = useRef(false);
  const orbitRef = useRef<any>(null);

  const vocab = useMemo(() => new Set(vocabDisponible), [vocabDisponible]);

  useEffect(() => {
    fetch(`${API}/signs`)
      .then(r => r.json())
      .then((data: SignMeta[]) => {
        setVocabDisponible(data.filter(s => s.available).map(s => s.word));
      })
      .catch(() => {});
  }, []);

  const zoomIn = () => { if (orbitRef.current) { orbitRef.current.dollyIn(1.3); orbitRef.current.update(); } };
  const zoomOut = () => { if (orbitRef.current) { orbitRef.current.dollyOut(1.3); orbitRef.current.update(); } };

  const traducir = useCallback(async () => {
    if (!texto.trim() || reproduciendo) return;
    const lista = tokenizar(texto, vocab);
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
          const noDisp = tokenizar(texto, vocab).filter(t => !t.encontrado).map(t => t.token);
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
              {vocabDisponible.map(s => (
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
