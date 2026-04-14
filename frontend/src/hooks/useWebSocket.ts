import { useState, useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '../store/uiStore';

// ── Tipos del mensaje que devuelve el backend ──
export interface WebSocketResponse {
  hand_detected: boolean;
  hands_count: number;
  num_keypoints: number;
  predicted_sign: string | null;
  confidence: number;
  buffer_progress: number;
  // 126 floats crudos de MediaPipe: [x,y,z] × 21 landmarks × 2 manos.
  // Vacío cuando no hay mano detectada.
  keypoints: number[];
}

interface UseWebSocketReturn {
  isConnected: boolean;
  response: WebSocketResponse | null;
  startSendingFrames: (videoElement: HTMLVideoElement) => void;
  stopSendingFrames: () => void;
}

const WS_URL = 'ws://localhost:8000/ws';

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [response, setResponse] = useState<WebSocketResponse | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      useUiStore.getState().addToast('Conexión establecida con el servidor AI', 'success');
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketResponse = JSON.parse(event.data);
        setResponse(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting in 3s...');
      
      // Only toast if it was previously connected, to avoid spamming on load
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        useUiStore.getState().addToast('Conexión perdida. Reconectando...', 'error');
      } else if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        // If it fails to connect entirely
        useUiStore.getState().addToast('Intentando reconectar con el servidor AI...', 'info');
      }

      setIsConnected(false);
      stopSendingFrames();
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    canvasRef.current = document.createElement('canvas');
    return () => {
      stopSendingFrames();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const startSendingFrames = useCallback((videoElement: HTMLVideoElement) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected.');
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Limitar a 640×480: resoluciones mayores no mejoran MediaPipe y aumentan latencia
    canvas.width  = Math.min(videoElement.videoWidth  || 640, 640);
    canvas.height = Math.min(videoElement.videoHeight || 480, 480);

    intervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN &&
          ctx && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        // Flip horizontally to match training data (collected with cv2.flip)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        canvas.toBlob((blob) => {
          if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
            blob.arrayBuffer().then(buffer => wsRef.current!.send(buffer));
          }
        }, 'image/jpeg', 0.85);
      }
    }, 40);  // 25 fps — llena el buffer de 5 frames en 200 ms en vez de 250 ms
  }, []);

  const stopSendingFrames = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { isConnected, response, startSendingFrames, stopSendingFrames };
};