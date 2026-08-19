import React, { useState } from 'react';
import { CameraCapture } from '../components/camera/CameraCapture';
import { TeacherAudioPanel } from '../components/teacher/TeacherAudioPanel';
import { Volume2, PlusCircle, Trash2, Sparkles, Star, Camera, BookOpen, Backpack } from 'lucide-react';
import { statsService } from '../services/statsService';

const TranslatorPage: React.FC = () => {
  const [currentSign, setCurrentSign] = useState<string>('');
  const [currentWord, setCurrentWord] = useState<string>('');
  const [teacherText, setTeacherText] = useState<string>('');
  const [phraseStartTime, setPhraseStartTime] = useState<number | null>(null);

  const handleSignDetected = (sign: string) => {
    if (sign && sign !== currentSign) {
      setCurrentSign(sign);
      statsService.logSign(sign);
      if (!currentWord && !phraseStartTime) {
        setPhraseStartTime(Date.now());
      }
    }
  };

  const speakText = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-ES';
    utt.pitch = 1.2;
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  };

  const handleHablar = () => {
    speakText(currentSign);
  };

  const handleCrearPalabra = () => {
    if (currentSign) {
      const newWord = currentWord + currentSign + ' ';
      setCurrentWord(newWord);
      speakText(newWord);
      const timeTaken = phraseStartTime ? Math.round((Date.now() - phraseStartTime) / 1000) : 0;
      statsService.logPhrase(newWord.trim(), timeTaken);
    }
  };

  const clearWord = () => {
    setCurrentWord('');
    setCurrentSign('');
    setPhraseStartTime(null);
  };

  return (
    <div className="h-screen w-full bg-slate-50 overflow-hidden flex font-sans relative">
      {/* Animaciones de fondo originales */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#80d5cb]/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#3b82f6]/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-[#0f766e]/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 pointer-events-none" />

      {/* Ajustamos pt-24 para que el navbar flotante (fijo arriba) no se monte sobre el contenido */}
      <main className="w-full h-full pt-24 pb-6 px-4 lg:px-6 flex flex-col lg:flex-row gap-5 relative z-10 max-w-[1920px] mx-auto">
        
        {/* Left Column: Student Area */}
        <div className="flex-1 lg:flex-[0.65] flex flex-col gap-4 h-full">
          {/* Camera takes up maximum space */}
          <div className="flex-1 w-full rounded-3xl overflow-hidden border-4 border-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] relative group bg-white">
            <Camera className="absolute -bottom-10 -left-10 w-48 h-48 text-slate-100/50 transform -rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-1000 pointer-events-none z-0" />
            <div className="absolute -top-10 -right-10 text-slate-100/50 transform rotate-12 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-1000 pointer-events-none z-0">
               <BookOpen className="w-48 h-48" />
            </div>
            <div className="relative z-10 h-full w-full">
               <CameraCapture onSignDetected={handleSignDetected} />
            </div>
          </div>

          {/* Student controls */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
             
             {/* Word building area */}
             <div className="flex-1 w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 relative overflow-hidden group hover:border-[#80d5cb]/50 transition-colors">
                 <div className="absolute -right-4 -top-4 text-[#80d5cb]/10 transform rotate-12 group-hover:scale-110 group-hover:rotate-45 transition-transform duration-700 pointer-events-none">
                    <Sparkles className="w-20 h-20" />
                 </div>
                 <div className="absolute -left-6 -bottom-6 text-[#80d5cb]/10 transform -rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none">
                    <Backpack className="w-32 h-32" />
                 </div>
                
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100 flex items-center gap-2">
                    Tu Seña: 
                    <span className="text-[#0f766e] text-base bg-[#80d5cb]/20 px-2 rounded-md">{currentSign || '?'}</span>
                  </span>
                </div>
                
                <div className="relative z-10 flex justify-between items-end">
                   <div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Palabra Formada</span>
                     <p className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-1 min-h-[40px] break-all">
                       {currentWord || '...'}
                     </p>
                   </div>
                   {currentWord && (
                     <button onClick={clearWord} className="p-3 bg-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-sm" title="Borrar">
                       <Trash2 className="w-6 h-6" />
                     </button>
                   )}
                </div>
             </div>

             {/* Action Buttons */}
             <div className="flex flex-row md:flex-col gap-3 w-full md:w-48">
               <button 
                  onClick={handleHablar}
                  disabled={!currentSign}
                  className="flex-1 md:flex-none py-3 px-5 bg-white border-2 border-slate-100 text-slate-700 hover:border-[#0f766e] hover:text-[#0f766e] hover:bg-slate-50 rounded-2xl flex items-center justify-center gap-2 font-black text-base transition-all hover:shadow-[0_8px_20px_rgba(15,118,110,0.15)] disabled:opacity-50 hover:-translate-y-1 active:scale-95"
                >
                  <Volume2 className="w-5 h-5" />
                  Hablar
                </button>
                <button 
                  onClick={handleCrearPalabra}
                  disabled={!currentSign}
                  className="flex-1 md:flex-none py-3 px-5 bg-gradient-to-r from-[#0f766e] to-[#3b82f6] text-white rounded-2xl flex items-center justify-center gap-2 font-black text-base transition-all shadow-[0_8px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_25px_rgba(59,130,246,0.4)] disabled:opacity-50 hover:-translate-y-1 hover:scale-105 active:scale-95 relative overflow-hidden group"
                >
                  <Star className="absolute -left-2 -bottom-2 w-10 h-10 text-white/10 transform -rotate-12 group-hover:rotate-45 transition-transform duration-500" />
                  <PlusCircle className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Juntar</span>
                </button>
             </div>
          </div>
        </div>

        {/* Right Column: Teacher Area */}
        <div className="flex-1 lg:flex-[0.35] h-full">
          <TeacherAudioPanel onTranscriptionUpdate={setTeacherText} />
        </div>

      </main>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-blob {
          animation: blob 7s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default TranslatorPage;
