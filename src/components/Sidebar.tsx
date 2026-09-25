import { NavLink, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Dumbbell, Activity, Users, Trophy, Settings, X, Shield, MessageCircle, Bell } from 'lucide-react';
import UserAvatar from './UserAvatar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin', label: 'Admin Access', icon: Shield, end: true, adminOnly: true },
  { to: '/programmes', label: 'Explore Programmes', icon: Dumbbell, end: true },
  { to: '/my-programmes', label: 'My Programmes', icon: Activity, end: false, memberOnly: true },
  { to: '/exercise-library', label: 'Exercise Library', icon: Dumbbell, end: false, adminOnly: true },
  { to: '/activity', label: 'Daily Activity Logs', icon: Activity, end: false, memberOnly: true },
  { to: '/community', label: 'Community', icon: Users, end: true, memberOnly: true },
  { to: '/community/people', label: 'Find Members', icon: Users, end: false, memberOnly: true },
  { to: '/messages', label: 'Messages', icon: MessageCircle, end: false, memberOnly: true },
  { to: '/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/community/settings', label: 'Community Privacy', icon: Shield, end: false, memberOnly: true },
  { to: '/moderation', label: 'Moderation', icon: Shield, end: false, adminOnly: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
  { to: '/achievements', label: 'Achievements & Ranks', icon: Shield, end: false, memberOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [,refreshPhoto]=useState(0);
  useEffect(()=>{const refresh=()=>refreshPhoto((value)=>value+1);window.addEventListener('fitkit_profile_photo_changed',refresh);return()=>window.removeEventListener('fitkit_profile_photo_changed',refresh);},[]);

  // Parse active user details from local storage
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const userName = user.name || 'FitKit Member';
  const userRole = user.role || 'Member';


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
        {navItems.filter((item) =>
          (!('adminOnly' in item) || !item.adminOnly || userRole === 'Admin') &&
          (!('memberOnly' in item) || !item.memberOnly || userRole === 'Member' || userRole === 'Admin')
        ).map(({ to, label, icon: Icon, end }) => (
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

      {/* Dynamic Profile Summary (Clickable Card) */}
      <div className="p-4 m-4 rounded-2xl glass">
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 group block focus:outline-none"
        >
          <div className="relative shrink-0">
            <UserAvatar name={userName} photoUrl={user.photo_url} gradient="from-cyan-400 to-emerald-500" textClass="font-display text-sm" className="w-11 h-11 group-hover:scale-105 transition-transform" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0b0d11]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-lime-400 transition-colors">{userName}</p>
            <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full truncate">
              <Shield className="w-3 h-3 shrink-0" /> {userRole}
            </span>
          </div>
        </Link>

        <Link to="/settings" onClick={onClose} className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-xs text-slate-300 hover:text-lime-300">
          <Settings className="w-3.5 h-3.5" /> Edit profile and goals
        </Link>
      </div>
    </aside>
  );
}
