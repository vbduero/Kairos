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
        print("🔄 Inicializando MediaPipe (primera vez)…")
        _mediapipe_servicio = MediaPipeService()
        print("✅ MediaPipe listo.")
    return _mediapipe_servicio

def get_classifier_servicio() -> SignClassifierService:
    global _classifier_servicio
    if _classifier_servicio is None:
        print("🔄 Inicializando Clasificador LSC (primera vez)…")
        _classifier_servicio = SignClassifierService()
        print("✅ Clasificador LSC listo.")
    return _classifier_servicio


MIN_HAND_STREAK     = 3    # espera 3 frames seguidos antes de predecir (evita falsas detecciones al aparecer la mano)
NO_HAND_RESET_AFTER = 6    # frames sin mano antes de limpiar buffer (evita reset por pérdidas momentáneas)
RAW_CONF_MIN        = 0.40
CONF_THRESHOLD      = 0.75
ENTROPY_THRESHOLD   = 0.45
COOLDOWN_FRAMES     = 12   # frames de espera tras una predicción (~600ms a 20fps)
PRED_WINDOW_SIZE    = 1    # 1 voto es suficiente para confirmar

LOG_SUMMARY_EVERY   = 20


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
                hand2_kps        = keypoints[63:]
                hands_count      = 2 if any(k != 0.0 for k in hand2_kps) else 1

                if not prev_hand_state:
                    print(f"\n[MANO+]  frame={frame_n}  manos={hands_count}  mp={mp_ms:.0f}ms")
                prev_hand_state = True

                predicted_sign = None
                confidence     = 0.0

                if hand_streak >= MIN_HAND_STREAK:
                    classifier.add_frame_to_buffer(buffer, keypoints)
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
                            raw_sign, raw_conf, raw_entropy = classifier.predict_from_buffer(buffer)
                            cls_ms = (time.monotonic() - t1) * 1000
                            cls_times.append(cls_ms)

                            passed_conf    = raw_conf    >= RAW_CONF_MIN
                            passed_entropy = raw_entropy <= ENTROPY_THRESHOLD
                            accepted       = raw_sign is not None and passed_conf and passed_entropy

                            if not accepted:
                                if raw_sign is None:
                                    reason = "sin_signo"
                                elif not passed_conf:
                                    reason = f"conf_baja({raw_conf:.2f}<{RAW_CONF_MIN})"
                                else:
                                    reason = f"entropia_alta({raw_entropy:.3f}>{ENTROPY_THRESHOLD})"
                                print(
                                    f"[RECH]   sign={raw_sign}  conf={raw_conf:.2f}  "
                                    f"ent={raw_entropy:.3f}  cls={cls_ms:.0f}ms  → {reason}"
                                )
                            else:
                                pred_history.append((raw_sign, raw_conf))
                                print(
                                    f"[VOTO]   sign={raw_sign}  conf={raw_conf:.2f}  "
                                    f"ent={raw_entropy:.3f}  cls={cls_ms:.0f}ms  "
                                    f"historial=[{len(pred_history)}/{PRED_WINDOW_SIZE}]"
                                )

                            # ── Votación ─────────────────────────
                            if len(pred_history) == PRED_WINDOW_SIZE:
                                signs        = [p[0] for p in pred_history]
                                winner       = Counter(signs).most_common(1)[0][0]
                                winner_confs = [p[1] for p in pred_history if p[0] == winner]
                                avg_conf     = sum(winner_confs) / len(winner_confs)
                                votes        = signs.count(winner)

                                if avg_conf >= CONF_THRESHOLD:
                                    predicted_sign   = winner
                                    confidence       = avg_conf
                                    last_sign        = winner      # ✅ guarda última seña
                                    last_conf        = avg_conf
                                    # ✅ NO limpiar buffer: mantiene frames para predicción continua
                                    pred_history.clear()
                                    cooldown_counter = COOLDOWN_FRAMES
                                    print(
                                        f"\n{'='*50}\n"
                                        f"[PRED ✅] sign={predicted_sign}  "
                                        f"conf={confidence:.2f}  "
                                        f"votos={votes}/{PRED_WINDOW_SIZE}\n"
                                        f"  → buffer conservado | cooldown={COOLDOWN_FRAMES} frames "
                                        f"({COOLDOWN_FRAMES/20*1000:.0f} ms)\n"
                                        f"{'='*50}"
                                    )
                                else:
                                    print(
                                        f"[VOTO❌] ganador={winner}  avg_conf={avg_conf:.2f}  "
                                        f"votos={votes}/{PRED_WINDOW_SIZE}  "
                                        f"→ conf insuficiente (< {CONF_THRESHOLD})"
                                    )
                                    pred_history.clear()

                respuesta = {
                    "hand_detected":   True,
                    "hands_count":     hands_count,
                    "num_keypoints":   len(keypoints),
                    "predicted_sign":  predicted_sign,
                    "confidence":      confidence,
                    "buffer_progress": round(len(buffer) / classifier.sequence_length, 2),
                }

            else:
                # ── Sin mano ─────────────────────────────────────
                no_hand_frames += 1
                hand_streak     = 0

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
                    # ✅ limpiar última seña solo cuando la mano desaparece de verdad
                    last_sign = None
                    last_conf = 0.0

                respuesta = {
                    "hand_detected":   False,
                    "hands_count":     0,
                    "num_keypoints":   0,
                    "predicted_sign":  None,
                    "confidence":      0.0,
                    "buffer_progress": 0.0,
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