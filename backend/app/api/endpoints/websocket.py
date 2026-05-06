# ============================================================
#  Endpoint WebSocket — Comunicación en tiempo real
#  ws://localhost:8000/ws
# ============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.mediapipe_service import MediaPipeService
from app.services.sign_classifier_service import SignClassifierService
from collections import deque, Counter
import json
import traceback
import time

router = APIRouter()

_mediapipe_servicio: MediaPipeService | None = None
_classifier_servicio: SignClassifierService | None = None

def get_mediapipe_servicio() -> MediaPipeService:
    global _mediapipe_servicio
    if _mediapipe_servicio is None:
        print("🔄 Inicializando MediaPipe Holistic (primera vez)…")
        _mediapipe_servicio = MediaPipeService(
            min_detection_confidence=0.40,   # Holistic necesita umbral más bajo que Hands
            min_tracking_confidence=0.30,    # tracking bajo: mantiene manos en orientaciones difíciles
        )
        print("✅ MediaPipe Holistic listo.")
    return _mediapipe_servicio

def get_classifier_servicio() -> SignClassifierService:
    global _classifier_servicio
    if _classifier_servicio is None:
        print("🔄 Inicializando Clasificador LSC (primera vez)…")
        _classifier_servicio = SignClassifierService()
        print("✅ Clasificador LSC listo.")
    return _classifier_servicio


MIN_HAND_STREAK     = 2     # frames seguidos con mano antes de empezar a predecir
NO_HAND_RESET_AFTER = 5     # frames sin mano antes de limpiar buffer
RAW_CONF_MIN        = 0.45  # confianza mínima para entrar en la ventana de votación
CONF_THRESHOLD      = 0.70  # confianza promedio mínima para confirmar
ENTROPY_THRESHOLD   = 0.42  # entropía máxima aceptable
MARGIN_MIN          = 0.12  # gap mínimo entre top-1 y top-2
PRED_WINDOW_SIZE    = 2     # votos necesarios para confirmar una seña (ventana de 2 frames)
MIN_VOTES           = 2     # votos mínimos del ganador (requiere unanimidad 2/2)
EMA_ALPHA           = 0.65  # peso del frame actual en el suavizado EMA de keypoints

LOG_SUMMARY_EVERY   = 20


