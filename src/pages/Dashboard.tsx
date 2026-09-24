import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Droplet, Flame, Footprints, Plus } from 'lucide-react';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import SocialFeed from '../components/SocialFeed';
import StatCard from '../components/StatCard';
import WeeklyAnalytics from '../components/WeeklyAnalytics';
import type { SocialActivity, WeeklyMetric } from '../types';
import { fetchDailySummary, fetchSocialFeed, fetchWeeklyAnalytics, logHydration, logSteps } from '../services/api';

function relativeTime(timestamp: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'FK';
}

function updateStreak() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const storageKey = `fitkit_active_streak_${user.id || 'guest'}`;
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  let streakDays = Number(saved.streakDays || 1);
  let streakBest = Number(saved.streakBest || 1);
  const isNewDay = !saved.lastActiveDate || saved.lastActiveDate !== today;
  if (isNewDay && saved.lastActiveDate) {
    const difference = Math.round((new Date(today).getTime() - new Date(saved.lastActiveDate).getTime()) / 86400000);
    streakDays = difference === 1 ? streakDays + 1 : 1;
  }
  streakBest = Math.max(streakBest, streakDays);
  localStorage.setItem(storageKey, JSON.stringify({ lastActiveDate: today, streakDays, streakBest }));
  return { streakDays, streakBest };
}

const gradients = ['from-emerald-400 to-cyan-500', 'from-lime-400 to-emerald-500', 'from-cyan-400 to-blue-500', 'from-purple-400 to-pink-500'];

