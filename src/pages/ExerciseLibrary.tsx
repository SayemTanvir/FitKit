import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchExercises, saveExerciseLibraryItem, setExerciseActive } from '../services/api';
import ImageUploadField from '../components/ImageUploadField';
import { StoredImage } from '../components/UserAvatar';

const blank = {
  name: '', description: '', category: 'Strength', movement_pattern: '', target_muscle_group: '',
  secondary_muscles: '', equipment_needed: '', optional_equipment: '', difficulty_level: 'Beginner',
  tracking_type: 'reps', instructions: '', media_url: '', calorie_factor: 0.3,
};

const textFields = [
  ['name', 'Exercise name', 'Example: Goblet squat'],
  ['target_muscle_group', 'Primary muscle', 'Example: Quadriceps'],
  ['movement_pattern', 'Movement pattern', 'Example: Squat, push, pull, hinge'],
  ['equipment_needed', 'Required equipment', 'Leave blank for bodyweight'],
  ['optional_equipment', 'Optional equipment', 'Useful alternatives'],
  ['secondary_muscles', 'Secondary muscles', 'Comma-separated'],
] as const;

export default function ExerciseLibrary() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const load = () => fetchExercises().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const edit = (item: any) => {
    setEditing(item.exercise_id);
    setForm({
      name: item.name, description: item.description || '', category: item.category,
      movement_pattern: item.movement_pattern || '', target_muscle_group: item.target_muscle_group,
      secondary_muscles: (item.secondary_muscles || []).join(', '), equipment_needed: item.equipment_needed || '',
      optional_equipment: item.optional_equipment || '', difficulty_level: item.difficulty_level,
      tracking_type: item.tracking_type, instructions: item.instructions || '', media_url: item.media_url || '',
      calorie_factor: Number(item.calorie_factor || 0.3),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploadBusy) return;
    setBusy(true);
    try {
      await saveExerciseLibraryItem({
        ...form,
        secondary_muscles: form.secondary_muscles.split(',').map((value) => value.trim()).filter(Boolean),
      }, editing || undefined);
      toast.success(editing ? 'Exercise updated' : 'Exercise added');
      setEditing(null);
      setForm(blank);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const toggle = async (item: any) => {
    try {
      await setExerciseActive(item.exercise_id, !item.is_active);
      await load();
    } catch (e: any) { toast.error(e.message); }
  };
  const shown = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) && (category === 'All' || item.category === category));

  return <div className="space-y-6">
    <div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">Exercise Library</h1><p className="text-sm text-slate-400 mt-1">The library is the admin-approved catalogue used when building programmes. Define an exercise once, then reuse it across any number of weekly schedules.</p></div>
    <section className="grid md:grid-cols-3 gap-3">
      <div className="glass rounded-2xl p-4"><p className="text-xs text-lime-300 font-semibold">1 · Define</p><p className="text-sm text-slate-300 mt-2">Add technique, muscles, equipment, difficulty, and how performance is measured.</p></div>
      <div className="glass rounded-2xl p-4"><p className="text-xs text-cyan-300 font-semibold">2 · Prescribe</p><p className="text-sm text-slate-300 mt-2">Programme Builder uses these entries to set reps/load, time, or distance targets.</p></div>
      <div className="glass rounded-2xl p-4"><p className="text-xs text-amber-300 font-semibold">3 · Archive safely</p><p className="text-sm text-slate-300 mt-2">Archived exercises cannot be added to new drafts but remain visible in published history.</p></div>
    </section>
    <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
      <div><h2 className="font-display text-lg font-semibold text-white">{editing ? 'Edit exercise' : 'New exercise'}</h2><p className="text-xs text-slate-500 mt-1">Track by controls what members record during a workout: reps and load, elapsed time, or distance.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {textFields.map(([field, label, hint]) => <label key={field} className="text-xs text-slate-400">{label}<input value={form[field]} placeholder={hint} onChange={(e) => setForm((previous) => ({ ...previous, [field]: e.target.value }))} className="input-pro mt-1" required={field === 'name' || field === 'target_muscle_group'} /></label>)}
        <label className="text-xs text-slate-400">Category<select value={form.category} onChange={(e) => setForm((previous) => ({ ...previous, category: e.target.value }))} className="input-pro mt-1"><option>Strength</option><option>Cardio</option><option>Flexibility</option></select></label>
        <label className="text-xs text-slate-400">Difficulty<select value={form.difficulty_level} onChange={(e) => setForm((previous) => ({ ...previous, difficulty_level: e.target.value }))} className="input-pro mt-1"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label className="text-xs text-slate-400">Track by<select value={form.tracking_type} onChange={(e) => setForm((previous) => ({ ...previous, tracking_type: e.target.value }))} className="input-pro mt-1"><option value="reps">Reps and load</option><option value="time">Time</option><option value="distance">Distance</option></select></label>
        <label className="text-xs text-slate-400">Calorie factor<input type="number" min="0.01" step="0.01" value={form.calorie_factor} onChange={(e) => setForm((previous) => ({ ...previous, calorie_factor: Number(e.target.value) }))} className="input-pro mt-1" /><span className="block mt-1 text-[10px] text-slate-500">Estimate multiplier used by workout calorie calculations.</span></label>
      </div>
      <ImageUploadField label="Exercise demonstration image (optional)" value={form.media_url} onChange={(media_url) => setForm((previous) => ({ ...previous, media_url }))} purpose="exercise" onBusyChange={setUploadBusy} />
      <label className="block text-xs text-slate-400">Description<textarea value={form.description} onChange={(e) => setForm((previous) => ({ ...previous, description: e.target.value }))} className="input-pro mt-1 w-full min-h-16" /></label>
      <label className="block text-xs text-slate-400">Instructions, technique and safety<textarea value={form.instructions} onChange={(e) => setForm((previous) => ({ ...previous, instructions: e.target.value }))} className="input-pro mt-1 w-full min-h-20" /></label>
      <div className="flex gap-2"><button type="submit" disabled={busy || uploadBusy} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{busy ? 'Saving...' : 'Save exercise'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(blank); }} className="rounded-xl border border-white/10 px-4 text-sm text-slate-300">Cancel</button>}</div>
    </form>
    <section className="glass rounded-2xl p-6">
      <div className="flex flex-wrap gap-3 mb-4"><input aria-label="Search exercises" placeholder="Search exercises" value={search} onChange={(e) => setSearch(e.target.value)} className="input-pro max-w-xs" /><select aria-label="Filter exercise category" value={category} onChange={(e) => setCategory(e.target.value)} className="input-pro max-w-xs"><option>All</option><option>Strength</option><option>Cardio</option><option>Flexibility</option></select></div>
      {error && <p className="text-red-300">{error}</p>}
      <div className="grid md:grid-cols-2 gap-3">{shown.map((item) => <div key={item.exercise_id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold text-white">{item.name}</h3><span className={`text-xs ${item.is_active ? 'text-lime-300' : 'text-amber-300'}`}>{item.is_active ? 'Active' : 'Archived'}</span></div><p className="text-xs text-slate-400 mt-1">{item.category} · {item.target_muscle_group} · {item.difficulty_level} · {item.tracking_type}</p><p className="text-xs text-slate-400 mt-2 line-clamp-2">{item.instructions}</p>{item.media_url && <StoredImage url={item.media_url} alt={`${item.name} demonstration`} className="max-h-36 rounded-lg mt-2 object-cover" />}<div className="flex gap-3 mt-3"><button type="button" onClick={() => edit(item)} className="text-xs text-cyan-300">Edit</button><button type="button" onClick={() => toggle(item)} className="text-xs text-amber-300">{item.is_active ? 'Archive' : 'Restore'}</button></div></div>)}</div>
    </section>
  </div>;
}
