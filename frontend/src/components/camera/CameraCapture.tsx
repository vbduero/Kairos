import React, { useEffect, useRef, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useWebSocket } from '../../hooks/useWebSocket';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const SkeletonOverlay: React.FC<{ keypoints: number[] }> = ({ keypoints }) => {
  if (!keypoints || keypoints.length === 0) return null;
  const hand1 = keypoints.slice(0, 63);
  const hand2 = keypoints.slice(63, 126);

  const renderHand = (handKp: number[], color: string) => {
    if (handKp[0] === 0 && handKp[1] === 0) return null;
    const points = [];
    for (let i = 0; i < 21; i++) {
      const z = handKp[i * 3 + 2];
      const radius = Math.max(3, Math.min(8, 5 - (z * 40)));
      points.push({
        x: handKp[i * 3] * 100,
        y: handKp[i * 3 + 1] * 100,
        r: radius,
        isFingertip: [4, 8, 12, 16, 20].includes(i)
      });
    }

    return (
      <g>
        {HAND_CONNECTIONS.map(([start, end], idx) => (
          <line
            key={`bone-${idx}`}
            x1={`${points[start].x}%`} y1={`${points[start].y}%`}
            x2={`${points[end].x}%`}   y2={`${points[end].y}%`}
            stroke={color} strokeWidth={points[end].r * 1.2} strokeOpacity="0.8" strokeLinecap="round"
          />
        ))}
        {points.map((p, idx) => !p.isFingertip && (
          <circle
            key={`joint-${idx}`}
            cx={`${p.x}%`} cy={`${p.y}%`}
            r={p.r} fill="#FFFFFF" stroke={color} strokeWidth="2"
          />
        ))}
        {points.map((p, idx) => p.isFingertip && (
          <circle
            key={`tip-${idx}`}
            cx={`${p.x}%`} cy={`${p.y}%`}
            r={p.r + 3} fill="#FFE600" stroke={color} strokeWidth="3"
          />
        ))}
      </g>
    );
  };

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
      {renderHand(hand1, '#00C9A7')} {/* Mint Cyan */}
      {renderHand(hand2, '#005B96')} {/* Deep Blue */}
    </svg>
  );
};

export const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, response, startSendingFrames, stopSendingFrames } = useWebSocket();
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [lastPrediction, setLastPrediction] = useState<string | null>(null);
  const lastSpokenRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (isActive && isConnected && stream && videoRef.current) {
      startSendingFrames(videoRef.current);
    }
    return () => stopSendingFrames();
  }, [isActive, isConnected, stream, startSendingFrames, stopSendingFrames]);

  useEffect(() => {
    if (!response || !response.predicted_sign) return;
    const sign = response.predicted_sign;
    
    // Ignore if not detected or low confidence
    if (!response.hand_detected || response.confidence < 0.6) return;

    setLastPrediction(prev => {
      if (prev !== sign) {
        setTranscript(t => {
          const newT = [...t, sign];
          return newT.length > 5 ? newT.slice(1) : newT; // Keep it short for kids
        });
        return sign;
      }
      return prev;
    });
  }, [response]);

  useEffect(() => {
    if (!ttsEnabled || !lastPrediction) return;
    const text = lastPrediction.replace(/_/g, ' ');
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-ES';
    utt.pitch = 1.2; // Slightly higher pitch for kids
    utt.rate = 0.9;  // Slightly slower
    window.speechSynthesis.speak(utt);
  }, [lastPrediction, ttsEnabled]);

  const clearTranscript = () => {
    setTranscript([]);
    setLastPrediction(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'stretch' }}>
      
      {/* ── Left: Camera with playful border ── */}
      <div style={{ 
        position: 'relative', 
        aspectRatio: '16/9', 
        background: '#FFFFFF', 
        borderRadius: '32px', 
        overflow: 'hidden',
        border: '6px solid #FFFFFF',
        boxShadow: '0 24px 48px rgba(0, 91, 150, 0.12), 0 8px 16px rgba(0, 201, 167, 0.08)',
      }}>
        {!isActive ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F0F9FF', gap: 20 }}>
              <div style={{ fontSize: 64 }}>📸</div>
              <button onClick={startCamera} style={{ 
                padding: '16px 36px', background: '#00C9A7', color: 'white', 
                borderRadius: '999px', fontSize: 22, fontWeight: 900, fontFamily: 'Nunito',
                border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0, 201, 167, 0.4)',
                transform: 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                ¡Encender Cámara!
              </button>
            </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            <SkeletonOverlay keypoints={response?.keypoints ?? []} />
          </>
        )}
      </div>

      {/* ── Right: Playful Transcription Panel ── */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: 24
      }}>
        
        {/* GIANT Current Letter Box */}
        <div style={{ 
          background: '#FFFFFF', 
          borderRadius: '32px', 
          padding: '32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 36px rgba(0, 91, 150, 0.08)',
          border: '4px solid #E0F2FE',
          minHeight: '280px',
          position: 'relative', overflow: 'hidden'
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#005B96', margin: 0, position: 'absolute', top: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
            Estás haciendo:
          </h3>
          
          {lastPrediction ? (
            <div style={{
              fontSize: lastPrediction.length > 1 ? '60px' : '140px', 
              fontWeight: 900, 
              color: '#0A1F44',
              lineHeight: 1,
              textTransform: 'uppercase',
              textShadow: '0 8px 16px rgba(0,201,167,0.2)',
              marginTop: 20,
              animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              {lastPrediction.replace(/_/g, ' ')}
            </div>
          ) : (
            <div style={{ fontSize: 80, opacity: 0.2, filter: 'grayscale(1)', marginTop: 20 }}>🤔</div>
          )}
        </div>

        {/* Playful History & Controls */}
        <div style={{ 
          background: '#FFFFFF', borderRadius: '32px', padding: '24px', flex: 1,
          boxShadow: '0 12px 36px rgba(0, 91, 150, 0.08)', border: '4px solid #E0F2FE',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#005B96', margin: 0 }}>Historial</h3>
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              style={{
                fontSize: 24, background: ttsEnabled ? '#E0F2FE' : '#F1F5F9', border: 'none', 
                borderRadius: '50%', width: 48, height: 48, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: ttsEnabled ? '0 4px 12px rgba(0, 91, 150, 0.2)' : 'none'
              }}
              title={ttsEnabled ? "Voz Activada" : "Voz Desactivada"}
            >
              {ttsEnabled ? '🔊' : '🔇'}
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {transcript.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 20, fontWeight: 600 }}>Aún no hay señas...</p>
            ) : (
              transcript.map((word, i) => (
                <div key={i} style={{ 
                  padding: '12px 20px', background: '#F0F9FF', 
                  borderRadius: '24px', alignSelf: 'flex-start',
                  color: '#0A1F44', fontSize: 18, fontWeight: 800,
                  border: '2px solid #BAE6FD'
                }}>
                  {word.replace(/_/g, ' ')}
                </div>
              ))
            )}
          </div>
          
          <button onClick={clearTranscript} style={{ 
            marginTop: 16, padding: '12px', background: '#F1F5F9', borderRadius: '16px', 
            color: '#64748B', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer' 
          }}>
            🧹 Borrar todo
          </button>
        </div>

      </div>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
