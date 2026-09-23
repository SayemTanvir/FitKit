import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { enrollmentLogs, finishProgrammeSession, getProgramme, myEnrollments, saveWorkoutSet, startProgrammeSession } from '../services/programmes';
import type { Enrollment, Prescription, Programme } from '../services/programmes';
import { StoredImage } from '../components/UserAvatar';

export function MyProgrammeSchedule() {
  const { enrollmentId } = useParams();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      const selected = (await myEnrollments()).find((item)=>item.enrollment_id===Number(enrollmentId));
      if (!selected) throw new Error('Enrollment not found.');
      setEnrollment(selected);
      const [structure, history] = await Promise.all([getProgramme(selected.programme_id, selected.version_id),enrollmentLogs(selected.enrollment_id)]);
      setProgramme(structure); setLogs(history);
    })().catch((e)=>setError(e.message));
  },[enrollmentId]);
  if (error) return <div role="alert" className="glass rounded-2xl p-6 text-red-300">{error}</div>;
  if (!programme || !enrollment) return <div className="glass rounded-2xl p-6 text-slate-400">Loading your programme...</div>;
  const next = programme.weeks.flatMap((week)=>week.days).find((day)=>day.session_id && !logs.some((log)=>log.session_id===day.session_id&&log.status==='Completed'));
  return <div className="max-w-5xl space-y-5"><div className="glass rounded-2xl p-6"><Link to="/my-programmes" className="text-xs text-cyan-300">← My Programmes</Link><h1 className="font-display text-2xl font-semibold text-white mt-2">{programme.name}</h1><p className="text-sm text-slate-400">Version {enrollment.version_number} · {enrollment.completed_sessions}/{enrollment.total_sessions} sessions completed ({enrollment.total_sessions?Math.round(enrollment.completed_sessions/enrollment.total_sessions*100):0}%)</p>{next && <p className="text-sm text-lime-300 mt-3">Next workout: {next.session_title}</p>}{enrollment.status==='Paused' && <p className="text-sm text-amber-200 mt-2">Resume this programme from My Programmes before recording workouts.</p>}</div>{programme.weeks.map((week)=><section key={week.week_number} className="glass rounded-2xl p-5"><h2 className="font-display text-lg font-semibold text-white">Week {week.week_number}{week.is_deload?' · Deload':''}</h2><div className="grid sm:grid-cols-2 gap-3 mt-3">{week.days.map((day)=>{const log=logs.find((item)=>item.session_id===day.session_id);return <div key={day.day_number} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-slate-400">Day {day.day_number} · {day.day_type}</p><p className="text-sm font-semibold text-white mt-1">{day.day_type==='Training'?day.session_title:day.title||'Rest'}</p>{day.session_id && <><p className="text-xs text-slate-400 mt-1">{day.exercises.length} exercises · {log?.status||'Not started'}</p><Link to={`/my-programmes/${enrollment.enrollment_id}/sessions/${day.session_id}`} className="inline-block text-xs font-semibold text-cyan-300 mt-2">{log?.status==='Completed'?'View results':'Open workout'} →</Link></>}</div>})}</div></section>)}</div>;
}

type SetDraft = { actual_reps: string; actual_load_kg: string; duration_seconds: string; distance_meters: string; rpe: string; completed: boolean };
const emptySet = (): SetDraft => ({actual_reps:'',actual_load_kg:'',duration_seconds:'',distance_meters:'',rpe:'',completed:false});

export function ProgrammeWorkoutSession() {
  const { enrollmentId, sessionId } = useParams();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [log, setLog] = useState<any>(null);
  const [sets, setSets] = useState<Record<string,SetDraft>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(()=>{
    (async()=>{
      const selected=(await myEnrollments()).find((item)=>item.enrollment_id===Number(enrollmentId));
      if(!selected) throw new Error('Enrollment not found.');
      setEnrollment(selected);
      const [structure,history]=await Promise.all([getProgramme(selected.programme_id,selected.version_id),enrollmentLogs(selected.enrollment_id)]);
      if(!structure.weeks.some((week)=>week.days.some((day)=>day.session_id===Number(sessionId)))) throw new Error('Session does not belong to this programme.');
      setProgramme(structure);
      const existing=history.find((item)=>item.session_id===Number(sessionId));
      setLog(existing||null); setNotes(existing?.notes||'');
      const saved: Record<string,SetDraft>={};
      for(const row of existing?.sets||[]) saved[`${row.prescription_id}-${row.set_number}`]={actual_reps:row.actual_reps?.toString()||'',actual_load_kg:row.actual_load_kg?.toString()||'',duration_seconds:row.duration_seconds?.toString()||'',distance_meters:row.distance_meters?.toString()||'',rpe:row.rpe?.toString()||'',completed:row.completed};
      setSets(saved);
    })().catch((e)=>setError(e.message));
  },[enrollmentId,sessionId]);
  const day=programme?.weeks.flatMap((week)=>week.days).find((item)=>item.session_id===Number(sessionId));
  const begin=async()=>{setBusy(true);try{const created=await startProgrammeSession(Number(enrollmentId),Number(sessionId));setLog(created);}catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
  const update=(key:string,field:keyof SetDraft,value:string|boolean)=>setSets((previous)=>({...previous,[key]:{...(previous[key]||emptySet()),[field]:value}}));
  const save=async(x:Prescription,setNumber:number)=>{
    if(!log) return;
    const key=`${x.prescription_id}-${setNumber}`, draft=sets[key]||emptySet();
    if(draft.completed && (x.tracking_type==='reps'&&!draft.actual_reps||x.tracking_type==='time'&&!draft.duration_seconds||x.tracking_type==='distance'&&!draft.distance_meters)){toast.error('Enter actual performance before marking a set complete.');return;}
    setBusy(true);try{await saveWorkoutSet(log.log_id,Number(x.prescription_id),setNumber,{...draft,actual_reps:draft.actual_reps||null,actual_load_kg:draft.actual_load_kg||null,duration_seconds:draft.duration_seconds||null,distance_meters:draft.distance_meters||null,rpe:draft.rpe||null});toast.success('Set saved');}catch(e:any){toast.error(e.message);}finally{setBusy(false);}
  };
  const finish=async()=>{if(!log)return;setBusy(true);try{await finishProgrammeSession(log.log_id,notes);toast.success('Workout completed');navigate(`/my-programmes/${enrollmentId}`);}catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
  if(error) return <div role="alert" className="glass rounded-2xl p-6 text-red-300">{error}</div>;
  if(!day||!enrollment) return <div className="glass rounded-2xl p-6 text-slate-400">Loading workout...</div>;
  const readonly=log?.status==='Completed';
  return <div className="max-w-4xl space-y-5"><div className="glass rounded-2xl p-6"><Link to={`/my-programmes/${enrollmentId}`} className="text-xs text-cyan-300">← Programme schedule</Link><h1 className="font-display text-2xl font-semibold text-white mt-2">{day.session_title}</h1><p className="text-sm text-slate-400 mt-1">{day.estimated_minutes} minutes planned · {log?.status||'Not started'}</p>{!log && <button type="button" onClick={begin} disabled={busy||enrollment.status!=='Active'} className="btn-primary rounded-xl px-5 py-2.5 font-semibold mt-4 disabled:opacity-50">Start workout</button>}{!log && <p className="text-xs text-slate-500 mt-2">Opening this page does not count as progress.</p>}</div>{day.exercises.map((x)=><section key={x.prescription_id} className="glass rounded-2xl p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold text-white">{x.exercise_name}</h2><span className="text-xs text-lime-300">{x.sets} sets</span></div><p className="text-xs text-slate-400 mt-1">Target: {x.tracking_type==='reps'?`${x.rep_min}–${x.rep_max} reps`:x.tracking_type==='time'?`${x.duration_seconds} seconds`:`${x.distance_meters} metres`}{x.target_load_kg?` · ${x.target_load_kg} kg`:''} · Rest {x.rest_seconds}s{x.is_warmup?' · Warm-up':''}</p>{x.notes&&<p className="text-xs text-slate-400 mt-2">{x.notes}</p>}{x.exercise_media_url&&<StoredImage url={x.exercise_media_url} alt={`${x.exercise_name} demonstration`} className="max-h-48 rounded-xl mt-3 object-cover"/>}<div className="space-y-3 mt-4">{Array.from({length:x.sets},(_,index)=>{const setNumber=index+1,key=`${x.prescription_id}-${setNumber}`,draft=sets[key]||emptySet();return <div key={key} className="flex flex-wrap items-end gap-2 rounded-xl bg-white/[0.03] p-3"><span className="text-xs text-slate-400 w-12">Set {setNumber}</span>{x.tracking_type==='reps'&&<label className="text-xs text-slate-400">Reps<input type="number" min="0" value={draft.actual_reps} onChange={(e)=>update(key,'actual_reps',e.target.value)} disabled={!log||readonly} className="input-pro mt-1 w-20" /></label>}{x.tracking_type==='time'&&<label className="text-xs text-slate-400">Seconds<input type="number" min="0" value={draft.duration_seconds} onChange={(e)=>update(key,'duration_seconds',e.target.value)} disabled={!log||readonly} className="input-pro mt-1 w-24" /></label>}{x.tracking_type==='distance'&&<label className="text-xs text-slate-400">Metres<input type="number" min="0" value={draft.distance_meters} onChange={(e)=>update(key,'distance_meters',e.target.value)} disabled={!log||readonly} className="input-pro mt-1 w-24" /></label>}<label className="text-xs text-slate-400">Kg<input type="number" min="0" step="0.5" value={draft.actual_load_kg} onChange={(e)=>update(key,'actual_load_kg',e.target.value)} disabled={!log||readonly} className="input-pro mt-1 w-20" /></label><label className="text-xs text-slate-400">RPE<input type="number" min="0" max="10" step="0.5" value={draft.rpe} onChange={(e)=>update(key,'rpe',e.target.value)} disabled={!log||readonly} className="input-pro mt-1 w-20" /></label><label className="flex items-center gap-1 text-xs text-slate-300"><input type="checkbox" checked={draft.completed} onChange={(e)=>update(key,'completed',e.target.checked)} disabled={!log||readonly} /> Done</label>{log&&!readonly&&<button type="button" disabled={busy} onClick={()=>save(x,setNumber)} className="rounded-lg bg-cyan-500/20 text-cyan-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">Save set</button>}</div>})}</div></section>)}{log&&!readonly&&<div className="glass rounded-2xl p-5"><label className="block text-xs text-slate-400">Workout notes<textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="input-pro mt-1 w-full min-h-20" /></label><button type="button" onClick={finish} disabled={busy} className="btn-primary rounded-xl px-5 py-3 font-semibold mt-4 disabled:opacity-50">Finish workout</button><p className="text-xs text-slate-500 mt-2">All prescribed sets must be saved as complete.</p></div>}</div>;
}
