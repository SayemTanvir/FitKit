import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, Check, Droplet, Flame, Footprints, Plus, X } from 'lucide-react';
import CircularProgress from '../components/CircularProgress';
import Leaderboard from '../components/Leaderboard';
import ProgressBar from '../components/ProgressBar';
import SocialFeed from '../components/SocialFeed';
import StatCard from '../components/StatCard';
import WorkoutCard from '../components/WorkoutCard';
import WeeklyAnalytics from '../components/WeeklyAnalytics';
import type { Achievement, SocialActivity, WeeklyMetric, WorkoutPlanData } from '../types';
import {
  fetchDailySummary,
  fetchMyProfile,
  fetchSocialFeed,
  fetchWeeklyAnalytics,
  fetchWorkoutPlans,
  logHydration,
  logSteps,
} from '../services/api';

function relativeTime(timestamp: string) {
  const elapsed = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'FK';
}

function updateStreak() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const storageKey = `fitkit_active_streak_${user.id || 'guest'}`;
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  let streakDays = Number(saved.streakDays || 1);
  let streakBest = Number(saved.streakBest || 1);
  let isNewDay = !saved.lastActiveDate || saved.lastActiveDate !== today;

  if (isNewDay && saved.lastActiveDate) {
    const difference = Math.round(
      (new Date(today).getTime() - new Date(saved.lastActiveDate).getTime()) / 86400000
    );
    streakDays = difference === 1 ? streakDays + 1 : 1;
  }

  streakBest = Math.max(streakBest, streakDays);
  localStorage.setItem(
    storageKey,
    JSON.stringify({ lastActiveDate: today, streakDays, streakBest })
  );
  return { streakDays, streakBest, isNewDay };
}

function pushNotification(title: string, message: string) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const storageKey = `fitkit_notifications_${user.id || 'guest'}`;
  const notification = { id: Date.now(), title, message, time: 'Just now' };
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  localStorage.setItem(
    storageKey,
    JSON.stringify([notification, ...stored].slice(0, 30))
  );
  window.dispatchEvent(
    new CustomEvent('fitkit_new_notification', { detail: notification })
  );
}

