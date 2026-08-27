import { useState } from 'react';
import { Menu, Lock, Droplet, Plus, Bell } from 'lucide-react';

interface NavbarProps {
  onMenuClick: () => void;
  userName?: string;
  onLogWorkout?: () => void;
  onLogWater?: () => void;
}

const notifications = [
  'Jane Doe reacted 🔥 to your run',
  'New Achievement: 10K Club unlocked',
  'Rest day reminder for tomorrow',
];

export default function Navbar({ onMenuClick, userName = 'Alex', onLogWorkout, onLogWater }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-20 glass-strong border-b border-white/10">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-300 hover:text-white p-1.5 -ml-1.5 rounded-lg hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="font-display font-semibold text-base sm:text-xl text-white truncate">
            Welcome back, {userName}! <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Here's how your training is tracking today.</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5" /> Friends Only
          </span>

          <button onClick={onLogWater} className="hidden sm:flex btn-cyan items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl">
            <Droplet className="w-3.5 h-3.5" /> Log Water
          </button>
          <button onClick={onLogWorkout} className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Log</span> Workout
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/5"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-[10px] font-bold text-slate-900 flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-strong border border-white/10 p-2 shadow-2xl z-30">
                <p className="text-xs font-semibold text-slate-400 px-2 py-1.5">Notifications</p>
                {notifications.map((n) => (
                  <div key={n} className="px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-slate-200">
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
