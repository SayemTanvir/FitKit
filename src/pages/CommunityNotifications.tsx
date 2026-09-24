import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import {
  clearNotifications,
  deleteNotification,
  moderationReports,
  notifications,
  readNotification,
  resolveReport,
  suspendMember,
} from '../services/community';
import toast from 'react-hot-toast';
import UserAvatar from '../components/UserAvatar';

export function NotificationCenter() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const load = () => notifications().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const open = async (item: any) => {
    try {
      if (!item.is_read) await readNotification(item.notification_id);
      window.dispatchEvent(new Event('fitkit_notifications_changed'));
      if (item.link_path?.startsWith('/')) navigate(item.link_path);
      else load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteNotification(id);
      setItems((current) => current.filter((item) => item.notification_id !== id));
      window.dispatchEvent(new Event('fitkit_notifications_changed'));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const clear = async () => {
    if (!items.length || !window.confirm('Delete all notifications?')) return;
    try {
      await clearNotifications();
      setItems([]);
      window.dispatchEvent(new Event('fitkit_notifications_changed'));
      toast.success('Notifications cleared');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return <div className="max-w-3xl space-y-5">
    <div className="glass rounded-2xl p-6 flex items-center justify-between gap-4">
      <div><h1 className="font-display text-2xl font-semibold text-white">Notifications</h1><p className="text-sm text-slate-400 mt-1">Requests, messages, reactions, and goal milestones are stored here.</p></div>
      {items.length > 0 && <button type="button" onClick={clear} className="text-xs text-red-300 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Clear all</button>}
    </div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!items.length && <p className="text-sm text-slate-400">No notifications yet.</p>}
    {items.map((item) => <article key={item.notification_id} className={`glass rounded-2xl p-4 flex items-start gap-3 ${!item.is_read ? 'border-lime-400/30' : ''}`}>
      <button type="button" onClick={() => open(item)} className="flex-1 text-left">
        <p className="text-sm font-semibold text-white">{item.title}{!item.is_read && <span className="ml-2 text-lime-300">●</span>}</p>
        <p className="text-xs text-slate-400 mt-1">{item.message} · {new Date(item.created_at).toLocaleString()}</p>
      </button>
      <button type="button" onClick={() => remove(item.notification_id)} aria-label={`Delete ${item.title}`} className="p-2 text-slate-500 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
    </article>)}
  </div>;
}

export function ModerationQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const load = () => moderationReports().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const decide = async (id: number, status: 'Resolved' | 'Dismissed', remove = false) => {
    const note = window.prompt('Moderation note (optional)') || '';
    try {
      await resolveReport(id, status, note, remove);
      toast.success('Report reviewed');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return <div className="max-w-4xl space-y-5">
    <div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">Moderation Queue</h1><p className="text-sm text-slate-400 mt-1">Moderation is where admins review member reports, remove rule-breaking posts or comments, suspend accounts when necessary, or dismiss invalid reports. Every decision is recorded in the audit log.</p></div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!items.length && <p className="text-sm text-slate-400">No open reports. New member reports will appear here.</p>}
    {items.map((item) => <div key={item.report_id} className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2"><UserAvatar name={item.reporter_name} photoUrl={item.photo_url} /><p className="text-xs text-cyan-300">{item.target_type} #{item.target_id} · Reported by {item.reporter_name}</p></div>
      <p className="text-sm text-white mt-2">{item.reason}</p>
      <div className="flex gap-3 mt-4">
        <button type="button" onClick={() => decide(item.report_id, 'Resolved')} className="text-xs text-lime-300">Resolve</button>
        {['Post', 'Comment'].includes(item.target_type) && <button type="button" onClick={() => decide(item.report_id, 'Resolved', true)} className="text-xs text-red-300">Remove content & resolve</button>}
        {item.target_type === 'Member' && <button type="button" onClick={async () => { const note = window.prompt('Reason for suspension?'); if (!note) return; try { await suspendMember(item.target_id, true, note); await decide(item.report_id, 'Resolved'); } catch (e: any) { toast.error(e.message); } }} className="text-xs text-red-300">Suspend member</button>}
        <button type="button" onClick={() => decide(item.report_id, 'Dismissed')} className="text-xs text-slate-300">Dismiss</button>
      </div>
    </div>)}
  </div>;
}