def _adaptive_cooldown(conf: float) -> int:
    """Cooldown adaptativo: mayor confianza → más corto (detección más fluida)."""
    if conf >= 0.92:
        return 3   # ~150ms — muy seguro, pasa rápido a la siguiente seña
    if conf >= 0.80:
        return 5   # ~250ms — normal
    return 8       # ~400ms — borderline, da tiempo para limpiar el gesto


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("\n" + "="*60)
    print("✅ Cliente conectado")
    print("="*60)

    mp_servicio = get_mediapipe_servicio()
    classifier  = get_classifier_servicio()
    buffer      = classifier.create_buffer()

    pred_history: deque = deque(maxlen=PRED_WINDOW_SIZE)
    no_hand_frames   = 0
    hand_streak      = 0
    cooldown_counter = 0

    # ── Última seña confirmada (para mantenerla en pantalla) ──
    last_sign        = None
    last_conf        = 0.0

    # ── EMA smoothing de keypoints entre frames ──
    kp_ema: list | None = None

    # ── Contadores para estadísticas periódicas ──
    frame_n          = 0
    detected_frames  = 0
    mp_times         = []
    cls_times        = []
    prev_hand_state  = False

    try:
        while True:
            try:
                data = await websocket.receive()
            except RuntimeError:
                break

            if data.get("type") == "websocket.disconnect":
                break

            if not ("bytes" in data and data["bytes"]):
                if "text" in data and data["text"]:
                    try:
                        msg = json.loads(data["text"])
                        if msg.get("type") == "ping":
                            await websocket.send_text(json.dumps({"type": "pong"}))
                    except Exception:
                        pass
                continue

            frame_n += 1

            # ── MediaPipe ─────────────────────────────────────────
            t0 = time.monotonic()
            keypoints = mp_servicio.procesar_frame(data["bytes"])
            mp_ms = (time.monotonic() - t0) * 1000
            mp_times.append(mp_ms)

            if keypoints:
                detected_frames += 1
                no_hand_frames   = 0
                hand_streak     += 1
                hand2_kps        = keypoints[63:126]
                hands_count      = 2 if any(k != 0.0 for k in hand2_kps) else 1

                if not prev_hand_state:
                    print(f"\n[MANO+]  frame={frame_n}  manos={hands_count}  mp={mp_ms:.0f}ms")
                prev_hand_state = True

                # ── EMA smoothing: suaviza jitter de MediaPipe entre frames ─
                if kp_ema is None:
                    kp_ema = list(keypoints)
                else:
                    kp_ema = [EMA_ALPHA * c + (1.0 - EMA_ALPHA) * p
                               for c, p in zip(keypoints, kp_ema)]
                kp_smooth = kp_ema

                predicted_sign = None
                confidence     = 0.0

                if hand_streak >= MIN_HAND_STREAK:
                    # Usar keypoints suavizados para el buffer del clasificador
                    classifier.add_frame_to_buffer(buffer, kp_smooth)
                    buf_len = len(buffer)

                    if buf_len >= classifier.sequence_length:
                        if cooldown_counter > 0:
                            cooldown_counter -= 1
                            if cooldown_counter % 4 == 0:
                                print(
                                    f"[CD]     cooldown={cooldown_counter:>2}  "
                                    f"({cooldown_counter/20*1000:.0f} ms restantes)"
                                )
                        else:
                            # ── Clasificador ─────────────────────
                            t1 = time.monotonic()
                            raw_sign, raw_conf, raw_entropy, raw_margin = classifier.predict_from_buffer(buffer)
                            cls_ms = (time.monotonic() - t1) * 1000
                            cls_times.append(cls_ms)

                            passed_conf    = raw_conf    >= RAW_CONF_MIN
                            passed_entropy = raw_entropy <= ENTROPY_THRESHOLD
                            passed_margin  = raw_margin  >= MARGIN_MIN
                            accepted       = raw_sign is not None and passed_conf and passed_entropy and passed_margin

                            if not accepted:
                                if raw_sign is None:
                                    reason = "sin_signo"
                                elif not passed_conf:
                                    reason = f"conf_baja({raw_conf:.2f}<{RAW_CONF_MIN})"
                                elif not passed_entropy:
                                    reason = f"entropia_alta({raw_entropy:.3f}>{ENTROPY_THRESHOLD})"
                                else:
                                    reason = f"margen_bajo({raw_margin:.3f}<{MARGIN_MIN})"
                                print(
                                    f"[RECH]   sign={raw_sign}  conf={raw_conf:.2f}  "
                                    f"ent={raw_entropy:.3f}  mrg={raw_margin:.3f}  "
                                    f"cls={cls_ms:.0f}ms  → {reason}"
                                )
                            else:
                                pred_history.append((raw_sign, raw_conf))
                                print(
                                    f"[VOTO]   sign={raw_sign}  conf={raw_conf:.2f}  "
                                    f"ent={raw_entropy:.3f}  mrg={raw_margin:.3f}  "
                                    f"cls={cls_ms:.0f}ms  "
                                    f"historial=[{len(pred_history)}/{PRED_WINDOW_SIZE}]"
                                )

                            # ── Votación (requiere mayoría MIN_VOTES/PRED_WINDOW_SIZE) ──
                            if len(pred_history) == PRED_WINDOW_SIZE:
                                signs        = [p[0] for p in pred_history]
                                winner       = Counter(signs).most_common(1)[0][0]
                                winner_confs = [p[1] for p in pred_history if p[0] == winner]
                                avg_conf     = sum(winner_confs) / len(winner_confs)
                                votes        = signs.count(winner)

                                if votes >= MIN_VOTES and avg_conf >= CONF_THRESHOLD:
                                    predicted_sign   = winner
                                    confidence       = avg_conf
                                    last_sign        = winner
                                    last_conf        = avg_conf
                                    pred_history.clear()
                                    cd = _adaptive_cooldown(avg_conf)
                                    cooldown_counter = cd
                                    print(
                                        f"\n{'='*50}\n"
                                        f"[PRED ✅] sign={predicted_sign}  "
                                        f"conf={confidence:.2f}  "
                                        f"votos={votes}/{PRED_WINDOW_SIZE}\n"
                                        f"  → cooldown={cd} frames ({cd/20*1000:.0f} ms)\n"
                                        f"{'='*50}"
                                    )
                                else:
                                    if votes < MIN_VOTES:
                                        reason_v = f"votos_insuf({votes}<{MIN_VOTES})"
                                    else:
                                        reason_v = f"conf_insuf({avg_conf:.2f}<{CONF_THRESHOLD})"
                                    print(
                                        f"[VOTO❌] ganador={winner}  avg_conf={avg_conf:.2f}  "
                                        f"votos={votes}/{PRED_WINDOW_SIZE}  → {reason_v}"
                                    )
                                    pred_history.clear()

                respuesta = {
                    "hand_detected":   True,
                    "hands_count":     hands_count,
                    "num_keypoints":   len(keypoints),
                    "predicted_sign":  predicted_sign,
                    "confidence":      confidence,
                    "buffer_progress": round(len(buffer) / classifier.sequence_length, 2),
                    "keypoints":       keypoints,   # sin suavizar (display del skeleton)
                }

            else:
                # ── Sin mano ─────────────────────────────────────
                no_hand_frames += 1
                hand_streak     = 0
                kp_ema          = None  # reset EMA al perder la mano

                if prev_hand_state:
                    print(
                        f"\n[MANO-]  frame={frame_n}  "
                        f"mp={mp_ms:.0f}ms  (no_hand_frames=1)"
                    )
                prev_hand_state = False

                if no_hand_frames >= NO_HAND_RESET_AFTER:
                    if no_hand_frames == NO_HAND_RESET_AFTER:
                        print(
                            f"[RESET]  {no_hand_frames} frames sin mano  "
                            f"→ buffer y historial limpiados"
                        )
                    buffer.clear()
                    pred_history.clear()
                    last_sign = None
                    last_conf = 0.0

                respuesta = {
                    "hand_detected":   False,
                    "hands_count":     0,
                    "num_keypoints":   0,
                    "predicted_sign":  None,
                    "confidence":      0.0,
                    "buffer_progress": 0.0,
                    "keypoints":       [],
                }

            # ── Alerta de lentitud ────────────────────────────────
            if mp_ms > 80:
                print(f"[LENTO ⚠] MediaPipe tardó {mp_ms:.0f} ms (frame {frame_n})")

            # ── Resumen periódico ─────────────────────────────────
            if LOG_SUMMARY_EVERY and frame_n % LOG_SUMMARY_EVERY == 0:
                detect_rate = detected_frames / frame_n * 100
                avg_mp  = sum(mp_times[-LOG_SUMMARY_EVERY:])  / len(mp_times[-LOG_SUMMARY_EVERY:])
                avg_cls = (sum(cls_times[-20:]) / len(cls_times[-20:])) if cls_times else 0.0
                print(
                    f"\n[STATS #{frame_n}]  "
                    f"detección={detect_rate:.0f}%  "
                    f"streak={hand_streak}  "
                    f"buf={len(buffer)}/{classifier.sequence_length}  "
                    f"cd={cooldown_counter}  "
                    f"hist={len(pred_history)}/{PRED_WINDOW_SIZE}  "
                    f"│ mp={avg_mp:.0f}ms  cls={avg_cls:.0f}ms"
                )

            try:
                await websocket.send_text(json.dumps(respuesta))
            except Exception:
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        traceback.print_exc()
    finally:
        total_time = frame_n / 20 if frame_n else 0
        print(
            f"\n[FIN]  frames={frame_n}  "
            f"detección={detected_frames/frame_n*100:.0f}%  "
            f"tiempo≈{total_time:.0f}s"
            if frame_n else "\n[FIN]  0 frames procesados"
        )
        print("👋 Cliente desconectado\n")