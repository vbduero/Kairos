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
  // Estado ultra-rápido para evitar lag de React en la sincronización de frames
  const isWaitingRef = useRef<boolean>(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      isWaitingRef.current = false;
      useUiStore.getState().addToast('Conexión establecida con el servidor AI', 'success');
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketResponse = JSON.parse(event.data);
        setResponse(data);
        // Liberar el candado en cuanto recibimos la respuesta: PING-PONG perfecto
        isWaitingRef.current = false;
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        isWaitingRef.current = false;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting in 3s...');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        useUiStore.getState().addToast('Conexión perdida. Reconectando...', 'error');
      } else if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        useUiStore.getState().addToast('Intentando reconectar con el servidor AI...', 'info');
      }
      setIsConnected(false);
      isWaitingRef.current = false;
      stopSendingFrames();
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      isWaitingRef.current = false;
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
    
    // Resolución óptima para MediaPipe (muy rápida de codificar)
    canvas.width  = 256;
    canvas.height = 256;

    let isEncoding = false;
    const sendFrame = () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      if (!ctx || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) return;
      
      // ESTRATEGIA CERO-LAG: Ping-Pong. 
      // NUNCA enviamos un frame si el servidor no ha devuelto el anterior.
      if (isWaitingRef.current) return;
      if (wsRef.current.bufferedAmount > 0) return;
      if (isEncoding) return;

      isEncoding = true;
      ctx.save();
      ctx.scale(-1, 1);
      
      // Dibujar la imagen completa estirada al tamaño del canvas. 
      // Las coordenadas devueltas (0 a 1) se mapearán perfectamente al canvas superpuesto.
      ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      canvas.toBlob((blob) => {
        isEncoding = false;
        if (blob && wsRef.current?.readyState === WebSocket.OPEN && !isWaitingRef.current) {
          isWaitingRef.current = true; // Bloquear hasta recibir respuesta
          wsRef.current.send(blob);
        }
      }, 'image/jpeg', 0.30); // 30% calidad es súper ligera y suficiente para IA
    };

    // Intentamos enviar lo más rápido posible (60fps), pero 'isWaitingRef' 
    // automáticamente limitará la velocidad a la máxima que el servidor pueda procesar.
    intervalRef.current = setInterval(sendFrame, 16); 
  }, []);

  const stopSendingFrames = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isWaitingRef.current = false;
  }, []);

  return { isConnected, response, startSendingFrames, stopSendingFrames };
};