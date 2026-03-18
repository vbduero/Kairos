import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketReturn {
    isConnected: boolean;
    keypoints: any | null; // Placeholder for actual keypoints type
    startSendingFrames: (videoElement: HTMLVideoElement) => void;
    stopSendingFrames: () => void;
}

const WS_URL = 'ws://localhost:8000/ws';

export const useWebSocket = (): UseWebSocketReturn => {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [keypoints, setKeypoints] = useState<any | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Backend returns: { hand_detected, keypoints, num_keypoints }
                if (data.hand_detected && data.keypoints) {
                    setKeypoints(data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected. Reconnecting in 3s...');
            setIsConnected(false);
            stopSendingFrames();
            setTimeout(connect, 3000); // Auto-reconnect
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // ws.close() will be called, triggering onclose and auto-reconnect
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        connect();
        
        // Initialize an off-screen canvas for frame extraction
        canvasRef.current = document.createElement('canvas');

        return () => {
            stopSendingFrames();
            if (wsRef.current) {
                // Ensure onclose doesn't trigger a reconnect on unmount
                wsRef.current.onclose = null; 
                wsRef.current.close();
            }
        };
    }, [connect]);

    const startSendingFrames = useCallback((videoElement: HTMLVideoElement) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket is not connected. Cannot send frames.');
            return;
        }
        
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (!canvasRef.current) {
             canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas size to video size
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;

        intervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN && ctx && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                
                // Draw current video frame to canvas
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                // Send frame as binary (JPEG blob → ArrayBuffer)
                // The backend expects bytes, not JSON
                canvas.toBlob((blob) => {
                    if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
                        blob.arrayBuffer().then(buffer => {
                            wsRef.current!.send(buffer);
                        });
                    }
                }, 'image/jpeg', 0.7);
            }
        }, 200); // Enviar cada 200ms (MediaPipe CPU ~100ms por frame)
    }, []);

    const stopSendingFrames = useCallback(() => {
         if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    return { isConnected, keypoints, startSendingFrames, stopSendingFrames };
};
