import React, { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis,
  AreaChart, Area,
  LineChart, Line
} from 'recharts';
import { Hand, Activity, Book, Zap, Calendar, Target, Download, Sparkles, AlertTriangle, TrendingUp, Clock, History } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { statsService } from '../services/statsService';

interface StatData {
  totalRecognized: number;
  totalTimeSeconds: number;
  fluencyRate: number;
  uniqueWords: number;
  masteryStats: any[];
  wordsToReinforce: any[];
  consistencyDays: string;
  weekData: any[];
  trendData: any[];
  chatHistory?: { type: 'student' | 'teacher'; text: string; time: string }[];
  participationCount?: number;
  averageFriction?: number;
  struggledSigns?: { sign: string; fails: number }[];
  hourlyData?: { time: string; count: number }[];
}

export default function LogrosPage() {
  const [stats, setStats] = useState<StatData | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      const data = await statsService.getSummary();
      if (data) {
        setStats(data);
      }
      const suggestion = await statsService.getAiSuggestion();
      if (suggestion) {
        setAiSuggestion(suggestion);
      }
    };
    loadStats();
  }, []);

  const handleExportPDF = () => {
    window.print();
  };

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pt-28 pb-12 px-6 flex justify-center items-center text-[#1E293B]">
        <div className="text-xl font-bold text-[#005B96]">Cargando panel de desempeño...</div>
      </div>
    );
  }

  const { fluencyRate, uniqueWords, masteryStats, wordsToReinforce, consistencyDays, weekData, trendData, chatHistory = [], participationCount = 0, averageFriction = 0, struggledSigns = [], hourlyData = [] } = stats;

  return (
    <>
    <div className="min-h-screen w-full bg-slate-50 flex font-sans relative overflow-x-hidden print:pt-4 print:pb-0 print:bg-white print:px-0">
      
      {/* Animaciones de fondo originales (Igual que en Aprender Señas) */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-[#80d5cb]/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none print:hidden" />
      <div className="fixed top-[-10%] right-[-10%] w-96 h-96 bg-[#3b82f6]/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none print:hidden" />
      <div className="fixed bottom-[-20%] left-[20%] w-96 h-96 bg-[#0f766e]/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 pointer-events-none print:hidden" />

      <div className="w-full max-w-[1920px] mx-auto pt-32 pb-12 px-4 lg:px-6 space-y-6 relative z-10" id="reporte-pdf">
        
        {/* Encabezado Oficial solo para Impresión */}
        <div className="hidden print:block text-center border-b-2 border-gray-200 pb-4 mb-6">
          <div className="flex justify-between items-end">
             <div className="text-left">
               <h2 className="text-2xl font-black text-[#005B96] tracking-tight">KAIRÓS</h2>
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sistema de Inclusión Académica</p>
             </div>
             <div className="text-right">
               <p className="text-sm font-bold text-gray-800">Reporte de Desempeño y Comunicación</p>
               <p className="text-xs text-gray-500">Fecha: {new Date().toLocaleDateString()}</p>
             </div>
          </div>
        </div>

        <div className="text-center mb-8 relative print:hidden">
          <h1 className="text-4xl font-extrabold text-[#005B96]">Análisis de Inclusión</h1>
          <p className="text-slate-500 mt-2">Métricas de accesibilidad y comunicación en el aula</p>
          
          <button 
             onClick={handleExportPDF}
             className="absolute top-0 right-0 hidden md:flex items-center gap-2 bg-[#005B96] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#1B4965] transition-colors"
          >
             <Download className="w-5 h-5" />
             Descargar Reporte PDF
          </button>
        </div>

        {/* Asistente Pedagógico (IA) */}
        <div className="bg-gradient-to-r from-blue-50/90 to-teal-50/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex flex-col print:shadow-none print:border-gray-300 print:break-inside-avoid relative overflow-hidden group">
          {/* 4 Figuras decorativas */}
          <Sparkles className="absolute -right-4 -bottom-4 w-32 h-32 text-[#3B82F6]/5 transform rotate-12 group-hover:scale-110 transition-transform duration-700 pointer-events-none print:hidden" />
          <Sparkles className="absolute left-10 -top-10 w-24 h-24 text-[#3B82F6]/5 transform -rotate-12 group-hover:-translate-y-4 transition-transform duration-1000 pointer-events-none print:hidden" />
          <Sparkles className="absolute right-32 top-2 w-16 h-16 text-[#3B82F6]/5 transform rotate-45 group-hover:scale-125 transition-transform duration-500 pointer-events-none print:hidden" />
          <Sparkles className="absolute -left-4 bottom-2 w-20 h-20 text-[#3B82F6]/5 transform -rotate-45 group-hover:translate-x-4 transition-transform duration-700 pointer-events-none print:hidden" />
          
          <div className="flex items-center gap-2 mb-2 relative z-10">
             <Sparkles className="w-6 h-6 text-[#3B82F6]" />
             <span className="font-bold text-[#1E293B] text-xl">Sugerencias Pedagógicas (IA)</span>
          </div>
          <p className="text-sm text-slate-700 italic relative z-10">
             {aiSuggestion ? aiSuggestion : "Analizando datos para generar sugerencias..."}
          </p>
        </div>

        {/* Top KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 print:gap-4 print:break-inside-avoid">
           <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center text-center print:shadow-none print:border-gray-200 relative overflow-hidden group hover:border-[#3B82F6]/50 transition-colors">
              {/* 4 Figuras decorativas */}
              <Activity className="absolute -left-6 -bottom-6 w-32 h-32 text-[#3B82F6]/5 transform -rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none print:hidden" />
              <Activity className="absolute -right-4 -top-4 w-20 h-20 text-[#3B82F6]/5 transform rotate-12 group-hover:scale-125 transition-transform duration-500 pointer-events-none print:hidden" />
              <Activity className="absolute left-1/2 -bottom-8 w-24 h-24 text-[#3B82F6]/5 transform rotate-45 group-hover:-translate-y-4 transition-transform duration-1000 pointer-events-none print:hidden" />
              <Activity className="absolute -left-2 top-10 w-16 h-16 text-[#3B82F6]/5 transform -rotate-45 group-hover:translate-x-2 transition-transform duration-700 pointer-events-none print:hidden" />
              
              <Activity className="w-10 h-10 text-[#3B82F6] mb-2 print:text-gray-800 relative z-10" />
              <span className="font-bold text-slate-500 print:text-gray-600 relative z-10">Nivel de Participación (Hoy)</span>
              <div className="text-4xl font-extrabold text-[#1B4965] mt-2 print:text-black relative z-10">{participationCount} <span className="text-lg text-slate-400 print:text-gray-500">frases armadas</span></div>
           </div>

           <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center text-center print:shadow-none print:border-gray-200 relative overflow-hidden group hover:border-[#F59E0B]/50 transition-colors">
              {/* 4 Figuras decorativas */}
              <Zap className="absolute -right-6 -bottom-6 w-32 h-32 text-[#F59E0B]/5 transform rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none print:hidden" />
              <Zap className="absolute -left-4 -top-4 w-24 h-24 text-[#F59E0B]/5 transform -rotate-12 group-hover:scale-125 transition-transform duration-500 pointer-events-none print:hidden" />
              <Zap className="absolute right-1/4 -bottom-4 w-16 h-16 text-[#F59E0B]/5 transform rotate-45 group-hover:-translate-y-2 transition-transform duration-1000 pointer-events-none print:hidden" />
              <Zap className="absolute -right-2 top-1/3 w-20 h-20 text-[#F59E0B]/5 transform -rotate-45 group-hover:-translate-x-4 transition-transform duration-700 pointer-events-none print:hidden" />
              
              <Zap className="w-10 h-10 text-[#F59E0B] mb-2 print:text-gray-800 relative z-10" />
              <span className="font-bold text-slate-500 print:text-gray-600 relative z-10">Fricción de Comunicación</span>
              <div className="text-4xl font-extrabold text-[#1B4965] mt-2 print:text-black relative z-10">{averageFriction} <span className="text-lg text-slate-400 print:text-gray-500">seg/frase</span></div>
           </div>

           <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center text-center print:shadow-none print:border-gray-200 relative overflow-hidden group hover:border-[#10B981]/50 transition-colors">
              {/* 4 Figuras decorativas */}
              <Calendar className="absolute -left-6 -bottom-6 w-32 h-32 text-[#10B981]/5 transform -rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none print:hidden" />
              <Calendar className="absolute -right-4 -top-4 w-24 h-24 text-[#10B981]/5 transform rotate-12 group-hover:scale-125 transition-transform duration-500 pointer-events-none print:hidden" />
              <Calendar className="absolute left-1/4 -bottom-2 w-16 h-16 text-[#10B981]/5 transform -rotate-45 group-hover:-translate-y-4 transition-transform duration-1000 pointer-events-none print:hidden" />
              <Calendar className="absolute -left-2 top-1/3 w-20 h-20 text-[#10B981]/5 transform rotate-45 group-hover:translate-x-2 transition-transform duration-700 pointer-events-none print:hidden" />
              
              <Calendar className="w-10 h-10 text-[#10B981] mb-2 print:text-gray-800 relative z-10" />
              <span className="font-bold text-slate-500 print:text-gray-600 relative z-10">Días de Uso Activo</span>
              <div className="text-4xl font-extrabold text-[#1B4965] mt-2 print:text-black relative z-10">{consistencyDays} <span className="text-lg text-slate-400 print:text-gray-500">días</span></div>
           </div>
        </div>

        {/* Bitácora de Conversación */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex flex-col print:shadow-none print:border-gray-300 print:break-inside-avoid relative overflow-hidden group">
          {/* 4 Figuras decorativas */}
          <Hand className="absolute -right-10 -bottom-10 w-64 h-64 text-[#3B82F6]/5 transform rotate-12 group-hover:-rotate-6 group-hover:scale-110 transition-transform duration-1000 pointer-events-none print:hidden" />
          <Hand className="absolute -left-10 -top-10 w-48 h-48 text-[#3B82F6]/5 transform -rotate-12 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-700 pointer-events-none print:hidden" />
          <Hand className="absolute left-1/2 -bottom-20 w-56 h-56 text-[#3B82F6]/5 transform rotate-45 group-hover:-translate-y-8 transition-transform duration-1000 pointer-events-none print:hidden" />
          <Hand className="absolute right-1/4 -top-16 w-32 h-32 text-[#3B82F6]/5 transform -rotate-45 group-hover:translate-y-4 transition-transform duration-700 pointer-events-none print:hidden" />
          
          <div className="flex items-center gap-2 mb-4 relative z-10">
             <Hand className="w-6 h-6 text-[#3B82F6] print:text-gray-800" />
             <span className="font-bold text-[#1E293B] text-xl print:text-black">Bitácora de Conversación (Últimos mensajes)</span>
          </div>
          <p className="text-sm text-slate-500 mb-6 print:text-gray-600">Acta de la interacción bidireccional entre el estudiante (señas) y el profesor (voz).</p>
          
          <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 print:max-h-none print:overflow-visible">
             {chatHistory.length > 0 ? chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'student' ? 'justify-start' : 'justify-end'}`}>
                   <div className={`max-w-[80%] px-5 py-3 rounded-2xl flex flex-col gap-1 ${
                     msg.type === 'student' 
                     ? 'bg-slate-100 rounded-bl-sm border border-slate-200' 
                     : 'bg-[#0f766e]/10 rounded-br-sm border border-[#0f766e]/20 text-right'
                   }`}>
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                       {msg.type === 'student' ? 'Estudiante (Señas)' : 'Profesor (Voz)'}
                     </span>
                     <span className={`text-lg font-bold ${msg.type === 'student' ? 'text-slate-800' : 'text-[#0f766e]'}`}>
                       {msg.text}
                     </span>
                     <span className="text-[10px] text-slate-400 mt-1">
                       {new Date(msg.time).toLocaleTimeString()}
                     </span>
                   </div>
                </div>
             )) : <span className="text-slate-400 font-semibold text-center py-4">Aún no hay interacciones registradas.</span>}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 print:flex print:flex-col print:gap-8">
          
          <div className="md:col-span-8 flex flex-col gap-6 print:w-full">
            <h2 className="text-2xl font-bold text-[#005B96] ml-2 print:text-black">Análisis de Vocabulario y Dificultades</h2>
            
            <div className="flex flex-col sm:flex-row gap-6 print:flex-row print:w-full">
              
              {/* Mastery Chart */}
              <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex-1 flex flex-col items-center min-h-[300px] print:shadow-none print:border-gray-300 print:break-inside-avoid overflow-hidden group hover:border-[#1E293B]/20 transition-colors">
                 {/* 4 Figuras decorativas */}
                 <Target className="absolute -right-10 -bottom-10 w-64 h-64 text-[#1E293B]/5 transform rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none print:hidden" />
                 <Target className="absolute -left-10 -top-10 w-48 h-48 text-[#1E293B]/5 transform -rotate-12 group-hover:scale-110 transition-transform duration-1000 pointer-events-none print:hidden" />
                 <Target className="absolute left-10 -bottom-10 w-32 h-32 text-[#1E293B]/5 transform rotate-45 group-hover:-translate-y-4 transition-transform duration-700 pointer-events-none print:hidden" />
                 <Target className="absolute right-1/4 -top-8 w-24 h-24 text-[#1E293B]/5 transform -rotate-45 group-hover:translate-y-2 transition-transform duration-500 pointer-events-none print:hidden" />
                 
                 <div className="absolute top-6 left-6 flex items-center gap-2 relative z-10">
                   <Target className="w-6 h-6 text-[#475569]" />
                   <span className="font-bold text-[#1E293B] leading-tight">Nivel de<br/>Dominio</span>
                 </div>
                 
                 <div className="w-full h-48 relative flex justify-center items-center mt-12">
                    {masteryStats.reduce((acc, curr) => acc + curr.value, 0) > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={masteryStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {masteryStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center text-slate-400 font-semibold">Aún sin datos</div>
                    )}
                 </div>
                 {/* Legend */}
                 <div className="w-full mt-4 grid grid-cols-1 gap-y-2 text-sm font-semibold text-[#475569]">
                   {masteryStats.map(item => (
                     <div key={item.name} className="flex justify-between items-center w-full px-4">
                       <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                         <span>{item.name}</span>
                       </div>
                       <span className="text-[#1B4965] font-bold">{item.value}</span>
                     </div>
                   ))}
                 </div>
              </div>

              {/* Words to reinforce & Struggled Signs */}
              <div className="flex-1 flex flex-col gap-6 print:w-full">
                
                {/* Dificultad Motriz */}
                <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex-1 min-h-[140px] print:shadow-none print:border-gray-300 print:break-inside-avoid overflow-hidden group hover:border-[#F59E0B]/50 transition-colors">
                   {/* 4 Figuras decorativas */}
                   <AlertTriangle className="absolute -right-6 -bottom-6 w-32 h-32 text-[#F59E0B]/5 transform -rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none print:hidden" />
                   <AlertTriangle className="absolute -left-4 -top-4 w-24 h-24 text-[#F59E0B]/5 transform rotate-12 group-hover:scale-125 transition-transform duration-500 pointer-events-none print:hidden" />
                   <AlertTriangle className="absolute left-1/3 -bottom-4 w-16 h-16 text-[#F59E0B]/5 transform rotate-45 group-hover:-translate-y-2 transition-transform duration-1000 pointer-events-none print:hidden" />
                   <AlertTriangle className="absolute right-1/4 -top-2 w-20 h-20 text-[#F59E0B]/5 transform -rotate-45 group-hover:translate-y-2 transition-transform duration-700 pointer-events-none print:hidden" />
                   
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                      <Activity className="w-6 h-6 text-[#F59E0B]" />
                      <span className="font-bold text-[#1E293B] leading-tight">Fricción del Sistema (Señas Confusas)</span>
                   </div>
                   <p className="text-xs text-slate-500 mb-4">Señas que el sistema no le entiende bien al estudiante y que podrían causar frustración.</p>
                   <div className="space-y-2">
                     {struggledSigns.length > 0 ? struggledSigns.map((item, i) => (
                       <div key={item.sign} className="flex justify-between items-center font-bold bg-orange-50 p-2 rounded-lg">
                         <span className="text-[#1E293B] uppercase">{item.sign}</span>
                         <span className="text-[#F59E0B] text-sm">{item.fails} fallos</span>
                       </div>
                     )) : <div className="text-slate-400 font-semibold text-sm">Sin intentos fallidos</div>}
                   </div>
                </div>

                {/* Vocabulario a Reforzar */}
                <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex-1 min-h-[140px] print:shadow-none print:border-gray-300 print:break-inside-avoid overflow-hidden group hover:border-[#EF4444]/50 transition-colors">
                   {/* 4 Figuras decorativas */}
                   <Book className="absolute -left-6 -bottom-6 w-32 h-32 text-[#EF4444]/5 transform rotate-12 group-hover:scale-110 group-hover:rotate-24 transition-transform duration-700 pointer-events-none print:hidden" />
                   <Book className="absolute -right-4 -top-4 w-24 h-24 text-[#EF4444]/5 transform -rotate-12 group-hover:scale-125 transition-transform duration-500 pointer-events-none print:hidden" />
                   <Book className="absolute right-1/3 -bottom-4 w-16 h-16 text-[#EF4444]/5 transform rotate-45 group-hover:-translate-y-2 transition-transform duration-1000 pointer-events-none print:hidden" />
                   <Book className="absolute left-1/4 -top-2 w-20 h-20 text-[#EF4444]/5 transform -rotate-45 group-hover:translate-y-2 transition-transform duration-700 pointer-events-none print:hidden" />
                   
                   <div className="flex items-center gap-2 mb-2 relative z-10">
                      <Book className="w-6 h-6 text-[#EF4444]" />
                      <span className="font-bold text-[#1E293B] leading-tight">Vocabulario Olvidado</span>
                   </div>
                   <p className="text-xs text-slate-500 mb-4">Palabras con menos prácticas exitosas.</p>
                   <div className="space-y-2">
                     {wordsToReinforce.length > 0 ? wordsToReinforce.map((item, i) => (
                       <div key={item.word} className="flex justify-between items-center font-bold bg-red-50 p-2 rounded-lg">
                         <span className="text-[#1E293B] uppercase">{item.word}</span>
                         <span className="text-[#EF4444] text-sm">{item.count} usos</span>
                       </div>
                     )) : <div className="text-slate-400 font-semibold text-sm">Sin datos</div>}
                   </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column: Resumen de Actividad */}
          <div className="md:col-span-4 flex flex-col gap-6 print:w-full print:mt-8">
             <h2 className="text-2xl font-bold text-[#005B96] ml-2 print:text-black">Tendencias y Uso del Sistema</h2>
             
             {/* Actividad diaria -> Cronograma por Horas */}
             <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex-1 flex flex-col min-h-[250px] print:shadow-none print:border-gray-300 print:break-inside-avoid overflow-hidden group hover:border-[#3B82F6]/50 transition-colors">
                {/* 4 Figuras decorativas */}
                <Clock className="absolute -right-10 -top-10 w-48 h-48 text-[#3B82F6]/5 transform rotate-45 group-hover:rotate-90 group-hover:scale-110 transition-all duration-1000 pointer-events-none print:hidden" />
                <Clock className="absolute -left-10 -bottom-10 w-56 h-56 text-[#3B82F6]/5 transform -rotate-12 group-hover:rotate-12 group-hover:scale-110 transition-all duration-1000 pointer-events-none print:hidden" />
                <Clock className="absolute left-1/3 top-2 w-24 h-24 text-[#3B82F6]/5 transform rotate-180 group-hover:rotate-90 transition-all duration-700 pointer-events-none print:hidden" />
                <Clock className="absolute right-1/4 bottom-4 w-16 h-16 text-[#3B82F6]/5 transform -rotate-45 group-hover:-translate-y-2 transition-all duration-500 pointer-events-none print:hidden" />
                
                <span className="font-bold text-[#1E293B] leading-tight mb-4 relative z-10">Cronograma de Participación (Hoy)</span>
                <div className="flex-1 w-full min-h-0 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Tendencia mensual */}
             <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white flex flex-col min-h-[250px] print:shadow-none print:border-gray-300 print:break-inside-avoid overflow-hidden group hover:border-[#1B4965]/50 transition-colors">
                {/* 4 Figuras decorativas */}
                <History className="absolute -left-10 -bottom-10 w-48 h-48 text-[#1B4965]/5 transform -rotate-12 group-hover:rotate-12 group-hover:scale-110 transition-all duration-1000 pointer-events-none print:hidden" />
                <History className="absolute -right-10 -top-10 w-56 h-56 text-[#1B4965]/5 transform rotate-12 group-hover:-rotate-12 group-hover:scale-110 transition-all duration-1000 pointer-events-none print:hidden" />
                <History className="absolute left-1/4 top-2 w-20 h-20 text-[#1B4965]/5 transform rotate-45 group-hover:rotate-90 transition-all duration-700 pointer-events-none print:hidden" />
                <History className="absolute right-1/3 bottom-4 w-24 h-24 text-[#1B4965]/5 transform -rotate-45 group-hover:-translate-y-2 transition-all duration-500 pointer-events-none print:hidden" />
                
                <span className="font-bold text-[#1E293B] leading-tight mb-2 relative z-10">Histórico de Actividad (Señas)</span>
                <div className="flex-1 w-full min-h-0 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1B4965" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#1B4965" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                      <Area type="linear" dataKey="val" stroke="#1B4965" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>

      </div>
      
      {/* Estilos para animaciones de las burbujas */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
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
    </>
  );
}
