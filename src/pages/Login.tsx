import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { loginUser, registerUser } from '../services/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type AuthMode = 'login' | 'signup';

export default function Login({ mode = 'login' }: { mode?: AuthMode }) {
  const navigate = useNavigate();
  const isSignup = mode === 'signup';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [weightKg, setWeightKg] = useState('70');
  const [heightCm, setHeightCm] = useState('175');
  const [fitnessLevel, setFitnessLevel] = useState('Beginner');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [primaryGoal, setPrimaryGoal] = useState('General Fitness');

  if (localStorage.getItem('token')) return <Navigate to="/dashboard" replace />;

  const validateAccount = () => {
    if (isSignup && !name.trim()) return 'Enter your full name.';
    if (!EMAIL_PATTERN.test(email.trim().toLowerCase())) return 'Enter a valid email address.';
    if (password.length < 8) return 'Your password must be at least 8 characters.';
    return '';
  };

  const continueSignup = (event: React.FormEvent) => {
    event.preventDefault();
    const message = validateAccount();
    if (message) return setError(message);
    setError('');
    setStep(2);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = validateAccount();
    if (message) return setError(message);
    setError('');
    setLoading(true);
    try {
      const data = isSignup
        ? await registerUser({ name: name.trim(), email: email.trim().toLowerCase(), password, gender, birth_date: birthDate, weight_kg: Number(weightKg), height_cm: Number(heightCm), fitness_level: fitnessLevel, primary_goal: primaryGoal })
        : await loginUser({ email: email.trim().toLowerCase(), password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete this request.');
    } finally { setLoading(false); }
  };

  return (
    <div className="public-shell relative flex min-h-screen overflow-hidden">
      <div className="public-orb public-orb-one" /><div className="public-orb public-orb-two" />
      <Link to="/" className="absolute left-5 top-5 z-20 sm:left-8 sm:top-7"><BrandMark linked={false} /></Link>
      <aside className="relative z-10 hidden w-[46%] flex-col justify-center border-r border-white/10 p-12 lg:flex xl:p-16">
        <div className="max-w-lg -translate-y-6">
          <span className="mb-6 grid h-12 w-12 place-items-center rounded-2xl border border-lime-400/20 bg-lime-400/10"><ArrowRight className="h-5 w-5 text-lime-300" /></span>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">Small actions.<br /><span className="grad-text">Visible progress.</span></h1>
          <p className="mt-5 max-w-md leading-7 text-slate-400">Plan your training, stay accountable and watch your consistency turn into results.</p>
        </div>
      </aside>
      <main className="relative z-10 flex w-full items-center justify-center px-5 py-28 lg:w-[54%]">
        <div className="w-full max-w-md">
          {isSignup && <div className="mb-7"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-lime-300">Step {step} of 2</span><span className="text-slate-500">{step === 1 ? 'Account' : 'Your profile'}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-500" style={{ width: step === 1 ? '50%' : '100%' }} /></div></div>}
          <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-black/30 sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">{isSignup ? step === 1 ? 'Join FitKit' : 'Personalize your journey' : 'Welcome back'}</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">{isSignup ? step === 1 ? 'Create your account' : 'Tell us about you' : 'Log in to FitKit'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{isSignup ? step === 1 ? 'Start with the essentials. Your fitness profile comes next.' : 'We use this to tailor your goals and training experience.' : 'Continue building the habits that move you forward.'}</p>
            </div>
            {error && <div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-sm text-red-300">{error}</div>}
            {(!isSignup || step === 1) ? (
              <form onSubmit={isSignup ? continueSignup : handleSubmit} className="space-y-4">
                {isSignup && <Field label="Full name" icon={<UserRound className="h-4 w-4" />}><input autoFocus required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Mercer" className="auth-input" /></Field>}
                <Field label="Email address" icon={<Mail className="h-4 w-4" />}><input autoFocus={!isSignup} required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="auth-input" /></Field>
                <Field label="Password" icon={<LockKeyhole className="h-4 w-4" />}><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="auth-input pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute bottom-3 right-3 text-slate-500 transition hover:text-slate-200" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></Field>
                <button disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm disabled:opacity-50">{loading ? 'Logging in…' : isSignup ? <>Continue <ArrowRight className="h-4 w-4" /></> : <>Log in <ArrowRight className="h-4 w-4" /></>}</button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3"><SelectField label="Fitness level" value={fitnessLevel} onChange={setFitnessLevel} options={['Beginner','Intermediate','Advanced']} /><SelectField label="Primary goal" value={primaryGoal} onChange={setPrimaryGoal} options={['General Fitness','Build Strength','Lose Weight','Improve Endurance']} /></div>
                <div><label className="auth-label">Birth date</label><input type="date" required value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="input-pro" /></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="auth-label">Height (cm)</label><input type="number" min="1" required value={heightCm} onChange={(event) => setHeightCm(event.target.value)} className="input-pro" /></div><div><label className="auth-label">Weight (kg)</label><input type="number" min="1" required value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className="input-pro" /></div></div>
                <SelectField label="Gender" value={gender} onChange={(value) => setGender(value as 'Male' | 'Female')} options={['Male','Female']} />
                <div className="flex gap-3 pt-1"><button type="button" onClick={() => { setError(''); setStep(1); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"><ArrowLeft className="h-4 w-4" /> Back</button><button disabled={loading} className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm disabled:opacity-50">{loading ? 'Creating account…' : <>Finish setup <ArrowRight className="h-4 w-4" /></>}</button></div>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-slate-500">{isSignup ? 'Already have an account?' : 'New to FitKit?'} <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-lime-300 transition hover:text-lime-200">{isSignup ? 'Log in' : 'Create an account'}</Link></p>
          </div>
          <Link to="/" className="mx-auto mt-5 flex w-fit items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"><ArrowLeft className="h-3.5 w-3.5" /> Back to home</Link>
        </div>
      </main>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="relative"><label className="auth-label">{label}</label><span className="absolute bottom-3 left-3 text-slate-500">{icon}</span>{children}</div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div><label className="auth-label">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="input-pro">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}
