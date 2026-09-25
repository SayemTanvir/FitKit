import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import {
  clearNotifications,
  deleteNotification,
  moderationReportDetails,
  moderationReports,
  notifications,
  readNotification,
  resolveReport,
  suspendMember,
} from '../services/community';
import toast from 'react-hot-toast';
import UserAvatar, { StoredImage } from '../components/UserAvatar';
import { formatBangladeshDateTime } from '../utils/time';

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
        <p className="text-xs text-slate-400 mt-1">{item.message} · {formatBangladeshDateTime(item.created_at)}</p>
      </button>
      <button type="button" onClick={() => remove(item.notification_id)} aria-label={`Delete ${item.title}`} className="p-2 text-slate-500 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
    </article>)}
  </div>;
}

export function ModerationQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<Record<number, any>>({});
  const [detailsLoading, setDetailsLoading] = useState<number | null>(null);
  const [detailsError, setDetailsError] = useState<{ reportId: number; message: string } | null>(null);
  const load = () => moderationReports().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const toggleDetails = async (reportId: number) => {
    if (details[reportId]) {
      setDetails((current) => { const next = { ...current }; delete next[reportId]; return next; });
      return;
    }
    setDetailsLoading(reportId);
    setDetailsError(null);
    try {
      const reportDetails = await moderationReportDetails(reportId);
      setDetails((current) => ({ ...current, [reportId]: reportDetails }));
    }
    catch (e: any) { setDetailsError({ reportId, message: e.message || 'Could not load report details.' }); }
    finally { setDetailsLoading(null); }
  };
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
      <button type="button" aria-expanded={Boolean(details[item.report_id])} disabled={detailsLoading !== null} onClick={() => toggleDetails(item.report_id)} className="text-xs text-cyan-300 mt-3 disabled:opacity-50">
        {detailsLoading === item.report_id ? 'Loading details...' : details[item.report_id] ? 'Hide details' : item.target_type === 'Member' ? 'View reported account' : item.target_type === 'Post' ? 'View reported post' : `View reported ${item.target_type.toLowerCase()} details`}
      </button>
      {detailsError?.reportId === item.report_id && <p role="alert" className="text-xs text-red-300 mt-2">{detailsError?.message}</p>}
      {details[item.report_id] && <ReportTargetDetails report={details[item.report_id].report} target={details[item.report_id].target} />}
      <div className="flex gap-3 mt-4">
        <button type="button" onClick={() => decide(item.report_id, 'Resolved')} className="text-xs text-lime-300">Resolve</button>
        {['Post', 'Comment'].includes(item.target_type) && <button type="button" onClick={() => decide(item.report_id, 'Resolved', true)} className="text-xs text-red-300">Remove content & resolve</button>}
        {item.target_type === 'Member' && <button type="button" onClick={async () => { const note = window.prompt('Reason for suspension?'); if (!note) return; try { await suspendMember(item.target_id, true, note); await decide(item.report_id, 'Resolved'); } catch (e: any) { toast.error(e.message); } }} className="text-xs text-red-300">Suspend member</button>}
        <button type="button" onClick={() => decide(item.report_id, 'Dismissed')} className="text-xs text-slate-300">Dismiss</button>
      </div>
    </div>)}
  </div>;
}

function ReportTargetDetails({ report, target }: { report: any; target: any }) {
  if (!target) return <p className="mt-3 text-sm text-slate-400">The reported content or account is no longer available.</p>;
  if (report.target_type === 'Member') return <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-center gap-3"><UserAvatar name={target.name} photoUrl={target.photo_url} className="w-12 h-12"/><div><h3 className="font-semibold text-white">{target.name}</h3><p className="text-xs text-cyan-300">@{target.username || 'no username'} · {target.is_private ? 'Private account' : 'Public account'}</p></div></div>
    <dl className="grid sm:grid-cols-2 gap-3 mt-4 text-xs"><ReportField label="About" value={target.bio || 'No bio provided'} /><ReportField label="Fitness level" value={target.fitness_level || 'Not set'} /><ReportField label="Primary goal" value={target.primary_goal || 'Not set'} /><ReportField label="Country" value={target.country_name || 'Not set'} /><ReportField label="Interests" value={target.interests?.join(', ') || 'None listed'} /><ReportField label="Account status" value={target.suspended_at ? 'Suspended' : 'Active'} /><ReportField label="Joined" value={formatBangladeshDateTime(target.created_at)} /></dl>
  </section>;
  if (report.target_type === 'Post') return <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-center gap-3"><UserAvatar name={target.author_name} photoUrl={target.author_photo_url}/><div><h3 className="font-semibold text-white">{target.author_name}</h3><p className="text-xs text-slate-400">@{target.username || 'no username'} · {target.visibility} · {formatBangladeshDateTime(target.created_at)}</p></div></div>
    {target.deleted_at && <p className="text-xs text-amber-300 mt-3">This post has already been removed.</p>}<p className="text-sm text-slate-200 whitespace-pre-wrap mt-3">{target.body}</p>{target.image_url && <StoredImage url={target.image_url} alt="Reported post attachment" className="max-h-72 rounded-lg mt-3" />}
  </section>;
  if (report.target_type === 'Comment') return <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-center gap-3"><UserAvatar name={target.author_name} photoUrl={target.author_photo_url}/><div><h3 className="font-semibold text-white">{target.author_name}</h3><p className="text-xs text-slate-400">Comment · {formatBangladeshDateTime(target.comment_created_at)}</p></div></div>
    {target.comment_deleted_at && <p className="text-xs text-amber-300 mt-3">This comment has already been removed.</p>}<p className="text-sm text-slate-200 whitespace-pre-wrap mt-3">{target.body}</p><p className="text-xs text-slate-500 mt-4">On {target.post_author_name}'s {target.post_visibility} post</p><p className="text-sm text-slate-300 whitespace-pre-wrap mt-2">{target.post_body}</p>{target.post_image_url && <StoredImage url={target.post_image_url} alt="Reported comment post attachment" className="max-h-72 rounded-lg mt-3" />}
  </section>;
  return <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-semibold text-white">Reported message</h3><p className="text-xs text-slate-400 mt-1">From {target.sender_name} to {target.recipient_name} · {formatBangladeshDateTime(target.created_at)}</p><p className="text-sm text-slate-200 whitespace-pre-wrap mt-3">{target.body}</p></section>;
}

function ReportField({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="text-slate-200">{value}</dd></div>;
}
