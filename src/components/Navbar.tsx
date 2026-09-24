import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut } from 'lucide-react';
import { notifications as fetchCommunityNotifications } from '../services/community';
import UserAvatar from './UserAvatar';

interface NavbarProps {
  onMenuClick: () => void;
  onLogWorkout?: () => void;
  onLogWater?: () => void;
}

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [databaseUnread, setDatabaseUnread] = useState(0);
  const navigate = useNavigate();
  const [user, setUser] = useState(readStoredUser());
  const refreshNotifications = useCallback(() => {
    fetchCommunityNotifications()
      .then((items) => setDatabaseUnread(items.filter((item) => !item.is_read).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleUserUpdate = () => setUser(readStoredUser());
    window.addEventListener('fitkit_user_updated', handleUserUpdate);
    window.addEventListener('fitkit_profile_photo_changed', handleUserUpdate);
    return () => {
      window.removeEventListener('fitkit_user_updated', handleUserUpdate);
      window.removeEventListener('fitkit_profile_photo_changed', handleUserUpdate);
    };
  }, []);
  useEffect(() => {
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 15000);
    window.addEventListener('fitkit_notifications_changed', refreshNotifications);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('fitkit_notifications_changed', refreshNotifications);
    };
  }, [refreshNotifications]);
  // Multi-tier check for Admin status
  const isAdmin = user?.role === 'Admin';

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
            <UserAvatar name={user?.name||'User'} photoUrl={user?.photo_url} className="w-8 h-8 hidden sm:inline-flex" />
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
              {isAdmin ? 'Head Curator' : 'Active Member'}
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
              onClick={() => { refreshNotifications(); setShowNotifications((v) => !v); }}
              className="relative text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/5 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {databaseUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-400 text-[10px] font-bold text-slate-900 flex items-center justify-center">
                  {databaseUnread}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700 p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Notifications</p>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  <button type="button" onClick={() => { setShowNotifications(false); navigate('/notifications'); }} className="w-full text-left px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-200 text-xs font-semibold">
                    Open notification centre {databaseUnread > 0 ? `(${databaseUnread} unread)` : ''}
                  </button>
                  <p className="text-xs text-slate-500 text-center py-4">{databaseUnread > 0 ? 'Open the centre to review your unread items.' : 'No unread notifications.'}</p>
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
