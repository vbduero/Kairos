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
import subprocess
from collections import deque

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../backend'))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

try:
    from app.services.mediapipe_service import MediaPipeService
    from utils.keypoint_utils import KP_TOTAL, KP_HOLISTIC_RAW, KP_PER_HAND, SEQUENCE_LEN
except ImportError as e:
    print(f"❌ Error de importación: {e}")
    sys.exit(1)

# ── Habilitar ANSI en Windows ─────────────────────────────
if sys.platform == "win32":
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)

# ── Colores ANSI ──────────────────────────────────────────
R  = "\033[0m"          # reset
B  = "\033[1m"          # bold
CY = "\033[96m"         # cyan claro
GR = "\033[92m"         # verde
YL = "\033[93m"         # amarillo
RD = "\033[91m"         # rojo
BL = "\033[94m"         # azul
DM = "\033[2m"          # dim/gris

VOCABULARIO = [
    "hola", "adios", "gracias", "por favor", "si",
    "no", "ayuda", "agua", "casa", "familia",
    "trabajo", "escuela", "comer", "dormir", "bano",
    "doctor", "policia", "emergencia", "nombre", "como estas",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "ñ", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
]

MUESTRAS_POR_SENA = 50
FRAME_INTERVAL_MS = 100   # ms entre frames → 20 × 100 = 2.0 s de grabación
SEQUENCES_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences')
ANCHO = 58  # ancho interior del cuadro

# Resoluciones disponibles para selección
RESOLUCIONES = {
    "1": (640,  480,  "640×480  — Estándar (webcam integrada)"),
    "2": (1280, 720,  "1280×720 — HD  (iPhone con Camo / webcam HD)"),
    "3": (1920, 1080, "1920×1080 — FHD (iPhone con Camo calidad máxima)"),
}


# ═══════════════════════════════════════════════════════════════
#  Auto-ajuste de cámara
#  Detecta mala iluminación y aplica correcciones automáticas:
#    - CLAHE (software, siempre funciona)
#    - Brillo/exposición hardware vía cv2 (depende del driver)
# ═══════════════════════════════════════════════════════════════

