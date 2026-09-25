import { ArrowRight, BarChart3, Check, Dumbbell, Flame, Footprints, Trophy, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

const features = [
  { icon: Dumbbell, title: 'Structured programmes', copy: 'Follow training plans that match your level and keep every session organized.' },
  { icon: BarChart3, title: 'Progress that makes sense', copy: 'See steps, hydration, calories and workout trends in one focused dashboard.' },
  { icon: Users, title: 'Train with a community', copy: 'Share milestones, find members and stay motivated with friendly competition.' },
];

export default function Landing() {
  if (localStorage.getItem('token')) return <Navigate to="/dashboard" replace />;

  return (
    <div className="public-shell min-h-screen overflow-hidden">
      <div className="public-orb public-orb-one" /><div className="public-orb public-orb-two" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <BrandMark />
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Primary navigation">
          <a href="#features" className="hidden text-sm text-slate-400 transition hover:text-white sm:block">Features</a>
          <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 sm:px-4">Log in</Link>
          <Link to="/signup" className="btn-primary rounded-xl px-4 py-2.5 text-sm">Get started</Link>
        </nav>
      </header>

      <main className="relative z-[1]">
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-32 lg:pt-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1.5 text-xs font-semibold text-lime-200">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> Your fitness, finally in one place
            </div>
            <h1 className="max-w-2xl font-display text-5xl font-bold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Build momentum.<br /><span className="grad-text">See the progress.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">FitKit brings your workouts, daily goals, progress and training community into one clear command center.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm">Start training free <ArrowRight className="h-4 w-4" /></Link>
              <a href="#features" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">Explore FitKit</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Personalized goals</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> All levels welcome</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Community support</span>
            </div>
          </div>

          <div className="hero-dashboard glass-strong relative rounded-[1.75rem] p-3 shadow-2xl shadow-black/40 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div><p className="text-xs text-slate-500">Today</p><p className="font-display font-semibold text-white">Your performance</p></div>
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">ON TRACK</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[{ icon: Footprints, label: 'Steps', value: '8,642', tone: 'text-lime-300' }, { icon: Flame, label: 'Calories', value: '624', tone: 'text-orange-300' }, { icon: Trophy, label: 'Streak', value: '12 days', tone: 'text-cyan-300' }].map(({ icon: Icon, label, value, tone }, index) => (
                <div key={label} className={`${index === 2 ? 'col-span-2 sm:col-span-1' : ''} rounded-2xl border border-white/10 bg-white/[0.035] p-4`}>
                  <Icon className={`h-4 w-4 ${tone}`} /><p className="mt-5 text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-mono-fk text-xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-wider text-slate-500">Weekly activity</p><p className="mt-1 font-display text-lg font-semibold text-white">Keep your rhythm</p></div><span className="text-xs font-semibold text-emerald-300">+18%</span></div>
              <div className="mt-7 flex h-28 items-end gap-2 sm:gap-3">{[42, 68, 51, 84, 64, 96, 76].map((height, index) => <div key={index} className="flex flex-1 items-end rounded-t-md bg-white/5" style={{ height: '100%' }}><span className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-lime-300" style={{ height: `${height}%`, opacity: index === 5 ? 1 : 0.45 }} /></div>)}</div>
              <div className="mt-2 flex justify-between text-[9px] text-slate-600">{['M','T','W','T','F','S','S'].map((day, i) => <span key={i}>{day}</span>)}</div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-white/10 bg-white/[0.018]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-300">Everything connected</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">One place to plan, perform and improve.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, copy }) => <article key={title} className="glass rounded-2xl p-6"><span className="grid h-11 w-11 place-items-center rounded-xl border border-lime-400/20 bg-lime-400/10"><Icon className="h-5 w-5 text-lime-300" /></span><h3 className="mt-5 font-display text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p></article>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-24 text-center"><p className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to make today count?</p><p className="mx-auto mt-3 max-w-xl text-slate-400">Create your profile, set your goals and start building a routine that lasts.</p><Link to="/signup" className="btn-primary mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm">Create your account <ArrowRight className="h-4 w-4" /></Link></section>
      </main>
      <footer className="border-t border-white/10 px-5 py-6 text-center text-xs text-slate-600">© {new Date().getFullYear()} FitKit. Train with purpose.</footer>
    </div>
  );
}
