import { useState } from 'react';
import { Footprints, Flame, Droplet, Plus, Check } from 'lucide-react';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import WorkoutCard from '../components/WorkoutCard';
import SocialFeed from '../components/SocialFeed';
import Leaderboard from '../components/Leaderboard';
import { socialActivities, achievements, workoutPlan, rankInfo, dailyStats } from '../data/mockData';

export default function Dashboard() {
  const [hydration, setHydration] = useState(dailyStats.hydration);
  const { steps, stepsGoal, calories, caloriesGoal, hydrationGoal, streakDays, streakBest } = dailyStats;

  const addWater = () => setHydration((v) => Math.min(v + 250, hydrationGoal));
  const hydrationDone = hydration >= hydrationGoal;

  return (
    <>
      {/* Stat cards */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Steps */}
        <StatCard className="flex items-center gap-4">
          <CircularProgress value={steps} max={stepsGoal} icon={<Footprints className="w-5 h-5 text-lime-300" />} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Daily Steps</p>
            <p className="font-mono-fk font-bold text-xl text-white leading-tight mt-0.5">{steps.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
              {steps >= stepsGoal
                ? `Goal reached · ${Math.round((steps / stepsGoal) * 100)}%`
                : `${Math.round((steps / stepsGoal) * 100)}% of goal`}
            </p>
          </div>
        </StatCard>

        {/* Calories */}
        <StatCard>
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center">
              <Flame className="w-[18px] h-[18px] text-orange-300" />
            </span>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Calories</p>
          </div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">
            {calories} <span className="text-sm font-normal text-slate-400">kcal</span>
          </p>
          <div className="mt-3">
            <ProgressBar value={calories} max={caloriesGoal} gradientFrom="from-orange-400" gradientTo="to-amber-300" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">of {caloriesGoal} kcal goal</p>
        </StatCard>

        {/* Hydration */}
        <StatCard>
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Droplet className="w-[18px] h-[18px] text-cyan-300" />
            </span>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Hydration</p>
          </div>
          <p className="font-mono-fk font-bold text-2xl text-white mt-3">
            {hydration.toLocaleString()} <span className="text-sm font-normal text-slate-400">/ {hydrationGoal.toLocaleString()} ml</span>
          </p>
          <div className="mt-3">
            <ProgressBar value={hydration} max={hydrationGoal} gradientFrom="from-cyan-400" gradientTo="to-blue-400" />
          </div>
          <button
            onClick={addWater}
            disabled={hydrationDone}
            className="btn-cyan mt-3 w-full text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
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
            {streakDays} <span className="text-sm font-normal text-slate-400">Days</span>
          </p>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i < streakDays ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Personal best: {streakBest} days</p>
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
          <SocialFeed activities={socialActivities} />
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
