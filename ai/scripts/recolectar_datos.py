# ============================================================
#  Recolección de Datos LSC — Secuencias de 2 manos
#  Captura secuencias de 15 frames (3 seg) con 2 manos
#  Ejecutar desde la raíz del proyecto:
#    python ai/scripts/recolectar_datos.py
# ============================================================

import cv2
import os
import sys
import time
import numpy as np

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../backend'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

try:
    from app.services.mediapipe_service import MediaPipeService
    from utils.keypoint_utils import KP_TOTAL, SEQUENCE_LEN
except ImportError as e:
    print(f"❌ Error de importación: {e}")
    sys.exit(1)

VOCABULARIO = [
    "hola", "adios", "gracias", "por favor", "si",
    "no", "ayuda", "agua", "casa", "familia",
    "trabajo", "escuela", "comer", "dormir", "bano",
    "doctor", "policia", "emergencia", "nombre", "como estas",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "ñ", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
]

MUESTRAS_POR_SENA = 30
FRAME_INTERVAL_MS = 200
SEQUENCES_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences')


def contar_secuencias(sena):
    dir_sena = os.path.join(SEQUENCES_DIR, sena)
    if not os.path.exists(dir_sena):
        return 0
    return len([f for f in os.listdir(dir_sena) if f.endswith('.npy')])


def guardar_secuencia(sena, secuencia):
    dir_sena = os.path.join(SEQUENCES_DIR, sena)
    os.makedirs(dir_sena, exist_ok=True)
    timestamp = int(time.time() * 1000)
    path = os.path.join(dir_sena, f"{timestamp}.npy")
    np.save(path, np.array(secuencia, dtype=np.float32))
    return path


def recolectar():
    # Umbrales más permisivos para grabación (no necesitamos filtrar falsos positivos aquí)
    service = MediaPipeService(min_detection_confidence=0.3, min_tracking_confidence=0.3)
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Error: No se pudo acceder a la cámara.")
        return

    print("\n" + "=" * 55)
    print("  MANOS QUE HABLAN — RECOLECCIÓN DE SECUENCIAS LSC")
    print("  2 manos + movimiento (15 frames × 126 keypoints)")
    print("=" * 55)
    print(f"Vocabulario: {len(VOCABULARIO)} señas")
    print(f"Objetivo: {MUESTRAS_POR_SENA} secuencias por seña")
    print(f"Duración: {SEQUENCE_LEN * FRAME_INTERVAL_MS / 1000:.1f} segundos por secuencia")
    print("Instrucciones:")
    print("  - Presiona ENTER para iniciar la grabación de una secuencia")
    print("  - Haz la seña durante la cuenta regresiva y grabación")
    print("  - Presiona 'n' para saltar a la siguiente seña")
    print("  - Presiona 'q' para salir")
    print("=" * 55 + "\n")

    for sena in VOCABULARIO:
        muestras = contar_secuencias(sena)
        
        if muestras >= MUESTRAS_POR_SENA:
            print(f"⏩ Saltando '{sena}', ya tienes {muestras} secuencias.")
            continue
        
        print(f"\n📍 Seña: {sena.upper()} (tienes {muestras}/{MUESTRAS_POR_SENA})")
        
        while muestras < MUESTRAS_POR_SENA:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame = cv2.flip(frame, 1)
            
            cv2.putText(frame, f"Sena: {sena.upper()}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(frame, f"Secuencias: {muestras}/{MUESTRAS_POR_SENA}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.putText(frame, "ENTER = grabar | N = saltar | Q = salir", (10, 450),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
            
            cv2.imshow("Recoleccion LSC - Secuencias", frame)
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                print("Saliendo...")
                cap.release()
                cv2.destroyAllWindows()
                service.cerrar()
                return
            
            if key == ord('n'):
                print(f"⏩ Saltando '{sena}'.")
                break
            
            if key == 13:  # ENTER
                for countdown in [3, 2, 1]:
                    ret, frame = cap.read()
                    if ret:
                        frame = cv2.flip(frame, 1)
                        cv2.putText(frame, str(countdown), (280, 260),
                                    cv2.FONT_HERSHEY_SIMPLEX, 4, (0, 0, 255), 8)
                        cv2.putText(frame, f"Prepara: {sena.upper()}", (120, 380),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                        cv2.imshow("Recoleccion LSC - Secuencias", frame)
                    cv2.waitKey(800)

                print(f"  🔴 Grabando secuencia para '{sena}'...")
                secuencia = []
                frames_con_mano = 0
                
                for f_idx in range(SEQUENCE_LEN):
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    frame = cv2.flip(frame, 1)
                    
                    progress = int((f_idx + 1) / SEQUENCE_LEN * 100)
                    cv2.rectangle(frame, (0, 0), (640, 480), (0, 0, 255), 5)
                    cv2.putText(frame, f"GRABANDO {progress}%", (180, 40),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
                    cv2.putText(frame, sena.upper(), (220, 80),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                    cv2.imshow("Recoleccion LSC - Secuencias", frame)
                    
                    _, buffer = cv2.imencode('.jpg', frame)
                    keypoints = service.procesar_frame(buffer.tobytes())
                    
                    if keypoints and len(keypoints) == KP_TOTAL:
                        secuencia.append(keypoints)
                        frames_con_mano += 1
                    else:
                        secuencia.append([0.0] * KP_TOTAL)
                    
                    cv2.waitKey(FRAME_INTERVAL_MS)
                
                min_frames_con_mano = SEQUENCE_LEN // 2
                
                if len(secuencia) == SEQUENCE_LEN and frames_con_mano >= min_frames_con_mano:
                    path = guardar_secuencia(sena, secuencia)
                    muestras += 1
                    print(f"  ✅ Secuencia {muestras}/{MUESTRAS_POR_SENA} guardada "
                          f"({frames_con_mano}/{SEQUENCE_LEN} frames con mano)")
                else:
                    print(f"  ❌ Secuencia descartada: solo {frames_con_mano}/{SEQUENCE_LEN} "
                          f"frames con mano (mínimo {min_frames_con_mano})")

    print("\n🎉 ¡RECOLECCIÓN COMPLETADA!")
    print(f"   Secuencias guardadas en: {SEQUENCES_DIR}")
    
    print("\n📊 Resumen:")
    for sena in VOCABULARIO:
        n = contar_secuencias(sena)
        status = "✅" if n >= MUESTRAS_POR_SENA else "⚠️"
        print(f"   {status} {sena:<15} {n}/{MUESTRAS_POR_SENA}")
    
    cap.release()
    cv2.destroyAllWindows()
    service.cerrar()


if __name__ == "__main__":
    recolectar()
