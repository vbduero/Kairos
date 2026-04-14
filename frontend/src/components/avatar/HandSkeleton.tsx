// ============================================================
//  HandSkeleton — componentes 3D reutilizables para el
//  esqueleto de manos MediaPipe.
//  Usado en: AvatarContainer (live) y AvatarPage (animado).
// ============================================================

import { useMemo } from 'react';
import * as THREE from 'three';

// Conexiones estándar MediaPipe (21 landmarks por mano)
// 0=WRIST, 1-4=THUMB, 5-8=INDEX, 9-12=MIDDLE, 13-16=RING, 17-20=PINKY
export const CONEXIONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

/**
 * Convierte 21 landmarks de una mano a Vector3[] con coordenadas
 * relativas a la muñeca (landmark 0).
 *
 * - Devuelve null si la mano está vacía (wrist ≈ 0,0 → no detectada).
 * - El wrist queda en el origen; los dedos se extienden alrededor.
 * - z × 1.0: profundidad mínima para que la mano aparezca de frente.
 */
export function parsearMano(
  keypoints: number[],
  offset: number,
): THREE.Vector3[] | null {
  const wx = keypoints[offset];
  const wy = keypoints[offset + 1];

  // Mano no presente: todos los valores son 0.0
  if (Math.abs(wx) < 1e-6 && Math.abs(wy) < 1e-6) return null;

  const wz = keypoints[offset + 2];

  return Array.from({ length: 21 }, (_, i) => new THREE.Vector3(
    (keypoints[offset + i * 3]     - wx) *  3.5,
    (keypoints[offset + i * 3 + 1] - wy) * -3.5,
    (keypoints[offset + i * 3 + 2] - wz) *  1.0,
  ));
}

// ── Hueso: cilindro entre dos joints ────────────────────────
export function Hueso({ a, b, color }: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  color: string;
}) {
  const mid  = useMemo(() => a.clone().add(b).multiplyScalar(0.5), [a, b]);
  const len  = useMemo(() => a.distanceTo(b), [a, b]);
  const quat = useMemo(() => {
    const dir = b.clone().sub(a).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), dir,
    );
  }, [a, b]);

  if (len < 1e-4) return null;

  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.012, 0.012, len, 6]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

// ── Mano completa: 21 joints + huesos ───────────────────────
export function Mano({ keypoints, offset, colorJoint, colorBone, posicion = [0, 0, 0] }: {
  keypoints: number[];
  offset: number;
  colorJoint: string;
  colorBone: string;
  /** Posición del grupo en la escena (útil para separar 2 manos). */
  posicion?: [number, number, number];
}) {
  const puntos = useMemo(
    () => parsearMano(keypoints, offset),
    [keypoints, offset],
  );

  // parsearMano devuelve null si la mano está vacía → no renderizar
  if (!puntos) return null;

  return (
    <group position={posicion}>
      {puntos.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[i === 0 ? 0.04 : 0.025, 10, 10]} />
          <meshStandardMaterial
            color={colorJoint}
            emissive={colorJoint}
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
      ))}
      {CONEXIONES.map(([ia, ib], i) => (
        <Hueso key={i} a={puntos[ia]} b={puntos[ib]} color={colorBone} />
      ))}
    </group>
  );
}
