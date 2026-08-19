import React, { useState, useEffect, useRef } from 'react';
import { Mic, Waves, MessageSquareText, Pencil, GraduationCap, Highlighter } from 'lucide-react';
import { statsService } from '../../services/statsService';

interface TeacherAudioPanelProps {
  onTranscriptionUpdate: (text: string) => void;
}

export const TeacherAudioPanel: React.FC<TeacherAudioPanelProps> = ({ onTranscriptionUpdate }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isListening);
  const onTranscriptionUpdateRef = useRef(onTranscriptionUpdate);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    onTranscriptionUpdateRef.current = onTranscriptionUpdate;
  }, [onTranscriptionUpdate]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          let text = event.results[i][0].transcript.trim();
          if (!text) continue;
          
          // Reemplazo inteligente de puntuación dictada
          text = text.replace(/\bcoma\b/gi, ',');
          text = text.replace(/\bpunto\b/gi, '.');
          // Eliminar espacios accidentales antes de los signos
          text = text.replace(/\s+([.,?!])/g, '$1');

          if (event.results[i].isFinal) {
             // Capitalizar la primera letra
             text = text.charAt(0).toUpperCase() + text.slice(1);
             // Añadir punto automático si la frase final no tiene puntuación
             if (!/[.,?!]$/.test(text)) {
                 text += '.';
             }
          }
          currentTranscript += text + ' ';
        }
        const finalOutput = currentTranscript.trim();
        setTranscription(finalOutput);
        onTranscriptionUpdateRef.current(finalOutput);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert('Por favor, permite el acceso al micrófono en tu navegador para usar esta función.');
          setIsListening(false);
        }
        if (event.error === 'aborted') {
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        if (isListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch(e) {
            console.error("Failed to restart speech recognition automatically", e);
            setIsListening(false);
          }
        }
      };
    } else {
      console.warn("Speech Recognition API is not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("El reconocimiento de voz no está soportado en este navegador. Usa Google Chrome o Microsoft Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      if (transcription) {
        statsService.logTeacherResponse(transcription);
      }
    } else {
      setTranscription('');
      onTranscriptionUpdate('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting speech recognition", e);
        setIsListening(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-4 relative">

      {/* Big Interactive Button Area */}
      <div className={`flex-[0.55] min-h-[250px] rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.06)] group ${
        isListening ? 'bg-gradient-to-b from-blue-50 to-teal-50 border-4 border-blue-200' : 'bg-white border-2 border-slate-100'
      }`}>
        
        <div className="absolute -left-6 -top-6 text-slate-100 transform rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700 pointer-events-none z-0">
           <Pencil className="w-32 h-32" />
        </div>
        <div className="absolute -right-6 -bottom-6 text-slate-100 transform -rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none z-0">
           <GraduationCap className="w-32 h-32" />
        </div>

        {/* Background glow when listening */}
        {isListening && (
          <div className="absolute inset-0 bg-[#3b82f6]/5 animate-pulse pointer-events-none z-0" />
        )}

        <button 
          onClick={toggleListening}
          className={`relative z-10 w-44 h-44 md:w-48 md:h-48 rounded-full flex items-center justify-center transition-all duration-500 group ${
            isListening 
              ? 'bg-gradient-to-br from-[#3b82f6] to-[#0f766e] shadow-[0_10px_30px_rgba(59,130,246,0.4)] scale-105'
              : 'bg-white border-[3px] border-slate-100 hover:border-[#3b82f6]/40 hover:bg-slate-50 shadow-[0_10px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.15)] hover:-translate-y-2'
          }`}
        >
          {isListening ? (
            <div className="flex flex-col items-center gap-3">
              <Waves className="w-14 h-14 text-white animate-bounce" />
              <span className="text-white font-black tracking-widest text-sm md:text-base">ESCUCHANDO</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Mic className="w-14 h-14 text-[#0f766e] group-hover:scale-110 transition-transform duration-300 group-hover:text-[#3b82f6]" />
              <span className="text-slate-500 font-bold text-center px-6 leading-tight uppercase tracking-wider text-xs">PRESIONA PARA ESCUCHAR</span>
            </div>
          )}
          
          {/* Fun Ripple effect rings */}
          {isListening && (
            <>
              <div className="absolute inset-[-8px] rounded-full border-2 border-[#3b82f6] opacity-0 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <div className="absolute inset-[-20px] rounded-full border border-[#80d5cb] opacity-0 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            </>
          )}
        </button>
      </div>

      {/* Transcription Area */}
      <div className="flex-[0.45] bg-white rounded-3xl p-6 flex flex-col shadow-[0_10px_30px_rgba(0,0,0,0.06)] border-2 border-slate-100 relative overflow-hidden group hover:border-[#3b82f6]/30 transition-colors duration-500">
        
        <div className="absolute -right-6 -bottom-6 text-slate-100 transform -rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none">
           <MessageSquareText className="w-32 h-32" />
        </div>
        <div className="absolute -left-6 -top-6 text-slate-100 transform rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700 pointer-events-none">
           <Highlighter className="w-32 h-32" />
        </div>

        <h3 className="text-xs font-black text-[#3b82f6] tracking-widest uppercase mb-3 flex items-center gap-2 relative z-10">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          Lo que dice el profesor
        </h3>
        
        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar pr-2">
          {transcription ? (
            <p className="text-slate-800 text-xl md:text-2xl font-bold leading-tight">
              {transcription}
            </p>
          ) : (
            <p className="text-slate-300 text-xl md:text-2xl font-bold italic flex items-center h-full">
              El texto aparecerá aquí...
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(-12deg); }
          50% { opacity: 0.6; transform: scale(1.1) rotate(0deg); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};
