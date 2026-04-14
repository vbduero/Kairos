import { create } from 'zustand';

// Estado compartido entre CameraCapture y AvatarContainer.
// CameraCapture escribe → AvatarContainer lee.
interface TranslatorState {
  // 126 floats crudos de MediaPipe (mano1[0..62] + mano2[63..125]).
  // Array vacío = sin mano detectada.
  keypoints: number[];
  handDetected: boolean;
  handsCount: number;
  // Seña confirmada con umbral (la misma lógica que lastValidPrediction en CameraCapture).
  predictedSign: string | null;
  confidence: number;

  update: (patch: Partial<Omit<TranslatorState, 'update'>>) => void;
}

export const useTranslatorStore = create<TranslatorState>((set) => ({
  keypoints: [],
  handDetected: false,
  handsCount: 0,
  predictedSign: null,
  confidence: 0,
  update: (patch) => set(patch),
}));
