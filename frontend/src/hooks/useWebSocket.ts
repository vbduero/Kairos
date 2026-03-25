import { useState, useEffect, useRef, useCallback } from 'react';

// ── Tipos del mensaje que devuelve el backend ──
export interface WebSocketResponse {
  hand_detected: boolean;
  keypoints: number[];
  num_keypoints: number;
  predicted_sign: string | null;
  confidence: number;
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
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    intervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN &&
          ctx && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
            blob.arrayBuffer().then(buffer => wsRef.current!.send(buffer));
          }
        }, 'image/jpeg', 0.7);
      }
    }, 200);
  }, []);

  const stopSendingFrames = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { isConnected, response, startSendingFrames, stopSendingFrames };
};