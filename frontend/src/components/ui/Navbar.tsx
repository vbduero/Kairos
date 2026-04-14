import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/',       label: 'Traductor',     end: true  },
  { to: '/avatar', label: 'Avatar LSC',    end: false },
  { to: '/about',  label: 'Nosotros',      end: false },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav
        className={`
          pointer-events-auto flex items-center justify-between gap-10 px-5 py-2.5
          rounded-2xl border backdrop-blur-2xl transition-all duration-300
          ${scrolled
            ? 'bg-[#07090f]/90 border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.55)]'
            : 'bg-[#07090f]/70 border-white/[0.07] shadow-[0_8px_24px_rgba(0,0,0,0.35)]'}
        `}
      >

        {/* ── Logo ── */}
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.55)] transition-all duration-300 group-hover:shadow-[0_0_26px_rgba(168,85,247,0.7)] group-hover:scale-110">
            <span className="text-white font-black text-[9px] tracking-wider select-none">MH</span>
          </div>
          <span className="font-semibold text-sm text-white tracking-tight hidden sm:block select-none">
            Manos que Hablan
          </span>
        </NavLink>

        {/* ── Links ── */}
        <div className="flex items-center gap-0.5">
          {LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 group select-none
                 ${isActive ? 'text-white' : 'text-[#6b7280] hover:text-white'}`
              }
            >
              {({ isActive }) => (
                <>
                  {label}
                  {/* Underline slide-in */}
                  <span
                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-[2px] rounded-full
                      bg-gradient-to-r from-[#6366f1] to-[#a855f7]
                      transition-all duration-300 ease-out
                      ${isActive ? 'w-[60%] opacity-100' : 'w-0 opacity-0 group-hover:w-[60%] group-hover:opacity-100'}`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* ── CTA badge ── */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#07090f] text-sm font-semibold shadow-sm select-none cursor-default">
          <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block animate-pulse" />
          Beta v1.0
        </div>

      </nav>
    </div>
  );
}
