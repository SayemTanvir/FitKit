import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, Trash2 } from 'lucide-react';

interface NavbarProps {
  onMenuClick: () => void;
  onLogWorkout?: () => void;
  onLogWater?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if notifications were explicitly stored (even if empty array)
    const stored = localStorage.getItem('fitkit_notifications');
    
    if (stored !== null) {
      try {
        setNotifications(JSON.parse(stored));
      } catch {
        setNotifications([]);
      }
    } else {
      // Only set initial mock data if localStorage has never been initialized
      const initialMock = [
        { id: 1, title: 'Database Synced', message: 'Database synced with FitKit backend', time: '2 hours ago' },
        { id: 2, title: 'Role Verified', message: 'Role authorization verified', time: '4 hours ago' },
      ];
      setNotifications(initialMock);
      localStorage.setItem('fitkit_notifications', JSON.stringify(initialMock));
    }

    // Listen for new notifications dispatched across the app
    const handleNewNotification = (e: any) => {
      setNotifications((prev) => [e.detail, ...prev]);
    };

    window.addEventListener('fitkit_new_notification', handleNewNotification);
    return () => window.removeEventListener('fitkit_new_notification', handleNewNotification);
  }, []);
  const clearNotifications = () => {
    setNotifications([]);
    localStorage.setItem('fitkit_notifications', JSON.stringify([]));
  };

  // Safely parse stored user state
  const getUser = () => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const user = getUser();

  // Multi-tier check for Admin status
  const isAdmin =
    user?.role?.toLowerCase() === 'admin' ||
    user?.email?.toLowerCase() === 'admin@fitkit.com' ||
    user?.name?.toLowerCase().includes('admin');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 glass-strong border-b border-white/15">
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
            
            {/* Dynamic Role & Status Badge */}
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isAdmin ? 'Head Curator' : (user?.active_plan || user?.status || 'Active Member')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">
            {isAdmin ? 'System Administrator Portal' : "Here's how your training is tracking today."}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/5 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-400 text-[10px] font-bold text-slate-900 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700 p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Notifications</p>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-slate-400 hover:text-lime-300 flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No new notifications</p>
                  ) : (
                    notifications.map((n, idx) => (
                      <div key={n.id || idx} className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-800/80 transition border border-slate-700/60">
                        <p className="text-xs font-bold text-lime-300">{n.title}</p>
                        <p className="text-xs text-slate-200 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{n.time || 'Just now'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}