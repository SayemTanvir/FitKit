import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Save, Target, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCountries, fetchMyProfile, updateMyProfile, setMyPhoto, removeMyPhoto } from '../services/api';
import ImageUploadField from '../components/ImageUploadField';
import UserAvatar from '../components/UserAvatar';

const emptyForm = {
  name: '',
  gender: 'Male',
  birth_date: '',
  height_cm: 170,
  weight_kg: 70,
  fitness_level: 'Beginner',
  primary_goal: 'General Fitness',
  country_id: '',
  daily_step_goal: 10000,
  daily_calorie_goal: 800,
  daily_hydration_goal: 2800,
};

type NumericField = 'height_cm' | 'weight_kg' | 'daily_step_goal' | 'daily_calorie_goal' | 'daily_hydration_goal';
type ProfileForm = Omit<typeof emptyForm, NumericField> & Record<NumericField, number | string>;
const maxBirthDate = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 16);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
})();

export default function Settings() {
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [role, setRole] = useState('Member');
  const [countries, setCountries] = useState<{ country_id: string; country_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [photoUrl,setPhotoUrl]=useState(''),[photoBusy,setPhotoBusy]=useState(false),[uploadBusy,setUploadBusy]=useState(false);

  useEffect(() => {
    fetchCountries().then(setCountries).catch(() => setCountries([]));
    fetchMyProfile()
      .then((data) => {
        const user = data.user;
        setRole(user.role);
        setPhotoUrl(user.photo_url||'');
        setForm({
          name: user.name || '',
          gender: user.gender || 'Male',
          birth_date: String(user.birth_date || '').slice(0, 10),
          height_cm: Number(user.height_cm || 170),
          weight_kg: Number(user.weight_kg || 70),
          fitness_level: user.fitness_level || 'Beginner',
          primary_goal: user.primary_goal || 'General Fitness',
          country_id: user.country_id || '',
          daily_step_goal: Number(user.daily_step_goal || 10000),
          daily_calorie_goal: Number(user.daily_calorie_goal || 800),
          daily_hydration_goal: Number(user.daily_hydration_goal || 2800),
        });
      })
      .catch((error) => setLoadError(error.message || 'Could not load settings'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (name: keyof typeof form, value: string | number) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const updateNumberField = (name: NumericField, raw: string) => {
    updateField(name, raw === '' ? '' : Number(raw));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if ([form.height_cm, form.weight_kg, ...(['Member','Admin'].includes(role) ? [form.daily_step_goal, form.daily_calorie_goal, form.daily_hydration_goal] : [])].some((value) => value === '')) {
      toast.error('Complete all numeric fields before saving');
      return;
    }
    setSaving(true);
    try {
      const data = await updateMyProfile({
        ...form,
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        daily_step_goal: Number(form.daily_step_goal),
        daily_calorie_goal: Number(form.daily_calorie_goal),
        daily_hydration_goal: Number(form.daily_hydration_goal),
      });
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: data.user.name }));
      window.dispatchEvent(new Event('fitkit_user_updated'));
      toast.success('Profile and goals saved');
    } catch (error: any) {
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const syncPhoto=(photo_url:string|null)=>{setPhotoUrl(photo_url||'');const user=JSON.parse(localStorage.getItem('user')||'{}');localStorage.setItem('user',JSON.stringify({...user,photo_url}));window.dispatchEvent(new Event('fitkit_profile_photo_changed'));};
  const savePhoto=async()=>{if(uploadBusy)return;setPhotoBusy(true);try{const result=await setMyPhoto(photoUrl);syncPhoto(result.photo_url);toast.success('Profile picture saved');}catch(e:any){toast.error(e.message);}finally{setPhotoBusy(false);}};
  const removePhoto=async()=>{setPhotoBusy(true);try{await removeMyPhoto();syncPhoto(null);toast.success('Profile picture removed');}catch(e:any){toast.error(e.message);}finally{setPhotoBusy(false);}};

  if (loading) {
    return <div className="glass rounded-2xl p-8 text-slate-400">Loading settings...</div>;
  }

  if (loadError) {
    return <div role="alert" className="glass rounded-2xl p-8 text-red-300">{loadError}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center"><UserRound className="w-5 h-5" /></span>
          <div><h1 className="font-display font-semibold text-2xl text-white">Profile Settings</h1><p className="text-sm text-slate-400">Keep your fitness calculations accurate.</p></div>
        </div>
        <div className="rounded-xl border border-white/10 p-4 mb-6 space-y-3"><div className="flex items-center gap-3"><UserAvatar name={form.name||'FitKit User'} photoUrl={photoUrl} className="w-12 h-12"/><p className="text-sm font-semibold text-white">Profile picture <span className="font-normal text-slate-400">(optional)</span></p></div><ImageUploadField label="Choose a picture from your gallery" value={photoUrl} onChange={setPhotoUrl} purpose="avatar" onBusyChange={setUploadBusy}/><div className="flex gap-3"><button type="button" onClick={savePhoto} disabled={photoBusy||uploadBusy} className="text-xs text-cyan-300 disabled:opacity-50">Save picture</button>{photoUrl&&<button type="button" onClick={removePhoto} disabled={photoBusy} className="text-xs text-red-300 disabled:opacity-50">Remove picture</button>}</div></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name"><input value={form.name} onChange={(e) => updateField('name', e.target.value)} required className="input-pro" /></Field>
          <Field label="Birth date"><input type="date" value={form.birth_date} max={maxBirthDate} onChange={(e) => updateField('birth_date', e.target.value)} required className="input-pro" /></Field>
          <Field label="Gender"><select value={form.gender} onChange={(e) => updateField('gender', e.target.value)} className="input-pro"><option>Male</option><option>Female</option></select></Field>
          <Field label="Fitness level"><select value={form.fitness_level} onChange={(e) => updateField('fitness_level', e.target.value)} className="input-pro"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field>
          <Field label="Height (cm)"><input type="number" min="1" value={form.height_cm} onChange={(e) => updateNumberField('height_cm', e.target.value)} required className="input-pro" /></Field>
          <Field label="Weight (kg)"><input type="number" min="1" step="0.1" value={form.weight_kg} onChange={(e) => updateNumberField('weight_kg', e.target.value)} required className="input-pro" /></Field>
          <Field label="Primary goal"><select value={form.primary_goal} onChange={(e) => updateField('primary_goal', e.target.value)} className="input-pro"><option>General Fitness</option><option>Weight Loss</option><option>Muscle Gain</option><option>Strength</option><option>Flexibility</option></select></Field>
          <Field label="Country (optional)"><select value={form.country_id} onChange={(e) => updateField('country_id', e.target.value)} className="input-pro"><option value="">Not set</option>{countries.map((country) => <option key={country.country_id} value={country.country_id}>{country.country_name}</option>)}</select></Field>
        </div>
      </div>

      {['Member','Admin'].includes(role) && (
        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-300 flex items-center justify-center"><Target className="w-5 h-5" /></span>
            <div><h2 className="font-display font-semibold text-xl text-white">Daily Goals</h2><p className="text-sm text-slate-400">These targets power your dashboard progress.</p></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Steps"><input type="number" min="1000" step="500" value={form.daily_step_goal} onChange={(e) => updateNumberField('daily_step_goal', e.target.value)} className="input-pro" required /></Field>
            <Field label="Calories (kcal)"><input type="number" min="100" step="50" value={form.daily_calorie_goal} onChange={(e) => updateNumberField('daily_calorie_goal', e.target.value)} className="input-pro" required /></Field>
            <Field label="Hydration (ml)"><input type="number" min="500" step="100" value={form.daily_hydration_goal} onChange={(e) => updateNumberField('daily_hydration_goal', e.target.value)} className="input-pro" required /></Field>
          </div>
        </div>
      )}

      <button type="submit" disabled={saving} className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</span>{children}</label>;
}