export default function Dashboard() {
  const [isLoggingWater, setIsLoggingWater] = useState(false);
  const [isLoggingSteps, setIsLoggingSteps] = useState(false);
  const [stats, setStats] = useState({
    steps: 0, stepsGoal: 10000, calories: 0, caloriesGoal: 800,
    hydration: 0, hydrationGoal: 2800, streakDays: 1, streakBest: 1,
  });
  const [feedActivities, setFeedActivities] = useState<SocialActivity[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyMetric[]>([]);
  const [loadError, setLoadError] = useState('');

  const loadSummary = useCallback(async () => {
    const data = await fetchDailySummary();
    setStats((previous) => ({ ...previous,
      steps: Number(data.steps || 0), stepsGoal: Number(data.stepsGoal || 10000),
      calories: Number(data.calories || 0), caloriesGoal: Number(data.caloriesGoal || 800),
      hydration: Number(data.hydration || 0), hydrationGoal: Number(data.hydrationGoal || 2800),
    }));
  }, []);
  const loadAnalytics = useCallback(async () => setWeeklyData(await fetchWeeklyAnalytics(7)), []);

  useEffect(() => {
    setStats((previous) => ({ ...previous, ...updateStreak() }));
    loadSummary().catch((error) => setLoadError(error.message));
    loadAnalytics().catch((error) => setLoadError(error.message));
    fetchSocialFeed().then((items) => setFeedActivities(items.slice(0, 12).map((item, index) => {
      const name = item.user_name || 'FitKit Member';
      return {
        id: String(item.feed_id), userId: Number(item.user_id), name,
        message: item.content || 'Completed a workout', timeAgo: relativeTime(item.timestamp),
        initials: initials(name), avatarGradient: gradients[index % gradients.length], photoUrl: item.photo_url,
        reactions: [
          { emoji: '🔥', count: Number(item.fire_count || 0) },
          { emoji: '💪', count: Number(item.flex_count || 0) },
          { emoji: '👏', count: Number(item.clap_count || 0) },
        ],
        activeReaction: ({ Fire: '🔥', Flex: '💪', Clap: '👏' } as Record<string, string>)[item.my_reaction] || null,
      };
    }))).catch((error) => setLoadError(error.message));
  }, [loadAnalytics, loadSummary]);

  const handleAddWater = async () => {
    setIsLoggingWater(true);
    try {
      await logHydration(250);
      await Promise.all([loadSummary(), loadAnalytics()]);
      window.dispatchEvent(new Event('fitkit_notifications_changed'));
      toast.success('Added 250 ml of water');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log hydration');
    } finally { setIsLoggingWater(false); }
  };
  const handleAddSteps = async () => {
    setIsLoggingSteps(true);
    try {
      await logSteps(1000, true);
      await Promise.all([loadSummary(), loadAnalytics()]);
      window.dispatchEvent(new Event('fitkit_notifications_changed'));
      toast.success('Added 1,000 steps');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log steps');
    } finally { setIsLoggingSteps(false); }
  };

  const hydrationDone = stats.hydration >= stats.hydrationGoal;
  return <div className="space-y-6">
    {loadError && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">Some dashboard data could not load: {loadError}</div>}
    <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      <StatCard className="flex flex-col justify-between"><div className="flex items-center gap-4"><CircularProgress value={stats.steps} max={stats.stepsGoal} icon={<Footprints className="w-5 h-5 text-lime-300" />} /><div><p className="text-[11px] uppercase text-slate-400">Daily Steps</p><p className="font-mono-fk font-bold text-xl text-white">{stats.steps.toLocaleString()}</p><p className="text-[11px] text-emerald-300">{Math.round((stats.steps / stats.stepsGoal) * 100)}% of goal</p></div></div><button onClick={handleAddSteps} disabled={isLoggingSteps} className="mt-3 w-full text-xs font-semibold py-1.5 rounded-lg bg-lime-400/15 text-lime-300 border border-lime-400/30 flex items-center justify-center gap-1 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> 1,000 Steps</button></StatCard>
      <StatCard><div className="flex items-center justify-between"><Flame className="w-5 h-5 text-orange-300" /><p className="text-[11px] uppercase text-slate-400">Calories</p></div><p className="font-mono-fk font-bold text-2xl text-white mt-3">{stats.calories} <span className="text-sm font-normal text-slate-400">kcal</span></p><div className="mt-3"><ProgressBar value={stats.calories} max={stats.caloriesGoal} gradientFrom="from-orange-400" gradientTo="to-amber-300" /></div><p className="text-[11px] text-slate-400 mt-1.5">of {stats.caloriesGoal} kcal goal</p></StatCard>
      <StatCard><div className="flex items-center justify-between"><Droplet className="w-5 h-5 text-cyan-300" /><p className="text-[11px] uppercase text-slate-400">Hydration</p></div><p className="font-mono-fk font-bold text-2xl text-white mt-3">{stats.hydration.toLocaleString()} <span className="text-sm font-normal text-slate-400">/ {stats.hydrationGoal.toLocaleString()} ml</span></p><div className="mt-3"><ProgressBar value={stats.hydration} max={stats.hydrationGoal} gradientFrom="from-cyan-400" gradientTo="to-blue-400" /></div><button onClick={handleAddWater} disabled={hydrationDone || isLoggingWater} className="btn-cyan mt-3 w-full text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-40">{hydrationDone ? <><Check className="w-3.5 h-3.5" /> Goal complete</> : <><Plus className="w-3.5 h-3.5" /> 250 ml</>}</button></StatCard>
      <StatCard><div className="flex items-center justify-between"><span>🔥</span><p className="text-[11px] uppercase text-slate-400">Active Streak</p></div><p className="font-mono-fk font-bold text-2xl text-white mt-3">{stats.streakDays} <span className="text-sm font-normal text-slate-400">Days</span></p><div className="flex gap-1 mt-3">{Array.from({ length: 7 }).map((_, index) => <span key={index} className={`flex-1 h-1.5 rounded-full ${index < Math.min(stats.streakDays, 7) ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-white/10'}`} />)}</div><p className="text-[11px] text-slate-400 mt-1.5">Personal best: {stats.streakBest} days</p></StatCard>
    </section>
    <WeeklyAnalytics data={weeklyData} />
    <SocialFeed activities={feedActivities} />
  </div>;
}
