import { useState, useEffect } from 'react';
import { Footprints, Flame, Droplet, Plus, Check } from 'lucide-react';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import WorkoutCard from '../components/WorkoutCard';
import SocialFeed from '../components/SocialFeed';
import Leaderboard from '../components/Leaderboard';
import { achievements, workoutPlan, rankInfo, dailyStats } from '../data/mockData';
import { fetchDailySummary, fetchSocialFeed, logHydration, logSteps } from '../services/api';

// Helper function for relative time ("12 minutes ago", "2 hours ago", etc.)
function getRelativeTime(timestamp: string | Date) {
  if (!timestamp) return 'Just now';
  const now = new Date().getTime();
  const past = new Date(timestamp).getTime();
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

// Helper for initials
function getInitials(name: string) {
  return (
    name
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'FK'
  );
}

// Preset gradients matching your theme
const gradients = [
  'from-emerald-400 to-cyan-500',
  'from-lime-400 to-emerald-500',
  'from-cyan-400 to-blue-500',
  'from-purple-400 to-pink-500',
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    steps: 0,
    stepsGoal: dailyStats.stepsGoal,
    calories: 0,
    caloriesGoal: dailyStats.caloriesGoal,
    hydration: 0,
    hydrationGoal: dailyStats.hydrationGoal,
    streakDays: dailyStats.streakDays,
    streakBest: dailyStats.streakBest,
  });

  const [isLoggingWater, setIsLoggingWater] = useState(false);
  const [isLoggingSteps, setIsLoggingSteps] = useState(false);
  const [feedActivities, setFeedActivities] = useState<any[]>([]);

  const loadSummary = () => {
    fetchDailySummary()
      .then((data) => {
        if (data) {
          setStats((prev) => ({
            ...prev,
            calories: Number(data.calories || 0),
            steps: Number(data.steps || 0),
            hydration: Number(data.hydration || 0),
            caloriesGoal: data.caloriesGoal || prev.caloriesGoal,
            stepsGoal: data.stepsGoal || prev.stepsGoal,
            hydrationGoal: data.hydrationGoal || prev.hydrationGoal,
          }));
        }
      })
      .catch((err) => console.error('Dashboard telemetry error:', err));
  };

  useEffect(() => {
    loadSummary();

    fetchSocialFeed()
      .then((data) => {
        if (Array.isArray(data)) {
          const formatted = data.slice(0, 5).map((item, index) => {
            const userName = item.user_name || item.author || item.user?.name || 'FitKit Member';
            const messageText = item.content || item.message || item.description || 'Completed a workout set';
            return {
              id: String(item.id || item.feed_id || Math.random()),
              name: userName,
              message: messageText,
              timeAgo: getRelativeTime(item.timestamp),
              initials: getInitials(userName),
              avatarGradient: gradients[index % gradients.length],
              reactions: [
                { emoji: '🔥', count: 14 + (index % 5) },
                { emoji: '💪', count: 6 + (index % 3) },
                { emoji: '👏', count: 3 + (index % 2) },
              ],
              ...item,
            };
          });
          setFeedActivities(formatted);
        }
      })
      .catch((err) => console.error('Dashboard feed widget error:', err));
  }, []);

  const handleAddWater = async () => {
    try {
      setIsLoggingWater(true);
      await logHydration(250);
      setStats((prev) => ({
        ...prev,
        hydration: Math.min(prev.hydration + 250, prev.hydrationGoal),
      }));
    } catch (err) {
      console.error('Failed to log hydration:', err);
    } finally {
      setIsLoggingWater(false);
    }
  };

  const handleAddSteps = async () => {
    try {
      setIsLoggingSteps(true);
      await logSteps(1000, true);
      loadSummary();
    } catch (err) {
      console.error('Failed to log steps:', err);
    } finally {
      setIsLoggingSteps(false);
    }
  };

  const hydrationDone = stats.hydration >= stats.hydrationGoal;

  return (
    <>
      {/* Stat cards */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Steps with Interactive Quick-Add */}
        <StatCard className="flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <CircularProgress
              value={stats.steps}
              max={stats.stepsGoal}
              icon={<Footprints className="w-5 h-5 text-lime-300" />}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Daily Steps</p>
              <p className="font-mono-fk font-bold text-xl text-white leading-tight mt-0.5">
                {stats.steps.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
                {stats.steps >= stats.stepsGoal
                  ? `Goal reached · ${Math.round((stats.steps / stats.stepsGoal) * 100)}%`
                  : `${Math.round((stats.steps / stats.stepsGoal) * 100)}% of goal`}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddSteps}
            disabled={isLoggingSteps}
            className="mt-3 w-full text-xs font-semibold py-1.5 rounded-lg bg-lime-400/10 hover:bg-lime-400/20 text-lime-300 border border-lime-400/30 flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> 1,000 Steps
          </button>
        </StatCard>

        {/* Calories (Aggregates Workout + Step Trigger Calories) */}
        <StatCard>
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center">
              <Flame className="w-[18px] h-[18px] text-orange-300" />
            </span>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Calories</p>
          </div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">
            {stats.calories} <span className="text-sm font-normal text-slate-400">kcal</span>
          </p>
          <div className="mt-3">
            <ProgressBar
              value={stats.calories}
              max={stats.caloriesGoal}
              gradientFrom="from-orange-400"
              gradientTo="to-amber-300"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">of {stats.caloriesGoal} kcal goal</p>
        </StatCard>

        {/* Hydration (Persists directly to HydrationEntry) */}
        <StatCard>
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Droplet className="w-[18px] h-[18px] text-cyan-300" />
            </span>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Hydration</p>
          </div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">
            {stats.hydration.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-400">/ {stats.hydrationGoal.toLocaleString()} ml</span>
          </p>
          <div className="mt-3">
            <ProgressBar
              value={stats.hydration}
              max={stats.hydrationGoal}
              gradientFrom="from-cyan-400"
              gradientTo="to-blue-400"
            />
          </div>
          <button
            onClick={handleAddWater}
            disabled={hydrationDone || isLoggingWater}
            className="btn-cyan mt-3 w-full text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {hydrationDone ? (
              <>
                <Check className="w-3.5 h-3.5" /> Goal complete
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> 250ml
              </>
            )}
          </button>
        </StatCard>

        {/* Streak */}
        <StatCard>
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
              <span className="fire-emoji text-base">🔥</span>
            </span>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Active Streak</p>
          </div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">
            {stats.streakDays} <span className="text-sm font-normal text-slate-400">Days</span>
          </p>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i < stats.streakDays ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Personal best: {stats.streakBest} days</p>
        </StatCard>
      </section>

      {/* Middle grid */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        <div className="xl:col-span-7">
          <WorkoutCard
            planName={workoutPlan.name}
            weekLabel={workoutPlan.weekLabel}
            progressPct={workoutPlan.progressPct}
            exercises={workoutPlan.exercises}
            onStart={() => console.log('Workout started')}
          />
        </div>

        <div className="xl:col-span-5 xl:row-span-2">
          <SocialFeed activities={feedActivities} />
        </div>

        <div className="xl:col-span-7">
          <Leaderboard
            currentRank={rankInfo.currentRank}
            nextRank={rankInfo.nextRank}
            tenure={rankInfo.tenure}
            xpCurrent={rankInfo.xpCurrent}
            xpTarget={rankInfo.xpTarget}
            achievements={achievements}
          />
        </div>
      </section>
    </>
  );
}