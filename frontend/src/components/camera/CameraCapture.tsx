import React, { useEffect, useRef } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Camera } from 'lucide-react';
import { statsService } from '../../services/statsService';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const SkeletonOverlay: React.FC<{ keypoints: number[] }> = ({ keypoints }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set actual canvas resolution to match its display size for crisp rendering
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (!keypoints || keypoints.length === 0) return;

    const hand1 = keypoints.slice(0, 63);
    const hand2 = keypoints.slice(63, 126);

    const drawHand = (handKp: number[], primaryColor: string, secondaryColor: string) => {
      if (handKp[0] === 0 && handKp[1] === 0) return;
      
      const points: {x: number, y: number, z: number}[] = [];
      for (let i = 0; i < 21; i++) {
        points.push({
          x: handKp[i * 3] * width,
          y: handKp[i * 3 + 1] * height,
          z: handKp[i * 3 + 2]
        });
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Dibujar resplandor exterior (hueso ancho y semitransparente)
      ctx.beginPath();
      HAND_CONNECTIONS.forEach(([start, end]) => {
        ctx.moveTo(points[start].x, points[start].y);
        ctx.lineTo(points[end].x, points[end].y);
      });
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.25;
      ctx.stroke();

      // 2. Dibujar núcleo del hueso (línea fina brillante)
      ctx.beginPath();
      HAND_CONNECTIONS.forEach(([start, end]) => {
        ctx.moveTo(points[start].x, points[start].y);
        ctx.lineTo(points[end].x, points[end].y);
      });
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.globalAlpha = 1.0;

      // 3. Dibujar Articulaciones Complejas (Estilo AR / HUD)
      points.forEach((p, idx) => {
        const isFingertip = [4, 8, 12, 16, 20].includes(idx);
        const isWrist = idx === 0;
        
        if (isFingertip) {
          // Puntas de los dedos: Punto central sólido con anillo exterior flotante
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = primaryColor;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isWrist) {
          // Muñeca: Círculo más grande
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          // Nodos internos: Punto blanco brillante con borde del color de la mano
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    };

    // Colores de alta tecnología para el HUD (Holograma)
    drawHand(hand1, '#0ea5e9', '#0284c7'); // Azul Cian Tecnológico
    drawHand(hand2, '#10b981', '#059669'); // Verde Esmeralda (Contraste)
  }, [keypoints]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

interface CameraCaptureProps {
  onSignDetected: (sign: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onSignDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, startCamera, stopCamera, isActive } = useCamera();
  const { isConnected, response, startSendingFrames, stopSendingFrames } = useWebSocket();

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

  // Log usage time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => {
        statsService.logTime(10); // Log 10 seconds of usage
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const lastFailedLog = useRef<{ sign: string, time: number }>({ sign: '', time: 0 });

  useEffect(() => {
    if (!response || !response.predicted_sign) return;
    const sign = response.predicted_sign;
    
    // Ignore if not detected
    if (!response.hand_detected) return;

    if (response.confidence < 0.6) {
      // Log failed attempt silently, but throttle to max once per 2 seconds per sign to avoid spam
      const now = Date.now();
      if (sign !== lastFailedLog.current.sign || (now - lastFailedLog.current.time) > 2000) {
        statsService.logFailedAttempt(sign.replace(/_/g, ' '), response.confidence);
        lastFailedLog.current = { sign, time: now };
      }
      return;
    }
    
    onSignDetected(sign.replace(/_/g, ' '));
  }, [response, onSignDetected]);

  return (
    <div className="relative w-full h-full bg-white/60 rounded-[2.5rem] overflow-hidden border-none backdrop-blur-xl">
      {!isActive ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/90 gap-6">
          <div className="p-6 rounded-full bg-white shadow-sm border border-slate-200">
            <Camera className="w-12 h-12 text-[#0f766e]" />
          </div>
          <button 
            onClick={startCamera} 
            className="px-8 py-4 bg-gradient-to-r from-[#0f766e] to-[#3b82f6] text-white rounded-full text-lg font-bold shadow-md hover:shadow-lg transition-all transform hover:scale-105"
          >
            Encender Cámara
          </button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
          <SkeletonOverlay keypoints={response?.keypoints ?? []} />
          
          {/* Active indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full border border-slate-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#0f766e] animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">Cámara Activa</span>
          </div>
        </>
      )}
    </div>
  );
};
