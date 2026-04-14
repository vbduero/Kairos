// ============================================================
//  AvatarContainer — Esqueleto 3D de manos en tiempo real
//  Detecta si hay 1 o 2 manos y ajusta el layout:
//    · 1 mano  → centrada en la escena
//    · 2 manos → separadas horizontalmente (-0.5 / +0.5)
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslatorStore } from '../../store/translatorStore';
import { Mano } from './HandSkeleton';

// Tiempo que el skeleton sigue visible tras perder brevemente la detección.
// Evita el parpadeo cuando MediaPipe no detecta 1-2 frames (manos en ángulos difíciles).
const DEBOUNCE_MS = 450;

// ── Animación idle ───────────────────────────────────────────
function AnilloIdle() {
  const ref  = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.x = Math.sin(t * 0.4) * 0.4;
      ref.current.rotation.y = t * 0.35;
      const s = 1 + Math.sin(t * 1.5) * 0.04;
      ref.current.scale.setScalar(s);
    }
    if (ref2.current) {
      ref2.current.rotation.x = -t * 0.25;
      ref2.current.rotation.z = t * 0.2;
    }
  });

  return (
    <group>
      <mesh ref={ref}>
        <torusGeometry args={[0.38, 0.035, 16, 80]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.6} roughness={0.2} />
      </mesh>
      <mesh ref={ref2}>
        <torusGeometry args={[0.22, 0.018, 12, 60]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ── Panel inferior ───────────────────────────────────────────
function PanelSena({ predictedSign, confidence, handDetected, handsCount }: {
  predictedSign: string | null;
  confidence: number;
  handDetected: boolean;
  handsCount: number;
}) {
  return (
    <div className="bottom-panel">
      <div className="controls-row" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
          🤖 Avatar LSC
        </span>
        <div className="info-chip" style={handDetected ? {
          background: 'rgba(16,185,129,0.12)',
          color: '#34d399',
          border: '1px solid rgba(52,211,153,0.25)',
        } : undefined}>
          {handDetected
            ? `${handsCount} mano${handsCount !== 1 ? 's' : ''} detectada${handsCount !== 1 ? 's' : ''}`
            : 'En espera'}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
          Última seña detectada
        </span>
        {predictedSign ? (
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.28)',
            borderRadius: 10, padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 2 }}>
              {predictedSign}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(99,102,241,0.12)', padding: '3px 8px', borderRadius: 6 }}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic',
          }}>
            Esperando traducción del clasificador...
          </div>
        )}
      </div>
    </div>
  );
}

// ── Controlador de cámara dinámica ───────────────────────────
function CamaraDinamica({ ambasManos }: { ambasManos: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    const z   = ambasManos ? 2.8 : 2.2;
    const fov = ambasManos ? 58  : 48;
    camera.position.z = z;
    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [ambasManos, camera]);
  return null;
}

// ── Escena 3D ────────────────────────────────────────────────
function EscenaAvatar({ keypoints, handDetected }: {
  keypoints: number[];
  handDetected: boolean;
}) {
  // Detectar qué manos están activas (wrist ≠ 0,0)
  const mano1Activa = keypoints.length >= 126 &&
    (Math.abs(keypoints[0]) > 1e-6 || Math.abs(keypoints[1]) > 1e-6);
  const mano2Activa = keypoints.length >= 126 &&
    (Math.abs(keypoints[63]) > 1e-6 || Math.abs(keypoints[64]) > 1e-6);
  const ambasManos = mano1Activa && mano2Activa;

  // Con 2 manos: separar horizontalmente para que no se superpongan
  const x1: number = ambasManos ? -0.48 : 0;
  const x2: number = ambasManos ?  0.48 : 0;
  const y:  number = -0.15;

  const haySkeleton = handDetected && (mano1Activa || mano2Activa);

  return (
    <>
      <CamaraDinamica ambasManos={ambasManos} />
      <color attach="background" args={['#07090f']} />
      <ambientLight intensity={0.35} />
      <pointLight position={[1.5, 2, 2]}  intensity={1.2} color="#a5b4fc" />
      <pointLight position={[-2, -1, 1]} intensity={0.5} color="#6ee7b7" />

      {haySkeleton ? (
        <>
          <Mano
            keypoints={keypoints}
            offset={0}
            colorJoint="#818cf8"
            colorBone="#4f46e5"
            posicion={[x1, y, 0]}
          />
          <Mano
            keypoints={keypoints}
            offset={63}
            colorJoint="#34d399"
            colorBone="#059669"
            posicion={[x2, y, 0]}
          />
        </>
      ) : (
        <AnilloIdle />
      )}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={!handDetected}
        autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
      />
    </>
  );
}

// ── Componente principal ─────────────────────────────────────
export const AvatarContainer: React.FC = () => {
  const { keypoints, handDetected, handsCount, predictedSign, confidence } =
    useTranslatorStore();

  // ── Debounce de detección ─────────────────────────────────────
  // Cuando la mano desaparece brevemente (ej. mano horizontal que MediaPipe
  // pierde 1-2 frames), conservamos el último skeleton visible DEBOUNCE_MS ms
  // antes de pasar al modo idle. Evita el parpadeo.
  const [stableDetected, setStableDetected] = useState(false);
  const [stableKp, setStableKp]             = useState<number[]>([]);
  const [stableCount, setStableCount]       = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (handDetected && keypoints.length >= 126) {
      // Mano presente: cancelar timer y actualizar estado estable
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      setStableDetected(true);
      setStableKp(keypoints);
      setStableCount(handsCount);
    } else {
      // Mano ausente: esperar DEBOUNCE_MS antes de cambiar a idle
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setStableDetected(false);
          setStableKp([]);
          setStableCount(0);
          timerRef.current = null;
        }, DEBOUNCE_MS);
      }
    }
    return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [handDetected, keypoints, handsCount]);

  const ambasManos = stableCount === 2;

  return (
    <>
      {/* Viewport 3D */}
      <div className="avatar-section" style={{ position: 'relative', overflow: 'hidden' }}>
        <Canvas
          camera={{ position: [0, 0, 2.2], fov: 48 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true }}
        >
          <EscenaAvatar keypoints={stableKp} handDetected={stableDetected} />
        </Canvas>

        {/* Badge */}
        <div
          className="avatar-badge"
          style={stableDetected ? {
            background: 'rgba(16,185,129,0.15)',
            color: '#6ee7b7',
            border: '1px solid rgba(52,211,153,0.3)',
          } : undefined}
        >
          {stableDetected
            ? `🖐 ${stableCount} mano${stableCount !== 1 ? 's' : ''}`
            : '3D · LSC'}
        </div>
      </div>

      {/* Panel inferior */}
      <PanelSena
        predictedSign={predictedSign}
        confidence={confidence}
        handDetected={stableDetected}
        handsCount={stableCount}
      />
    </>
  );
};
