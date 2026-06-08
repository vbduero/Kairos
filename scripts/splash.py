"""Splash animation for Kairos console scripts with new colour palette.

Uses the shared `style_utils` module for colour handling and the gradient logo.
"""
import sys
import time
import os
import pathlib
# Import shared style utilities
import style_utils as su

# Ensure ANSI support on Windows
if sys.platform == "win32":
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)

# ── ANSI ──────────────────────────────────────────────────
RS = "\033[0m"
BD = "\033[1m"
DM = "\033[2m"
CY = "\033[96m"
GR = "\033[92m"
YL = "\033[93m"
BL = "\033[94m"
RD = "\033[91m"
MG = "\033[95m"
BG_DK = "\033[40m"

# Logo will be rendered by `style_utils.print_logo()`
# The original hand ASCII art has been removed.

# Frames del spinner braille
SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]


def limpiar():
    os.system("cls" if sys.platform == "win32" else "clear")


def typewriter(text, color="", delay=0.018, indent="  "):
    print(indent, end="")
    for ch in text:
        sys.stdout.write(f"{color}{ch}{RS}")
        sys.stdout.flush()
        time.sleep(delay)
    print()


def spinner_paso(msg, duracion=0.8, color=CY):
    fin = time.time() + duracion
    i = 0
    while time.time() < fin:
        sys.stdout.write(f"\r  {color}{SPINNER[i % len(SPINNER)]}{RS}  {msg}")
        sys.stdout.flush()
        time.sleep(0.08)
        i += 1
    sys.stdout.write(f"\r  {GR}✔{RS}  {msg}\n")
    sys.stdout.flush()


def barra_carga(color=CY, largo=40, delay=0.03):
    sys.stdout.write(f"  {DM}[{RS}")
    for i in range(largo):
        pct = int((i + 1) / largo * 100)
        bloque = f"{color}{'█' * (i + 1)}{DM}{'░' * (largo - i - 1)}{RS}"
        sys.stdout.write(f"\r  [{bloque}] {color}{pct:>3}%{RS}")
        sys.stdout.flush()
        time.sleep(delay)
    print()


# Removed old hand animation function; logo rendered via style_utils.print_logo()


def main():
    role = sys.argv[1].lower() if len(sys.argv) > 1 else "backend"

    if role == "backend":
        color   = BL
        titulo  = "SERVIDOR BACKEND"
        subtit  = "FastAPI  ·  MediaPipe  ·  TensorFlow Lite"
        pasos   = [
            "Activando entorno virtual",
            "Cargando TensorFlow Lite",
            "Inicializando MediaPipe",
            "Preparando clasificador LSTM",
            "Levantando servidor FastAPI",
        ]
        puerto  = "http://localhost:8000"
    else:
        color   = GR
        titulo  = "SERVIDOR FRONTEND"
        subtit  = "React  ·  Vite  ·  TailwindCSS"
        pasos   = [
            "Verificando dependencias npm",
            "Compilando módulos React",
            "Cargando componentes UI",
            "Preparando traductor LSC",
            "Levantando servidor Vite",
        ]
        puerto  = "http://localhost:5173"

    ancho = 54

    limpiar()

    # Mano animada
    su.print_logo()
    time.sleep(0.1)

    # Cabecera
    print(f"\n  {color}{'═' * ancho}{RS}")
    typewriter(f"KAIROS  —  {titulo}", color=BD + color, delay=0.025)
    print(f"  {DM}{subtit:^{ancho}}{RS}")
    print(f"  {color}{'═' * ancho}{RS}\n")
    time.sleep(0.2)

    # Pasos de carga
    for paso in pasos:
        spinner_paso(paso, duracion=0.55, color=color)
        time.sleep(0.06)

    print()

    # Barra final
    barra_carga(color=color, largo=ancho - 2, delay=0.018)

    # Listo
    print(f"\n  {BD}{GR}✔  Todo listo{RS}  {DM}→{RS}  {BD}{color}{puerto}{RS}")
    print(f"  {DM}{'─' * ancho}{RS}\n")
    time.sleep(0.4)


if __name__ == "__main__":
    main()