class CamaraAuto:
    BRILLO_MIN  = 55    # umbral bajo — imagen muy oscura
    BRILLO_MAX  = 205   # umbral alto — sobreexpuesto
    CONTRASTE_MIN = 28  # imagen plana / sin textura

    def __init__(self, cap: cv2.VideoCapture):
        self.cap = cap
        self.clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        self._ultimo_hw_ajuste = 0.0
        self._intervalo_hw = 2.5    # segundos entre intentos de ajuste hardware
        self._historial_brillo: deque = deque(maxlen=8)
        self.estado = "OK"          # "oscuro" | "brillante" | "bajo_contraste" | "OK"
        self._hw_disponible: bool | None = None  # None=no probado, True/False=resultado

        # Intentar pasar a modo manual de exposición (silenciosamente)
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 1)   # V4L2: 1=manual
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)  # Windows: 0.25=manual

    # ── Análisis y corrección principal ──────────────────────────
    def procesar(self, frame: np.ndarray):
        """
        Recibe el frame BGR, devuelve (frame_mejorado, brillo, contraste).
        Aplica CLAHE cuando la iluminación es deficiente.
        Intenta ajustes hardware periódicamente.
        """
        gray      = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brillo    = float(gray.mean())
        contraste = float(gray.std())
        self._historial_brillo.append(brillo)
        brillo_avg = sum(self._historial_brillo) / len(self._historial_brillo)

        # ── Determinar estado ────────────────────────────────────
        if brillo_avg < self.BRILLO_MIN:
            self.estado = "oscuro"
        elif brillo_avg > self.BRILLO_MAX:
            self.estado = "brillante"
        elif contraste < self.CONTRASTE_MIN:
            self.estado = "bajo_contraste"
        else:
            self.estado = "OK"

        # ── Corrección software: CLAHE ───────────────────────────
        if self.estado in ("oscuro", "bajo_contraste"):
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            lab[:, :, 0] = self.clahe.apply(lab[:, :, 0])
            frame = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        elif self.estado == "brillante":
            # Reducir sobreexposición con curva de gamma
            lut = np.array([min(255, int(i * 0.75)) for i in range(256)], dtype=np.uint8)
            frame = cv2.LUT(frame, lut)

        # ── Corrección hardware (solo cada N segundos) ───────────
        ahora = time.time()
        if ahora - self._ultimo_hw_ajuste >= self._intervalo_hw:
            self._ultimo_hw_ajuste = ahora
            self._intentar_ajuste_hardware(brillo_avg)

        return frame, brillo, contraste

    def _intentar_ajuste_hardware(self, brillo_avg: float):
        """Intenta ajustar brillo vía driver. Silencioso si no es compatible."""
        try:
            if brillo_avg < self.BRILLO_MIN:
                ok = self.cap.set(cv2.CAP_PROP_BRIGHTNESS, 160)
                if ok and self._hw_disponible is None:
                    self._hw_disponible = True
            elif brillo_avg > self.BRILLO_MAX:
                ok = self.cap.set(cv2.CAP_PROP_BRIGHTNESS, 90)
                if ok and self._hw_disponible is None:
                    self._hw_disponible = True
            else:
                self.cap.set(cv2.CAP_PROP_BRIGHTNESS, 128)  # neutro
        except Exception:
            self._hw_disponible = False

    # ── Indicador visual ──────────────────────────────────────────
    def dibujar_indicador(self, frame: np.ndarray,
                          brillo: float, contraste: float) -> np.ndarray:
        """Dibuja un chip de iluminación en el frame."""
        colores = {
            "OK":             (0,  220,   0),
            "oscuro":         (0,  120, 255),
            "brillante":      (0,  255, 255),
            "bajo_contraste": (0,  180, 180),
        }
        textos = {
            "OK":             f"Ilum OK  B:{brillo:.0f}",
            "oscuro":         f"Luz baja — ajustando  B:{brillo:.0f}",
            "brillante":      f"Sobreexp — ajustando  B:{brillo:.0f}",
            "bajo_contraste": f"Contraste bajo  C:{contraste:.0f}",
        }
        prefijo = "" if self.estado == "OK" else "⚠ "
        hw_txt  = " [HW]" if self._hw_disponible else ""
        txt     = prefijo + textos[self.estado] + hw_txt
        col     = colores[self.estado]

        # Fondo semi-transparente para legibilidad
        overlay = frame.copy()
        cv2.rectangle(overlay, (8, 108), (430, 132), (0, 0, 0), -1)
        frame = cv2.addWeighted(overlay, 0.45, frame, 0.55, 0)
        cv2.putText(frame, txt, (12, 127),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, col, 1, cv2.LINE_AA)
        return frame


# ── Selector de cámara ───────────────────────────────────────

def _abrir_camara(idx: int) -> cv2.VideoCapture:
    """
    Intenta abrir la cámara con el mejor backend disponible.
    Cámaras virtuales (Camo, OBS, etc.) necesitan MSMF en Windows;
    las físicas van bien con DSHOW (más rápido) o el default.
    """
    for backend in (cv2.CAP_MSMF, cv2.CAP_DSHOW, 0):
        cap = cv2.VideoCapture(idx, backend)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None and frame.any():
                return cap          # primer backend que entrega frames reales
            cap.release()
    # último recurso: sin flag
    return cv2.VideoCapture(idx)


def detectar_camaras(max_idx: int = 9) -> list:
    """Escanea índices 0..max_idx y retorna lista de (índice, ancho, alto)."""
    disponibles = []
    for idx in range(max_idx + 1):
        cap = _abrir_camara(idx)
        if cap.isOpened():
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            disponibles.append((idx, w, h))
            cap.release()
    return disponibles