const gradients = [
  'from-emerald-400 to-cyan-500',
  'from-lime-400 to-emerald-500',
  'from-cyan-400 to-blue-500',
  'from-purple-400 to-pink-500',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isMember = currentUser?.role === 'Member';
  const [activeToast, setActiveToast] = useState<{ title: string; message: string } | null>(null);
  const [isLoggingWater, setIsLoggingWater] = useState(false);
  const [isLoggingSteps, setIsLoggingSteps] = useState(false);
  const [stats, setStats] = useState({
    steps: 0,
    stepsGoal: 10000,
    calories: 0,
    caloriesGoal: 800,
    hydration: 0,
    hydrationGoal: 2800,
    streakDays: 1,
    streakBest: 1,
  });
  const [feedActivities, setFeedActivities] = useState<SocialActivity[]>([]);
  const [activePlan, setActivePlan] = useState<WorkoutPlanData>({
    name: 'No workout plan available',
    weekLabel: 'Not assigned',
    progressPct: 0,
    exercises: [],
  });
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [membership, setMembership] = useState({
    currentRank: 'Member',
    nextRank: 'Silver Member',
    tenure: '0 months',
    progress: 0,
    target: 12,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyMetric[]>([]);
  const [loadError, setLoadError] = useState('');

  const triggerAlert = useCallback((title: string, message: string) => {
    setActiveToast({ title, message });
    pushNotification(title, message);
    window.setTimeout(() => setActiveToast(null), 4500);
  }, []);

  const loadSummary = useCallback(async () => {
    const data = await fetchDailySummary();
    setStats((previous) => ({
      ...previous,
      steps: Number(data.steps || 0),
      stepsGoal: Number(data.stepsGoal || 10000),
      calories: Number(data.calories || 0),
      caloriesGoal: Number(data.caloriesGoal || 800),
      hydration: Number(data.hydration || 0),
      hydrationGoal: Number(data.hydrationGoal || 2800),
    }));
  }, []);

  const loadAnalytics = useCallback(async () => {
    const data = await fetchWeeklyAnalytics(7);
    setWeeklyData(data);
  }, []);

  useEffect(() => {
    const streak = updateStreak();
    setStats((previous) => ({ ...previous, ...streak }));
    if (streak.isNewDay) {
      triggerAlert('Daily Login Streak 🔥', `Your active streak is ${streak.streakDays} days.`);
    }

    loadSummary().catch((error) => setLoadError(error.message));
    loadAnalytics().catch((error) => setLoadError(error.message));

    fetchSocialFeed()
      .then((items) => {
        setFeedActivities(
          items.slice(0, 5).map((item, index) => {
            const name = item.user_name || 'FitKit Member';
            return {
              id: String(item.feed_id),
              userId: Number(item.user_id),
              name,
              message: item.content || 'Completed a workout',
              timeAgo: relativeTime(item.timestamp),
              initials: initials(name),
              avatarGradient: gradients[index % gradients.length],
              reactions: [
                { emoji: '🔥', count: Number(item.fire_count || 0) },
                { emoji: '💪', count: Number(item.flex_count || 0) },
                { emoji: '👏', count: Number(item.clap_count || 0) },
              ],
              activeReaction: ({ Fire: '🔥', Flex: '💪', Clap: '👏' } as Record<string, string>)[item.my_reaction] || null,
            };
          })
        );
      })
      .catch((error) => setLoadError(error.message));

    fetchWorkoutPlans()
      .then((plans) => {
        if (plans.length === 0) return;
        const plan = plans.find((item) => item.is_active) || plans[0];
        const active = Boolean(plan.is_active);
        setHasActivePlan(active);
        const startDate = plan.active_start_date ? new Date(plan.active_start_date) : null;
        const elapsedDays = startDate
          ? Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000))
          : 0;
        const currentWeek = Math.min(plan.duration_weeks, Math.floor(elapsedDays / 7) + 1);
        setActivePlan({
          name: plan.title,
          weekLabel: active ? `Week ${currentWeek} of ${plan.duration_weeks}` : `${plan.duration_weeks} week plan`,
          progressPct: active ? Math.min(100, Math.round((elapsedDays / (plan.duration_weeks * 7)) * 100)) : 0,
          exercises: (plan.exercises || []).slice(0, 3).map((exercise: any) => ({
            name: exercise.name,
            detail: `Day ${exercise.day_number} · ${exercise.target_quantity} reps/mins`,
            tag: exercise.target_muscle_group || 'General',
            icon: exercise.target_muscle_group === 'Cardio' ? 'timer' : 'dumbbell',
            iconBgClass:
              exercise.target_muscle_group === 'Cardio'
                ? 'bg-cyan-400/10 border-cyan-400/20'
                : 'bg-lime-400/10 border-lime-400/20',
          })),
        });
      })
      .catch((error) => setLoadError(error.message));

    fetchMyProfile()
      .then((data) => {
        const profile = data.user;
        const thresholds = [
          { name: 'Bronze', months: 0 },
          { name: 'Silver', months: 12 },
          { name: 'Gold', months: 36 },
          { name: 'Platinum', months: 60 },
          { name: 'Diamond', months: 120 },
        ];
        const currentIndex = Math.max(
          0,
          thresholds.findIndex((rank) => rank.name === profile.membership_rank)
        );
        const next = thresholds[Math.min(currentIndex + 1, thresholds.length - 1)];
        const months = Number(profile.membership_months || 0);
        setMembership({
          currentRank: `${profile.membership_rank} Member`,
          nextRank: currentIndex === thresholds.length - 1 ? 'Top Rank' : `${next.name} Member`,
          tenure: `${months} months`,
          progress: Math.min(months, next.months || 1),
          target: next.months || 1,
        });
        setAchievements(
          data.achievements.map((achievement: any) => ({
            id: String(achievement.id),
            label: achievement.label,
            icon: achievement.label.toLowerCase().includes('10k') ? 'footprints' : 'dumbbell',
            locked: !achievement.earned_date,
          }))
        );
      })
      .catch((error) => setLoadError(error.message));
  }, [loadAnalytics, loadSummary, triggerAlert]);

  const handleAddWater = async () => {
    if (!isMember) return;
    setIsLoggingWater(true);
    try {
      await logHydration(250);
      await Promise.all([loadSummary(), loadAnalytics()]);
      triggerAlert('Hydration Logged 💧', 'Added 250 ml of water.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log hydration');
    } finally {
      setIsLoggingWater(false);
    }
  };

  const handleAddSteps = async () => {
    if (!isMember) return;
    setIsLoggingSteps(true);
    try {
      await logSteps(1000, true);
      await Promise.all([loadSummary(), loadAnalytics()]);
      triggerAlert('Steps Logged 👟', 'Added 1,000 steps.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log steps');
    } finally {
      setIsLoggingSteps(false);
    }
  };

  const hydrationDone = stats.hydration >= stats.hydrationGoal;

  return (
    <>
      {loadError && (
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Some dashboard data could not load: {loadError}
        </div>
      )}
      {activeToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-lime-400/40 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <Bell className="w-4 h-4 text-lime-300" />
          <div>
            <p className="text-xs font-bold text-lime-300">{activeToast.title}</p>
            <p className="text-xs text-slate-300">{activeToast.message}</p>
          </div>
          <button onClick={() => setActiveToast(null)} aria-label="Close notification">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <StatCard className="flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <CircularProgress value={stats.steps} max={stats.stepsGoal} icon={<Footprints className="w-5 h-5 text-lime-300" />} />
            <div>
              <p className="text-[11px] uppercase text-slate-400">Daily Steps</p>
              <p className="font-mono-fk font-bold text-xl text-white">{stats.steps.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-300">{Math.round((stats.steps / stats.stepsGoal) * 100)}% of goal</p>
            </div>
          </div>
          <button onClick={handleAddSteps} disabled={!isMember || isLoggingSteps} className="mt-3 w-full text-xs font-semibold py-1.5 rounded-lg bg-lime-400/15 text-lime-300 border border-lime-400/30 flex items-center justify-center gap-1 disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> {isMember ? '1,000 Steps' : 'Member only'}
          </button>
        </StatCard>

        <StatCard>
          <div className="flex items-center justify-between"><Flame className="w-5 h-5 text-orange-300" /><p className="text-[11px] uppercase text-slate-400">Calories</p></div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">{stats.calories} <span className="text-sm font-normal text-slate-400">kcal</span></p>
          <div className="mt-3"><ProgressBar value={stats.calories} max={stats.caloriesGoal} gradientFrom="from-orange-400" gradientTo="to-amber-300" /></div>
          <p className="text-[11px] text-slate-400 mt-1.5">of {stats.caloriesGoal} kcal goal</p>
        </StatCard>

        <StatCard>
          <div className="flex items-center justify-between"><Droplet className="w-5 h-5 text-cyan-300" /><p className="text-[11px] uppercase text-slate-400">Hydration</p></div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">{stats.hydration.toLocaleString()} <span className="text-sm font-normal text-slate-400">/ {stats.hydrationGoal.toLocaleString()} ml</span></p>
          <div className="mt-3"><ProgressBar value={stats.hydration} max={stats.hydrationGoal} gradientFrom="from-cyan-400" gradientTo="to-blue-400" /></div>
          <button onClick={handleAddWater} disabled={!isMember || hydrationDone || isLoggingWater} className="btn-cyan mt-3 w-full text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-40">
            {!isMember ? 'Member only' : hydrationDone ? <><Check className="w-3.5 h-3.5" /> Goal complete</> : <><Plus className="w-3.5 h-3.5" /> 250 ml</>}
          </button>
        </StatCard>

        <StatCard>
          <div className="flex items-center justify-between"><span>🔥</span><p className="text-[11px] uppercase text-slate-400">Active Streak</p></div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">{stats.streakDays} <span className="text-sm font-normal text-slate-400">Days</span></p>
          <div className="flex gap-1 mt-3">{Array.from({ length: 7 }).map((_, index) => <span key={index} className={`flex-1 h-1.5 rounded-full ${index < Math.min(stats.streakDays, 7) ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-white/10'}`} />)}</div>
          <p className="text-[11px] text-slate-400 mt-1.5">Personal best: {stats.streakBest} days</p>
        </StatCard>
      </section>

      <WeeklyAnalytics data={weeklyData} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        <div className="xl:col-span-7"><WorkoutCard label={hasActivePlan ? 'Active Plan' : 'Suggested Plan'} actionLabel={isMember && hasActivePlan ? "Log Today's Workout" : 'Browse Workout Plans'} planName={activePlan.name} weekLabel={activePlan.weekLabel} progressPct={activePlan.progressPct} exercises={activePlan.exercises} onStart={() => navigate(isMember && hasActivePlan ? '/activity' : '/workouts')} /></div>
        <div className="xl:col-span-5 xl:row-span-2"><SocialFeed activities={feedActivities} /></div>
        <div className="xl:col-span-7"><Leaderboard currentRank={membership.currentRank} nextRank={membership.nextRank} tenure={membership.tenure} xpCurrent={membership.progress} xpTarget={membership.target} achievements={achievements} /></div>
      </section>
    </>
  );
}
