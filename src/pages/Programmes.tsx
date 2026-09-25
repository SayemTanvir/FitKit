import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Dumbbell, Plus, CalendarDays, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteProgramme, enrollProgramme, getProgramme, listProgrammes, myEnrollments, removeEnrollment, setEnrollmentStatus } from '../services/programmes';
import type { Enrollment, Programme } from '../services/programmes';
import UserAvatar, { StoredImage } from '../components/UserAvatar';

const role = () => JSON.parse(localStorage.getItem('user') || '{}').role;

export function ProgrammeCatalog() {
  const currentUser=JSON.parse(localStorage.getItem('user')||'{}');
  const admin = currentUser.role === 'Admin';
  const [items, setItems] = useState<Programme[]>([]);
  const [search, setSearch] = useState('');
  const [goal, setGoal] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const request=admin
      ? Promise.all([listProgrammes(false),listProgrammes(true)]).then(([publicItems,ownedItems])=>Array.from(new Map([...publicItems,...ownedItems].map((item)=>[item.programme_id,item])).values()))
      : listProgrammes(false);
    request.then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [admin]);
  const visible = items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) && (goal === 'All' || p.goal === goal) && (difficulty === 'All' || p.difficulty === difficulty));
  const goals = [...new Set(items.map((p) => p.goal))];
  const remove = async (p: Programme) => {
    if (!window.confirm(`Permanently delete “${p.name}”? Its member enrollments and workout progress will also be deleted. This cannot be undone.`)) return;
    try {
      await deleteProgramme(p.programme_id);
      setItems((previous) => previous.filter((item) => item.programme_id !== p.programme_id));
      toast.success('Programme deleted');
    } catch (e: any) { toast.error(e.message); }
  };
  return <div className="space-y-6">
    <div className="glass rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-display text-2xl font-semibold text-white">Explore Programmes</h1><p className="text-sm text-slate-400 mt-1">Find a structured training programme that fits your goals.{admin?' You can also create and manage programmes.':''}</p></div>{admin && <Link className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2" to="/programmes/new"><Plus className="w-4 h-4" /> New programme</Link>}</div>
    <div className="glass rounded-2xl p-4 grid sm:grid-cols-3 gap-3"><input aria-label="Search programmes" placeholder="Search programmes" value={search} onChange={(e)=>setSearch(e.target.value)} className="input-pro" /><select aria-label="Filter by goal" value={goal} onChange={(e)=>setGoal(e.target.value)} className="input-pro"><option>All</option>{goals.map((value)=><option key={value}>{value}</option>)}</select><select aria-label="Filter by difficulty" value={difficulty} onChange={(e)=>setDifficulty(e.target.value)} className="input-pro"><option>All</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
    {loading && <p className="text-slate-400">Loading programmes...</p>}{error && <p role="alert" className="text-red-300">{error}</p>}
    {!loading && !error && !visible.length && <p className="glass rounded-2xl p-6 text-slate-400">No programmes match these filters.</p>}
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{visible.map((p)=>{const manageable=admin;return <article key={p.programme_id} className="glass rounded-2xl overflow-hidden"><div className="h-28 bg-gradient-to-br from-lime-400/25 to-cyan-500/10 flex items-center justify-center">{p.cover_url ? <StoredImage url={p.cover_url} alt="" className="w-full h-full object-cover" /> : <Dumbbell className="w-10 h-10 text-lime-300" />}</div><div className="p-5 space-y-2"><div className="flex justify-between gap-2"><h2 className="font-display font-semibold text-white">{p.name}</h2><span className="text-xs text-lime-300">{p.status}</span></div><p className="text-xs text-slate-400 line-clamp-2">{p.description}</p><p className="text-xs text-slate-400">{p.goal} · {p.difficulty} · {p.duration_weeks} weeks · {p.days_per_week} days/week</p><p className="text-xs text-slate-500 flex items-center gap-2"><UserAvatar name={p.creator_name} photoUrl={p.creator_photo_url} className="w-6 h-6"/>By {p.creator_name}</p><Link to={`/programmes/${p.programme_id}`} className="inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200 mt-2">View full schedule →</Link>{manageable&&<><Link to={`/programmes/${p.programme_id}/edit`} className="block text-xs text-blue-300 mt-2">Edit programme</Link><button type="button" onClick={()=>remove(p)} className="block text-xs text-red-300 mt-2">Delete programme</button></>}</div></article>})}</div>
  </div>;
}