def seleccionar_camara_y_resolucion() -> tuple:
    """
    Muestra las cámaras detectadas, deja elegir índice y resolución.
    Retorna (indice_camara, ancho, alto).
    """
    limpiar()
    print(f"\n{CY}╔{'═' * ANCHO}╗{R}")
    print(f"{CY}║{R}{B}{'  CONFIGURACIÓN DE CÁMARA':^{ANCHO}}{R}{CY}║{R}")
    print(f"{CY}╚{'═' * ANCHO}╝{R}\n")

    print(f"  {DM}Buscando cámaras disponibles...{R}", end="", flush=True)
    disponibles = detectar_camaras()
    print(f"\r  {GR}Cámaras encontradas: {len(disponibles)}{R}               \n")

    if not disponibles:
        print(f"  {RD}❌ No se detectó ninguna cámara. Verifica la conexión.{R}\n")
        input(f"  {DM}Presiona ENTER para salir...{R}")
        sys.exit(1)

    print(f"  {B}{'#':<5} {'Índice':<8} {'Resolución detectada'}{R}")
    print(f"  {'─'*40}")
    for i, (idx, w, h) in enumerate(disponibles):
        etiqueta = f"{GR}[Camo/iPhone]{R}" if idx > 0 else f"{DM}[Integrada] {R}"
        print(f"  {BL}[{i+1}]{R}   idx={idx}    {w}×{h}   {etiqueta}")

    print()
    cam_idx = 0
    if len(disponibles) > 1:
        while True:
            raw = input(f"  {CY}Selecciona la cámara [1-{len(disponibles)}]: {R}").strip()
            try:
                n = int(raw)
                if 1 <= n <= len(disponibles):
                    cam_idx = disponibles[n - 1][0]
                    break
            except ValueError:
                pass
            print(f"  {RD}Opción inválida.{R}")
    else:
        cam_idx = disponibles[0][0]
        print(f"  {DM}Solo una cámara disponible → usando índice {cam_idx}{R}")

    # Selección de resolución
    print(f"\n  {B}Resolución de captura:{R}")
    for k, (w, h, desc) in RESOLUCIONES.items():
        print(f"  {BL}[{k}]{R} {desc}")
    print(f"  {BL}[ENTER]{R} {DM}Usar resolución detectada de la cámara{R}")
    print()

    res_w, res_h = disponibles[[d[0] for d in disponibles].index(cam_idx)][1:3]
    raw = input(f"  {CY}Selecciona resolución [1-3 o ENTER]: {R}").strip()
    if raw in RESOLUCIONES:
        res_w, res_h = RESOLUCIONES[raw][0], RESOLUCIONES[raw][1]

    print(f"\n  {GR}✔ Cámara índice {cam_idx} — resolución {res_w}×{res_h}{R}\n")
    return cam_idx, res_w, res_h


# ── Overlay de regla de tercios ───────────────────────────────

def dibujar_tercios(frame: np.ndarray, alpha: float = 0.35) -> np.ndarray:
    """
    Dibuja la cuadrícula de regla de tercios (3×3) sobre el frame.
    Usa una capa semi-transparente para no tapar la imagen.
    """
    h, w = frame.shape[:2]
    overlay = frame.copy()
    color = (200, 200, 200)
    grosor = 1

    # Líneas verticales en 1/3 y 2/3
    for x in [w // 3, 2 * w // 3]:
        cv2.line(overlay, (x, 0), (x, h), color, grosor)
    # Líneas horizontales en 1/3 y 2/3
    for y in [h // 3, 2 * h // 3]:
        cv2.line(overlay, (0, y), (w, y), color, grosor)

    return cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)


def dibujar_zona_activa(frame: np.ndarray, kp_raw: list | None) -> np.ndarray:
    """
    Si hay keypoints, resalta el tercio donde está la muñeca principal.
    Ayuda visualmente a ver en qué zona se está ejecutando la seña.
    """
    if not kp_raw or len(kp_raw) < 3:
        return frame

    h, w = frame.shape[:2]
    # Muñeca mano 1 está en kp[0] y kp[1] (x,y normalizados 0-1 por MediaPipe)
    wx = int(kp_raw[0] * w)
    wy = int(kp_raw[1] * h)

    col_z = wx // (w // 3)   # columna 0,1,2
    row_z = wy // (h // 3)   # fila 0,1,2
    col_z = min(col_z, 2)
    row_z = min(row_z, 2)

    x1 = col_z * (w // 3)
    y1 = row_z * (h // 3)
    x2 = x1 + w // 3
    y2 = y1 + h // 3

    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 255, 120), -1)
    frame = cv2.addWeighted(overlay, 0.12, frame, 0.88, 0)
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 120), 2)

    return frame


# ── Utilidades de UI ──────────────────────────────────────

def limpiar():
    os.system('cls' if sys.platform == 'win32' else 'clear')


def linea(char="─", color=CY):
    return f"{color}{'─' * ANCHO}{R}"


def barra_progreso(actual, total, largo=20):
    llenos = int(largo * actual / total) if total > 0 else 0
    vacios = largo - llenos
    color = GR if actual >= total else (YL if actual > 0 else RD)
    return f"{color}{'█' * llenos}{DM}{'░' * vacios}{R}"


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


def resumen_global():
    conteos = {s: contar_secuencias(s) for s in VOCABULARIO}
    completas = sum(1 for n in conteos.values() if n >= MUESTRAS_POR_SENA)
    total_seq = sum(conteos.values())
    return conteos, completas, total_seq


