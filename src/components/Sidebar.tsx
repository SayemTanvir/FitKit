import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Activity, Users, Trophy, Settings, X, Shield, Moon } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/workouts', label: 'Workouts & Plans', icon: Dumbbell, end: false },
  { to: '/activity', label: 'Daily Activity Logs', icon: Activity, end: false },
  { to: '/social', label: 'Social Feed', icon: Users, end: false },
  { to: '/achievements', label: 'Achievements & Ranks', icon: Trophy, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [restOn, setRestOn] = useState(false);

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 h-screen w-72 z-40 flex flex-col glass-strong border-r border-white/10 shrink-0 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 44 44" className="w-8 h-8">
            <polyline
              points="2,22 12,22 16,10 22,34 27,16 31,22 42,22"
              fill="none"
              stroke="#052e16"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="font-display font-bold text-lg tracking-tight text-white leading-none">FitKit</p>
          <p className="text-[11px] text-slate-400 mt-1 tracking-wide">TRAIN · TRACK · THRIVE</p>
        </div>
        <button onClick={onClose} className="ml-auto lg:hidden text-slate-400 hover:text-white p-1" aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
        <p className="px-3 text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Menu</p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-lime-400/15 to-cyan-400/10 border-lime-400/25 text-lime-50'
                  : 'text-slate-300 border-transparent hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Profile summary */}
      <div className="p-4 m-4 rounded-2xl glass">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center font-display font-bold text-slate-900 text-sm">
              AM
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0b0d11]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Alex Mercer</p>
            <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> Silver Member
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Moon className="w-3.5 h-3.5" />
            <span>Rest Mode: {restOn ? 'On' : 'Off'}</span>
          </div>
          <button
            onClick={() => setRestOn((v) => !v)}
            aria-pressed={restOn}
            aria-label="Toggle rest mode"
            className="w-10 h-[22px] rounded-full relative shrink-0 transition-colors"
            style={{ background: restOn ? 'linear-gradient(90deg, #a3e635, #22d3ee)' : 'rgba(255,255,255,0.1)' }}
          >
            <span
              className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full transition-transform duration-300 ${
                restOn ? 'bg-slate-900 translate-x-[18px]' : 'bg-slate-300 translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
