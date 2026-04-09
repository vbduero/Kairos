import React from 'react';
import { Camera, Info } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 rounded-[2rem] backdrop-blur-2xl bg-white/[0.02] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] w-full max-w-3xl transition-all duration-300 hover:bg-white/[0.04]">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 group px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.6)] transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]">
            <span className="text-white font-black text-[10px] tracking-widest pl-[1px]">MH</span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 hidden sm:block">
            Manos que Hablan
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/" className={({isActive}) => `flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-white/10 text-white shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <Camera size={16} /> <span className="hidden md:inline">Traductor</span>
          </NavLink>
          
          <NavLink to="/about" className={({isActive}) => `flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-white/10 text-white shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <Info size={16} /> <span className="hidden md:inline">Sobre Nosotros</span>
          </NavLink>
        </div>
        
      </nav>
    </div>
  );
}