export function ProgrammeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Programme | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getProgramme(Number(id)).then(setItem).catch((e)=>setError(e.message)).finally(()=>setLoading(false)); }, [id]);
  const enroll = async () => { setBusy(true); try { await enrollProgramme(Number(id)); toast.success('Programme added to My Programmes'); navigate('/my-programmes'); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  if (loading) return <div className="glass rounded-2xl p-6 text-slate-400">Loading programme...</div>;
  if (error || !item) return <div role="alert" className="glass rounded-2xl p-6 text-red-300">{error || 'Programme not found.'}</div>;
  return <div className="max-w-5xl space-y-6"><div className="glass rounded-2xl overflow-hidden">{item.cover_url && <StoredImage url={item.cover_url} alt="" className="w-full h-48 object-cover" />}<div className="p-6 sm:p-8"><p className="text-xs uppercase tracking-widest text-lime-300">{item.goal} · {item.difficulty}</p><h1 className="font-display text-3xl font-semibold text-white mt-2">{item.name}</h1><p className="text-slate-300 mt-3">{item.description}</p><p className="text-sm text-slate-400 mt-4">{item.duration_weeks} weeks · {item.days_per_week} sessions/week · ~{item.session_minutes} min/session · {item.environment}</p><p className="text-sm text-slate-400 mt-2 flex items-center gap-2"><UserAvatar name={item.creator_name} photoUrl={item.creator_photo_url} className="w-6 h-6"/>By {item.creator_name}</p>{item.equipment && <p className="text-sm text-slate-400 mt-2">Equipment: {item.equipment}</p>}{item.prerequisites && <p className="text-sm text-slate-400 mt-2">Prerequisites: {item.prerequisites}</p>}{item.restrictions && <p className="text-sm text-amber-200 mt-2">Considerations: {item.restrictions}</p>}{['Member','Admin'].includes(role()) && item.status==='Published' && <button type="button" onClick={enroll} disabled={busy} className="btn-primary rounded-xl px-5 py-3 font-semibold mt-5 disabled:opacity-50">{busy ? 'Enrolling...' : 'Start this programme'}</button>}</div></div>
    <div className="space-y-4">{item.weeks.map((week)=><section key={week.week_number} className="glass rounded-2xl p-5"><h2 className="font-display text-xl font-semibold text-white">Week {week.week_number}{week.is_deload ? ' · Deload' : ''}</h2>{week.progression_notes && <p className="text-sm text-slate-400 mt-1">{week.progression_notes}</p>}<div className="grid md:grid-cols-2 gap-3 mt-4">{week.days.map((day)=><div key={day.day_number} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-cyan-300">Day {day.day_number} · {day.day_type}</p><h3 className="text-sm font-semibold text-white mt-1">{day.day_type==='Training' ? day.session_title : day.title || 'Recovery'}</h3>{day.exercises.map((x)=><p key={x.prescription_id} className="text-xs text-slate-400 mt-2">{x.exercise_name} · {x.sets} × {x.tracking_type==='reps' ? `${x.rep_min}${x.rep_max!==x.rep_min?`–${x.rep_max}`:''} reps` : x.tracking_type==='time' ? `${x.duration_seconds}s` : `${x.distance_meters}m`}{x.target_load_kg ? ` · ${x.target_load_kg} kg` : ''}</p>)}</div>)}</div></section>)}</div>
  </div>;
}

export function MyProgrammes() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<number | null>(null);
  useEffect(()=>{ myEnrollments().then(setItems).catch((e)=>setError(e.message)); },[]);
  const changeStatus = async (id: number, status: 'Active'|'Paused') => { try { await setEnrollmentStatus(id,status); setItems((previous)=>previous.map((item)=>item.enrollment_id===id?{...item,status}:item)); } catch (e: any) { toast.error(e.message); } };
  const remove = async (item: Enrollment) => { if (!window.confirm(`Remove “${item.name}” and permanently delete its workout progress?`)) return; setRemoving(item.enrollment_id); try { await removeEnrollment(item.enrollment_id); setItems((previous)=>previous.filter((entry)=>entry.enrollment_id!==item.enrollment_id)); toast.success('Programme removed'); } catch (e: any) { toast.error(e.message); } finally { setRemoving(null); } };
  return <div className="space-y-5"><div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">My Programmes</h1><p className="text-sm text-slate-400 mt-1">Progress is earned by completing prescribed sets and sessions.</p></div>{error && <p role="alert" className="text-red-300">{error}</p>}{!error && !items.length && <p className="text-slate-400">No enrollments yet. <Link to="/programmes" className="text-cyan-300">Explore programmes</Link>.</p>}{items.map((item)=><div key={item.enrollment_id} className="glass rounded-2xl p-5 flex flex-wrap items-center gap-4"><CalendarDays className="w-6 h-6 text-lime-300" /><div className="flex-1"><h2 className="font-semibold text-white">{item.name}</h2><p className="text-xs text-slate-400">Version {item.version_number} · {item.status} · {item.completed_sessions}/{item.total_sessions} sessions complete</p></div><Link to={`/my-programmes/${item.enrollment_id}`} className="text-sm font-semibold text-cyan-300">Open schedule</Link><button type="button" onClick={()=>changeStatus(item.enrollment_id,item.status==='Paused'?'Active':'Paused')} className="text-xs text-slate-300 border border-white/10 rounded-lg px-3 py-2">{item.status==='Paused'?'Resume':'Pause'}</button><button type="button" aria-label={`Remove ${item.name}`} title="Remove programme and its progress" disabled={removing!==null} onClick={()=>remove(item)} className="p-2 text-red-300 hover:bg-red-400/10 rounded-lg disabled:opacity-50"><Trash2 className="w-4 h-4" />{removing===item.enrollment_id&&<span className="sr-only">Removing</span>}</button></div>)}</div>;
}