# ── Cabecera ──────────────────────────────────────────────

def mostrar_cabecera(conteos=None, completas=None):
    if conteos is None:
        conteos, completas, _ = resumen_global()

    pct = int(completas / len(VOCABULARIO) * 100)
    barra = barra_progreso(completas, len(VOCABULARIO), largo=24)

    print(f"\n{CY}╔{'═' * ANCHO}╗{R}")
    titulo = "KAIROS — RECOLECCIÓN LSC"
    sub    = f"2 manos · {SEQUENCE_LEN} frames · 174 keypoints + zona"
    print(f"{CY}║{R}{B}{titulo:^{ANCHO}}{R}{CY}║{R}")
    print(f"{CY}║{R}{DM}{sub:^{ANCHO}}{R}{CY}║{R}")
    print(f"{CY}╠{'═' * ANCHO}╣{R}")

    info = f"  Vocabulario: {B}{len(VOCABULARIO)}{R} señas   Objetivo: {B}{MUESTRAS_POR_SENA}{R} por seña"
    print(f"{CY}║{R}{info:<{ANCHO + 18}}{CY}║{R}")
    prog = f"  Progreso: {barra} {GR if pct == 100 else YL}{completas}/{len(VOCABULARIO)}{R} ({pct}%)"
    print(f"{CY}║{R}{prog:<{ANCHO + 55}}{CY}║{R}")
    print(f"{CY}╚{'═' * ANCHO}╝{R}")


# ── Vista de progreso ─────────────────────────────────────

def ver_progreso():
    limpiar()
    conteos, completas, total_seq = resumen_global()
    mostrar_cabecera(conteos, completas)

    print(f"\n{B}{CY}  ESTADO DE SECUENCIAS{R}\n")
    print(f"  {'SEÑA':<16} {'BARRA':<24} {'CONTEO':>8}  {'ESTADO'}")
    print(f"  {DM}{'─'*16} {'─'*24} {'─'*8}  {'─'*10}{R}")

    for sena in VOCABULARIO:
        n = conteos[sena]
        barra = barra_progreso(n, MUESTRAS_POR_SENA, largo=20)
        if n >= MUESTRAS_POR_SENA:
            estado = f"{GR}Completa{R}"
            conteo_str = f"{GR}{n:>2}/{MUESTRAS_POR_SENA}{R}"
        elif n > 0:
            estado = f"{YL}Parcial{R}"
            conteo_str = f"{YL}{n:>2}/{MUESTRAS_POR_SENA}{R}"
        else:
            estado = f"{RD}Pendiente{R}"
            conteo_str = f"{RD}{n:>2}/{MUESTRAS_POR_SENA}{R}"

        print(f"  {sena:<16} {barra}  {conteo_str}   {estado}")

    pendientes = [s for s in VOCABULARIO if conteos[s] < MUESTRAS_POR_SENA]
    print(f"\n  {DM}Total secuencias grabadas: {total_seq}{R}")
    print(f"  {GR}Completas: {completas}{R}  {YL}Pendientes: {len(pendientes)}{R}\n")
    input(f"  {DM}Presiona ENTER para volver al menú...{R}")


# ── Selección de seña específica ──────────────────────────

def seleccionar_sena():
    limpiar()
    conteos, completas, _ = resumen_global()
    mostrar_cabecera(conteos, completas)

    pendientes = [(i, s) for i, s in enumerate(VOCABULARIO) if conteos[s] < MUESTRAS_POR_SENA]

    if not pendientes:
        print(f"\n  {GR}¡Todas las señas están completas!{R}\n")
        input(f"  {DM}Presiona ENTER para volver...{R}")
        return None

    print(f"\n{B}{CY}  SEÑAS PENDIENTES{R}\n")
    cols = 3
    for idx, (vi, sena) in enumerate(pendientes):
        n = conteos[sena]
        num = f"{BL}[{idx + 1:>2}]{R}"
        nombre = f"{B}{sena:<13}{R}"
        cnt = f"{YL if n > 0 else RD}{n:>2}/{MUESTRAS_POR_SENA}{R}"
        print(f"  {num} {nombre} {cnt}", end="   " if (idx + 1) % cols != 0 else "\n")

    if len(pendientes) % cols != 0:
        print()

    print(f"\n  {DM}[0] Volver al menú{R}")
    print()

    while True:
        try:
            raw = input(f"  {CY}Elige el número de la seña: {R}").strip()
            if raw == "0":
                return None
            n = int(raw)
            if 1 <= n <= len(pendientes):
                return pendientes[n - 1][1]
            print(f"  {RD}Número inválido, elige entre 1 y {len(pendientes)}.{R}")
        except ValueError:
            print(f"  {RD}Ingresa un número válido.{R}")


