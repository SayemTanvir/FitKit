import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, Trash2 } from 'lucide-react';
import { deleteNotification, notifications as fetchCommunityNotifications, readNotification } from '../services/community';
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
  const [notificationItems, setNotificationItems] = useState<any[]>([]);
  const navigate = useNavigate();
  const [user, setUser] = useState(readStoredUser());
  const refreshNotifications = useCallback(() => {
    fetchCommunityNotifications()
      .then((items) => {
        setNotificationItems(items);
        setDatabaseUnread(items.filter((item) => !item.is_read).length);
      })
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

  const openNotification = async (item: any) => {
    setShowNotifications(false);
    if (!item.is_read) {
      setNotificationItems((current) => current.map((entry) => entry.notification_id === item.notification_id ? { ...entry, is_read: true } : entry));
      setDatabaseUnread((count) => Math.max(0, count - 1));
      readNotification(item.notification_id).catch(refreshNotifications);
    }
    navigate(item.link_path?.startsWith('/') ? item.link_path : '/notifications');
  };

  const removeNotification = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    const existing = notificationItems.find((item) => item.notification_id === id);
    setNotificationItems((current) => current.filter((item) => item.notification_id !== id));
    if (existing && !existing.is_read) setDatabaseUnread((count) => Math.max(0, count - 1));
    try { await deleteNotification(id); } catch { refreshNotifications(); }
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
                  {notificationItems.slice(0, 6).map((item) => (
                    <div key={item.notification_id} className={`flex items-start rounded-xl ${item.is_read ? 'bg-white/[0.03]' : 'bg-cyan-500/10'}`}>
                      <button type="button" onClick={() => openNotification(item)} className="min-w-0 flex-1 text-left px-3 py-2.5">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{item.message}</p>
                      </button>
                      <button type="button" onClick={(event) => removeNotification(event, item.notification_id)} aria-label={`Delete ${item.title}`} className="p-2.5 text-slate-500 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {!notificationItems.length && <p className="text-xs text-slate-500 text-center py-4">No notifications.</p>}
                  <button type="button" onClick={() => { setShowNotifications(false); navigate('/notifications'); }} className="w-full text-left px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-200 text-xs font-semibold">
                    View all notifications {databaseUnread > 0 ? `(${databaseUnread} unread)` : ''}
                  </button>
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
