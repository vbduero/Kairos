import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/',       label: 'Aprender Señas', end: true  },
  { to: '/logros', label: 'Logros', end: false },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none print:hidden">
      <nav
        className={`
          pointer-events-auto flex items-center justify-between gap-8 px-6 py-3
          rounded-[32px] transition-all duration-300
          ${scrolled
            ? 'bg-white border-[#005B96]/10 shadow-[0_12px_36px_rgba(0,91,150,0.12)] border'
            : 'bg-white/80 backdrop-blur-md shadow-[0_8px_24px_rgba(0,91,150,0.06)] border border-transparent'}
        `}
      >

        {/* ── Brand / Logo ── */}
        <div className="flex items-center mr-4 select-none">
           <img src="/logo.png" alt="Kairós Logo" className="h-12 w-auto object-contain" />
        </div>

        {/* ── Links ── */}
        <div className="flex items-center gap-2">
          {LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative px-6 py-2.5 text-[15px] font-extrabold rounded-full transition-all duration-300 ease-out select-none
                 ${isActive 
                    ? 'text-white bg-[#00C9A7] shadow-[0_4px_12px_rgba(0,201,167,0.4)] transform scale-105' 
                    : 'text-[#475569] hover:text-[#005B96] hover:bg-[#F0F9FF] hover:scale-105'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
