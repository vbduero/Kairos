import cv2
import csv
import os
import sys
import time
import numpy as np

# Añadir el path del backend para importar el servicio de MediaPipe
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/../../backend')

try:
    from app.services.mediapipe_service import MediaPipeService
except ImportError:
    print("❌ Error: No se pudo importar MediaPipeService.")
    print("Asegúrate de ejecutar este script desde la raíz del proyecto o con el PYTHONPATH correcto.")
    sys.exit(1)

# --- CONFIGURACIÓN ---
VOCABULARIO = [
    "hola", "adios", "gracias", "por favor", "si",
    "no", "ayuda", "agua", "casa", "familia",
    "trabajo", "escuela", "comer", "dormir", "bano",
    "doctor", "policia", "emergencia", "nombre", "como estas"
]

MUESTRAS_POR_SENA = 50
DATASET_PATH = os.path.join(os.path.dirname(__file__), '../datasets/lsc_dataset.csv')
COLUMNAS = ['label'] + [f'kp_{i}' for i in range(63)] # label + 21*3 keypoints

def inicializar_csv():
    """Crea el archivo CSV con encabezados si no existe."""
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
    if not os.path.exists(DATASET_PATH):
        with open(DATASET_PATH, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(COLUMNAS)
        print(f"✅ Dataset creado en {DATASET_PATH}")
    else:
        print(f"ℹ️ Usando dataset existente en {DATASET_PATH}")

def count_existing_samples(sena):
    """Cuenta cuántas muestras ya existen para una seña en el CSV."""
    if not os.path.exists(DATASET_PATH):
        return 0
    try:
        with open(DATASET_PATH, 'r') as f:
            reader = csv.reader(f)
            return sum(1 for row in reader if row and row[0] == sena)
    except Exception:
        return 0

def recolectar():
    inicializar_csv()
    
    service = MediaPipeService()
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Error: No se pudo acceder a la cámara.")
        return

    print("\n" + "="*50)
    print("  MANOS QUE HABLAN — RECOLECCIÓN DE DATOS LSC")
    print("="*50)
    print(f"Vocabulario: {len(VOCABULARIO)} señas")
    print(f"Objetivo: {MUESTRAS_POR_SENA} muestras por seña")
    print("Instrucciones:")
    print("  - Presiona ENTER para empezar a grabar una seña.")
    print("  - Presiona 'n' para saltar a la siguiente seña.")
    print("  - Presiona 'q' para salir.")
    print("="*50 + "\n")

    for sena in VOCABULARIO:
        muestras_tomadas = count_existing_samples(sena)
        
        if muestras_tomadas >= MUESTRAS_POR_SENA:
            print(f"⏩ Saltando '{sena}', ya tienes {muestras_tomadas} muestras.")
            continue
        
        print(f"📍 Preparado para seña: {sena.upper()} (ya tienes {muestras_tomadas})")
        
        while muestras_tomadas < MUESTRAS_POR_SENA:
            ret, frame = cap.read()
            if not ret: break
            
            frame = cv2.flip(frame, 1) # Espejo
            
            # Mostrar info en pantalla
            cv2.putText(frame, f"Sena actual: {sena.upper()}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Progreso: {muestras_tomadas}/{MUESTRAS_POR_SENA}", (10, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.putText(frame, "Presiona ENTER para grabar", (10, 450), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            cv2.imshow("Recoleccion de Datos LSC", frame)
            
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                print("Exiting...")
                cap.release()
                cv2.destroyAllWindows()
                service.cerrar()
                return
            
            if key == ord('n'):
                print(f"⏩ Saltando '{sena}' por petición del usuario.")
                break

            if key == 13: # ENTER
                print(f"Capturando ráfaga para '{sena}'...")
                # Capturamos una ráfaga de frames para mayor variabilidad
                for _ in range(10): 
                    ret, frame = cap.read()
                    if not ret: break
                    frame = cv2.flip(frame, 1)
                    
                    # Convertir a bytes para MediaPipeService
                    _, buffer = cv2.imencode('.jpg', frame)
                    keypoints = service.procesar_frame(buffer.tobytes())
                    
                    if keypoints:
                        # Guardar en CSV
                        with open(DATASET_PATH, 'a', newline='') as f:
                            writer = csv.writer(f)
                            writer.writerow([sena] + keypoints)
                        muestras_tomadas += 1
                        print(f"  [+] Muestra {muestras_tomadas}/{MUESTRAS_POR_SENA} guardada")
                    else:
                        print("  [!] Mano no detectada, saltando frame...")
                    
                    # Mostrar que estamos grabando
                    cv2.rectangle(frame, (0,0), (640,480), (0,0,255), 10)
                    cv2.imshow("Recoleccion de Datos LSC", frame)
                    cv2.waitKey(100) # Pequeña pausa entre frames

                    if muestras_tomadas >= MUESTRAS_POR_SENA:
                        break
                print(f"✅ Ráfaga completada.")

    print("\n🎉 ¡RECOLECCIÓN COMPLETADA!")
    cap.release()
    cv2.destroyAllWindows()
    service.cerrar()

if __name__ == "__main__":
    recolectar()
