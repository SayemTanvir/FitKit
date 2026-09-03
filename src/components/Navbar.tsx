import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut } from 'lucide-react';

interface NavbarProps {
  onMenuClick: () => void;
  onLogWorkout?: () => void;
  onLogWater?: () => void;
}

const notifications = [
  'Database synced with FitKit backend',
  'Role authorization verified',
];

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  // Read authenticated user state
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

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
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-semibold text-base sm:text-xl text-white truncate">
              Welcome back, {user?.name || 'User'}!
            </h1>
            {/* Dynamic Role Badge */}
            {user && (
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  user.role === 'Admin'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {user.role}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">
            {user?.role === 'Admin' ? 'System Administrator Portal' : "Here's how your training is tracking today."}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/5"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-400 text-[10px] font-bold text-slate-900 flex items-center justify-center">
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

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}