# scripts/style_utils.py
"""Utility functions for consistent colour output across Kairos console scripts.

Provides:
- `color_text(text, fg=None, bg=None, bold=False)`: Return text wrapped in ANSI
  24‑bit colour codes. Falls back to basic 8‑colour codes if the terminal does not
  support true‑color.
- `print_logo()`: Render the Kairos logo – a stylised "K" with a gradient that
  matches the colour palette requested by the user:
    * Dark navy – left side / "K"
    * Sky‑turquoise – middle gradient
    * Mint / emerald – right / top side
  The logo is printed using `color_text`.
- `supports_truecolor()`: Detect true‑color support via the COLORTERM env var or
  `tput colors`.
"""
import os
import sys

# ---------- Colour detection ----------

def supports_truecolor() -> bool:
    """Return True if the terminal likely supports 24‑bit colour.
    Checks the COLORTERM env var ("truecolor"/"24bit") or the output of
    `tput colors` (>= 256)."""
    if os.getenv("COLORTERM", "").lower() in {"truecolor", "24bit"}:
        return True
    try:
        colors = int(os.popen("tput colors").read().strip())
        return colors >= 256
    except Exception:
        return False

# ---------- Basic colour helpers ----------
_RESET = "\033[0m"
_BOLD = "\033[1m"

# 24‑bit colour helper (foreground)
def _fg_24(r: int, g: int, b: int) -> str:
    return f"\033[38;2;{r};{g};{b}m"

# Fallback 8‑colour codes (foreground)
_FG_BASIC = {
    "black": "\033[30m",
    "red": "\033[31m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "blue": "\033[34m",
    "magenta": "\033[35m",
    "cyan": "\033[36m",
    "white": "\033[37m",
}

def color_text(text: str, fg: str | tuple[int, int, int] = None, *, bg: str | tuple[int, int, int] = None, bold: bool = False) -> str:
    """Wrap *text* with ANSI colour codes.
    *fg* can be a colour name or an RGB tuple. *bg* works similarly (not used).
    If true‑color is unavailable, colour names fall back to the 8‑colour set.
    """
    parts = []
    if bold:
        parts.append(_BOLD)
    if fg:
        if isinstance(fg, tuple):
            if supports_truecolor():
                parts.append(_fg_24(*fg))
            else:
                # Approximate to a basic colour – pick white as safe fallback.
                parts.append(_FG_BASIC.get("white", ""))
        else:
            parts.append(_FG_BASIC.get(fg.lower(), ""))
    if bg:
        # Background 24‑bit not required for current designs.
        pass
    parts.append(text)
    parts.append(_RESET)
    return "".join(parts)

# Palette constants (RGB)
_DARK_BLUE = (10, 31, 68)   # #0A1F44
_TURQUOISE = (111, 216, 240)  # #6FD8F0
_MINT = (0, 201, 167)     # #00C9A7
_WHITE = (255, 255, 255)   # #FFFFFF

# ---------- Logo rendering ----------

def _lerp_color(c1: tuple, c2: tuple, t: float) -> tuple:
    """Linearly interpolate between two RGB tuples (0 ≤ t ≤ 1)."""
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def print_logo(animate: bool = True) -> None:
    """Print the Kairos logo: an hourglass with a smooth gradient.

    The hourglass symbolises Kairos (Καιρός) — "the opportune moment" in Greek.
    Colours flow from dark navy (top) → turquoise (middle) → mint (bottom).
    The word KAIRÓS is printed centred below the figure.
    """
    import time

    # ── Hourglass ASCII art (Perfectly Symmetrical) ───────────
    logo_lines = [
        "      ╔══════════════════════════╗",
        "      ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║",
        "        ╚══╗ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ╔══╝",
        "          ╚══╗ ▓▓▓▓▓▓▓▓▓▓ ╔══╝",
        "            ╚══╗ ▓▓▓▓▓▓ ╔══╝",
        "              ╚══╗ ▓▓ ╔══╝",
        "                 ╚════╝",
        "                 ╔════╗",
        "              ╔══╝ ░░ ╚══╗",
        "            ╔══╝ ░░░░░░ ╚══╗",
        "          ╔══╝ ░░░░░░░░░░ ╚══╗",
        "        ╔══╝ ░░░░░░░░░░░░░░ ╚══╗",
        "      ║ ░░░░░░░░░░░░░░░░░░░░░░░░ ║",
        "      ╚══════════════════════════╝",
    ]

    total = len(logo_lines)
    for i, line in enumerate(logo_lines):
        t = i / max(total - 1, 1)          # 0.0 → 1.0
        if t <= 0.5:
            fg = _lerp_color(_DARK_BLUE, _TURQUOISE, t * 2)
        else:
            fg = _lerp_color(_TURQUOISE, _MINT, (t - 0.5) * 2)
        
        sys.stdout.write("  " + color_text(line, fg=fg, bold=True) + "\n")
        sys.stdout.flush()

        if animate:
            time.sleep(0.04)

    # Title line perfectly centred
    title = "★  K  A  I  R  Ó  S  ★"
    prefix = " " * 11

    sys.stdout.write("\n")
    if animate:
        time.sleep(0.12)
        # Typewriter effect for the title
        sys.stdout.write("  " + prefix)
        for ch in title:
            sys.stdout.write(color_text(ch, fg=_WHITE, bold=True))
            sys.stdout.flush()
            time.sleep(0.03)
        sys.stdout.write("\n")
    else:
        sys.stdout.write("  " + color_text(prefix + title, fg=_WHITE, bold=True) + "\n")

    sys.stdout.write("\n")
    sys.stdout.flush()

if __name__ == "__main__":
    print_logo()
