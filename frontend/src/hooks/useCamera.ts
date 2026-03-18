import { useState, useEffect, useRef } from 'react';

interface UseCameraReturn {
    stream: MediaStream | null;
    error: string | null;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    isActive: boolean;
}

export const useCamera = (): UseCameraReturn => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isActive, setIsActive] = useState<boolean>(false);

    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            setStream(mediaStream);
            setIsActive(true);
        } catch (err: any) {
            setError(err.message || 'Error accessing camera');
            console.error('Error accessing media devices.', err);
            setIsActive(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsActive(false);
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            stopCamera();
        };
    }, [stream]);

    return { stream, error, startCamera, stopCamera, isActive };
};