# ── Lógica de grabación ───────────────────────────────────

def grabar_sena(service, cap, sena, camara_auto: 'CamaraAuto'):
    muestras = contar_secuencias(sena)

    print(f"\n{CY}{'─' * ANCHO}{R}")
    print(f"  {B}Seña:{R} {YL}{sena.upper()}{R}   "
          f"{B}Secuencias:{R} {GR if muestras >= MUESTRAS_POR_SENA else YL}"
          f"{muestras}/{MUESTRAS_POR_SENA}{R}")
    print(f"  {DM}ENTER = grabar  |  N = saltar  |  Q = salir{R}")
    print(f"{CY}{'─' * ANCHO}{R}\n")

    while muestras < MUESTRAS_POR_SENA:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)

        # ── Auto-ajuste de iluminación ────────────────────────────
        frame, brillo, contraste = camara_auto.procesar(frame)

        # ── Detección en tiempo real para feedback visual ──────────
        _, buf_prev = cv2.imencode('.jpg', frame)
        kp_prev = service.procesar_frame(buf_prev.tobytes())

        # Contar manos activas: cada mano ocupa KP_PER_HAND valores (63)
        n_manos = 0
        if kp_prev and len(kp_prev) == KP_HOLISTIC_RAW:
            kp_arr = np.array(kp_prev)
            if np.any(np.abs(kp_arr[:KP_PER_HAND]) > 1e-6):
                n_manos += 1
            if np.any(np.abs(kp_arr[KP_PER_HAND:KP_PER_HAND * 2]) > 1e-6):
                n_manos += 1

        # Regla de tercios + zona activa
        frame = dibujar_tercios(frame)
        frame = dibujar_zona_activa(frame, kp_prev)

        if n_manos == 2:
            borde_color = (0, 220, 0)
            estado_txt  = "2 manos detectadas — listo"
            estado_col  = (0, 220, 0)
        elif n_manos == 1:
            borde_color = (0, 220, 0)   # verde: 1 mano también es válido
            estado_txt  = "1 mano detectada — listo"
            estado_col  = (0, 220, 0)
        else:
            borde_color = (80, 80, 80)
            estado_txt  = "Sin manos — ajusta posicion"
            estado_col  = (80, 80, 220)

        h_f, w_f = frame.shape[:2]
        cv2.rectangle(frame, (0, 0), (w_f - 1, h_f - 1), borde_color, 3)
        cv2.putText(frame, estado_txt, (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, estado_col, 2)

        # Indicador de iluminación
        frame = camara_auto.dibujar_indicador(frame, brillo, contraste)

        cv2.putText(frame, f"Sena: {sena.upper()}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, f"Secuencias: {muestras}/{MUESTRAS_POR_SENA}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 220, 0), 2)
        cv2.putText(frame, "ENTER=grabar  N=saltar  Q=salir", (10, 455),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 220), 1)

        cv2.imshow("Recoleccion LSC", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            return "quit"

        if key == ord('n'):
            print(f"  {YL}⏩ Saltando '{sena}'.{R}")
            return "next"

        if key == 13:  # ENTER
            for countdown in [3, 2, 1]:
                ret, frame = cap.read()
                if ret:
                    frame = cv2.flip(frame, 1)
                    frame, _, _ = camara_auto.procesar(frame)
                    frame = dibujar_tercios(frame)
                    hc, wc = frame.shape[:2]
                    cv2.putText(frame, str(countdown), (wc // 2 - 40, hc // 2 + 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 4, (0, 0, 255), 8)
                    cv2.putText(frame, f"Prepara: {sena.upper()}", (wc // 2 - 120, hc * 3 // 4),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                    cv2.imshow("Recoleccion LSC", frame)
                cv2.waitKey(800)

            print(f"  {RD}● Grabando...{R}")
            secuencia = []
            frames_con_mano = 0

            for f_idx in range(SEQUENCE_LEN):
                ret, frame = cap.read()
                if not ret:
                    break

                frame = cv2.flip(frame, 1)
                # Aplicar corrección antes de enviar a MediaPipe
                frame, _, _ = camara_auto.procesar(frame)
                progress = int((f_idx + 1) / SEQUENCE_LEN * 100)

                hr, wr = frame.shape[:2]
                cv2.rectangle(frame, (0, 0), (wr - 1, hr - 1), (0, 0, 255), 5)
                cv2.putText(frame, f"GRABANDO {progress}%", (180, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
                cv2.putText(frame, sena.upper(), (220, 80),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                cv2.imshow("Recoleccion LSC", frame)

                _, buffer = cv2.imencode('.jpg', frame)
                keypoints = service.procesar_frame(buffer.tobytes())

                # MediaPipe devuelve 168 kp crudos (KP_HOLISTIC_RAW)
                if keypoints and len(keypoints) == KP_HOLISTIC_RAW:
                    secuencia.append(keypoints)
                    frames_con_mano += 1
                else:
                    secuencia.append([0.0] * KP_HOLISTIC_RAW)

                cv2.waitKey(FRAME_INTERVAL_MS)

            min_frames_con_mano = 1  # al menos 1 frame con mano detectada

            if len(secuencia) == SEQUENCE_LEN and frames_con_mano >= min_frames_con_mano:
                guardar_secuencia(sena, secuencia)
                muestras += 1
                print(f"  {GR}✔ Secuencia {muestras}/{MUESTRAS_POR_SENA} guardada "
                      f"({frames_con_mano}/{SEQUENCE_LEN} frames con mano){R}")
            else:
                print(f"  {RD}✘ Descartada: solo {frames_con_mano}/{SEQUENCE_LEN} frames "
                      f"con mano (mínimo {min_frames_con_mano}){R}")

    if muestras >= MUESTRAS_POR_SENA:
        print(f"  {GR}✔ '{sena}' completa ({muestras}/{MUESTRAS_POR_SENA}){R}")

    return "done"


# ── Recolección continua ──────────────────────────────────

def iniciar_recoleccion(service, cap, camara_auto, sena_inicio=None):
    lista = VOCABULARIO if sena_inicio is None else [sena_inicio]

    if sena_inicio is None:
        conteos, completas, _ = resumen_global()
        pendientes = [s for s in VOCABULARIO if conteos[s] < MUESTRAS_POR_SENA]
        prox = pendientes[0] if pendientes else None

        print(f"\n{CY}{'─' * ANCHO}{R}")
        print(f"  {GR}✔ Completas:{R} {B}{completas}{R}   "
              f"{YL}⏳ Pendientes:{R} {B}{len(pendientes)}{R}")
        if prox:
            print(f"  {DM}Comenzando en: {B}{prox.upper()}{R}")
        print(f"{CY}{'─' * ANCHO}{R}\n")

    for sena in lista:
        if contar_secuencias(sena) >= MUESTRAS_POR_SENA:
            continue

        resultado = grabar_sena(service, cap, sena, camara_auto)
        if resultado == "quit":
            return "quit"

    return "done"


# ── Preprocesamiento y entrenamiento ─────────────────────

SCRIPTS_DIR = os.path.join(os.path.dirname(__file__))
PYTHON      = sys.executable   # mismo intérprete que está corriendo ahora


def _contar_secuencias_total():
    """Cuenta cuántas secuencias hay en total para mostrar hint."""
    total = 0
    if os.path.exists(SEQUENCES_DIR):
        for sena in os.listdir(SEQUENCES_DIR):
            d = os.path.join(SEQUENCES_DIR, sena)
            if os.path.isdir(d):
                total += len([f for f in os.listdir(d) if f.endswith('.npy')])
    return total


def _hay_datos_entrenamiento():
    """Verifica si ya existe X_train.npy generado por preprocesar."""
    x_train = os.path.join(SEQUENCES_DIR, '..', 'X_train.npy')
    return os.path.exists(os.path.normpath(x_train))


def _hay_sequences():
    """Verifica si hay al menos una secuencia grabada."""
    if not os.path.exists(SEQUENCES_DIR):
        return False
    for d in os.listdir(SEQUENCES_DIR):
        if os.path.isdir(os.path.join(SEQUENCES_DIR, d)):
            if any(f.endswith('.npy') for f in os.listdir(os.path.join(SEQUENCES_DIR, d))):
                return True
    return False


def ejecutar_augmentacion():
    limpiar()
    if not _hay_sequences():
        print(f"\n  {RD}❌ No se encontraron secuencias en datasets/sequences/.{R}")
        print(f"  {YL}Primero graba señas con la opción [1] o [3].{R}\n")
        input(f"  {DM}Presiona ENTER para volver...{R}")
        return

    total = _contar_secuencias_total()
    print(f"\n{CY}{'═' * ANCHO}{R}")
    print(f"{B}{'  AUGMENTACIÓN DE DATOS':^{ANCHO}}{R}")
    print(f"{CY}{'═' * ANCHO}{R}")
    print(f"\n  {DM}Secuencias originales: {B}{total}{R}")
    print(f"  {DM}Genera 5 variaciones por muestra (ruido, escala, traslación, espejo){R}")
    print(f"  {DM}Salida → datasets/sequences_augmented/{R}\n")
    print(f"  {YL}{'─' * (ANCHO - 2)}{R}\n")

    script = os.path.join(SCRIPTS_DIR, 'augmentar_datos.py')
    resultado = subprocess.run([PYTHON, script], cwd=os.path.join(SCRIPTS_DIR, '../..'))

    print(f"\n  {YL}{'─' * (ANCHO - 2)}{R}")
    if resultado.returncode == 0:
        print(f"\n  {GR}✅ Augmentación completada. Ahora ejecuta [5] Preprocesar datos.{R}")
    else:
        print(f"\n  {RD}❌ Error en la augmentación (código {resultado.returncode}).{R}")

    input(f"\n  {DM}Presiona ENTER para volver al menú...{R}")


def ejecutar_preprocesamiento():
    limpiar()
    total = _contar_secuencias_total()
    print(f"\n{CY}{'═' * ANCHO}{R}")
    print(f"{B}{'  PREPROCESAMIENTO DE DATOS':^{ANCHO}}{R}")
    print(f"{CY}{'═' * ANCHO}{R}")
    print(f"\n  {DM}Secuencias encontradas: {B}{total}{R}")
    print(f"  {DM}Normalizando, dividiendo train/test y guardando .npy...{R}\n")
    print(f"  {YL}{'─' * (ANCHO - 2)}{R}\n")

    script = os.path.join(SCRIPTS_DIR, 'preprocesar_datos.py')
    resultado = subprocess.run([PYTHON, script], cwd=os.path.join(SCRIPTS_DIR, '../..'))

    print(f"\n  {YL}{'─' * (ANCHO - 2)}{R}")
    if resultado.returncode == 0:
        print(f"\n  {GR}✅ Preprocesamiento completado.{R}")
    else:
        print(f"\n  {RD}❌ Error en el preprocesamiento (código {resultado.returncode}).{R}")

    input(f"\n  {DM}Presiona ENTER para volver al menú...{R}")


def ejecutar_entrenamiento():
    limpiar()
    if not _hay_datos_entrenamiento():
        print(f"\n  {RD}❌ No se encontró X_train.npy.{R}")
        print(f"  {YL}Primero ejecuta la opción [5] Preprocesar datos.{R}\n")
        input(f"  {DM}Presiona ENTER para volver...{R}")
        return

    conteos, completas, _ = resumen_global()
    print(f"\n{CY}{'═' * ANCHO}{R}")
    print(f"{B}{'  ENTRENAMIENTO DEL MODELO LSTM':^{ANCHO}}{R}")
    print(f"{CY}{'═' * ANCHO}{R}")
    print(f"\n  {DM}Señas disponibles: {B}{completas}{R} / {len(VOCABULARIO)}")
    print(f"  {DM}Esto puede tardar varios minutos dependiendo del equipo.{R}\n")
    print(f"  {YL}{'─' * (ANCHO - 2)}{R}\n")

    script = os.path.join(SCRIPTS_DIR, 'entrenar_modelo.py')
    resultado = subprocess.run([PYTHON, script], cwd=os.path.join(SCRIPTS_DIR, '../..'))

    print(f"\n  {YL}{'─' * (ANCHO - 2)}{R}")
    if resultado.returncode == 0:
        print(f"\n  {GR}✅ Entrenamiento completado. Modelo guardado en ai/models/saved/{R}")
    else:
        print(f"\n  {RD}❌ Error en el entrenamiento (código {resultado.returncode}).{R}")

    input(f"\n  {DM}Presiona ENTER para volver al menú...{R}")


# ── Menú principal ────────────────────────────────────────

def menu():
    limpiar()
    conteos, completas, _ = resumen_global()
    mostrar_cabecera(conteos, completas)

    pendientes  = sum(1 for s in VOCABULARIO if conteos[s] < MUESTRAS_POR_SENA)
    prox        = next((s for s in VOCABULARIO if conteos[s] < MUESTRAS_POR_SENA), None)
    total_seqs  = _contar_secuencias_total()
    hay_seqs    = _hay_sequences()
    hay_xtrain  = _hay_datos_entrenamiento()

    print(f"\n{CY}  ┌{'─' * (ANCHO - 2)}┐{R}")
    print(f"{CY}  │{R}{B}{'  MENÚ PRINCIPAL':^{ANCHO - 2}}{R}{CY}│{R}")
    print(f"{CY}  ├{'─' * (ANCHO - 2)}┤{R}")

    opciones = [
        ("1", "Iniciar recolección",
              f"continúa desde '{prox}'" if prox else "¡todo completo!"),
        ("2", "Ver progreso",
              f"{completas}/{len(VOCABULARIO)} señas completas"),
        ("3", "Seña específica",
              f"{pendientes} pendientes"),
        ("4", "Augmentar datos",
              f"{total_seqs} seqs → x5 variaciones" if hay_seqs else f"{RD}primero graba señas{R}"),
        ("5", "Preprocesar datos",
              "normalizar + split train/test" if hay_seqs else f"{RD}primero augmenta (opción 4){R}"),
        ("6", "Entrenar modelo",
              "listo para entrenar" if hay_xtrain else f"{RD}primero preprocesa (opción 5){R}"),
        ("7", "Salir", ""),
    ]

    for clave, nombre, hint in opciones:
        hint_str = f"{DM}  ({hint}){R}" if hint else ""
        linea_op = f"  {BL}[{clave}]{R} {B}{nombre}{R}{hint_str}"
        print(f"{CY}  │{R}{linea_op}")

    print(f"{CY}  └{'─' * (ANCHO - 2)}┘{R}\n")

    while True:
        raw = input(f"  {CY}Elige una opción [1-7]: {R}").strip()
        if raw in ("1", "2", "3", "4", "5", "6", "7"):
            return raw
        print(f"  {RD}Opción inválida.{R}")


# ── Punto de entrada ──────────────────────────────────────

def main():
    service      = None
    cap          = None
    camara_auto  = None
    cam_idx      = None
    cam_w        = None
    cam_h        = None

    while True:
        opcion = menu()

        if opcion == "7":
            limpiar()
            print(f"\n{GR}  Hasta luego.{R}\n")
            break

        if opcion == "2":
            ver_progreso()
            continue

        if opcion == "4":
            ejecutar_augmentacion()
            continue

        if opcion == "5":
            ejecutar_preprocesamiento()
            continue

        if opcion == "6":
            ejecutar_entrenamiento()
            continue

        # Opciones 1 y 3 necesitan cámara
        if service is None:
            cam_idx, cam_w, cam_h = seleccionar_camara_y_resolucion()
            limpiar()
            print(f"\n  {DM}Iniciando cámara {cam_idx} ({cam_w}×{cam_h}) y MediaPipe Holistic...{R}")
            print(f"  {DM}(incluye manos + rostro + hombros){R}")
            service = MediaPipeService(min_detection_confidence=0.3,
                                       min_tracking_confidence=0.3)
            cap = _abrir_camara(cam_idx)
            if not cap.isOpened():
                print(f"  {RD}❌ No se pudo acceder a la cámara {cam_idx}.{R}\n")
                service = None
                input(f"  {DM}Presiona ENTER para continuar...{R}")
                continue

            cap.set(cv2.CAP_PROP_FRAME_WIDTH,  cam_w)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, cam_h)
            real_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            real_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            print(f"  {GR}✅ Cámara iniciada — resolución real: {real_w}×{real_h}{R}")
            camara_auto = CamaraAuto(cap)
            print(f"  {GR}✅ Auto-ajuste de iluminación activado.{R}")

        if opcion == "1":
            limpiar()
            mostrar_cabecera()
            resultado = iniciar_recoleccion(service, cap, camara_auto)
            if resultado == "quit":
                break
            input(f"\n  {DM}Presiona ENTER para volver al menú...{R}")

        elif opcion == "3":
            sena = seleccionar_sena()
            if sena:
                limpiar()
                mostrar_cabecera()
                resultado = iniciar_recoleccion(service, cap, camara_auto, sena_inicio=sena)
                if resultado == "quit":
                    break
                input(f"\n  {DM}Presiona ENTER para volver al menú...{R}")

    if cap is not None:
        cap.release()
        cv2.destroyAllWindows()
    if service is not None:
        service.cerrar()


if __name__ == "__main__":
    main()
