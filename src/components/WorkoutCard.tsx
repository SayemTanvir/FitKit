import { Dumbbell, Timer, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import ProgressBar from './ProgressBar';
import type { ExerciseData } from '../types';

const iconMap: Record<ExerciseData['icon'], ReactNode> = {
  dumbbell: <Dumbbell className="w-4 h-4 text-lime-300" />,
  timer: <Timer className="w-4 h-4 text-cyan-300" />,
};

interface WorkoutCardProps {
  planName: string;
  weekLabel: string;
  progressPct: number;
  exercises: ExerciseData[];
  onStart?: () => void;
}

export default function WorkoutCard({ planName, weekLabel, progressPct, exercises, onStart }: WorkoutCardProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Active Plan</p>
          <h2 className="font-display font-semibold text-xl text-white mt-1">{planName}</h2>
        </div>
        <span className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/25 text-emerald-300">
          {weekLabel}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
          <span>Plan progress</span>
          <span>{progressPct}%</span>
        </div>
        <ProgressBar value={progressPct} max={100} />
      </div>

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-6 mb-3">Up Next</p>
      <div className="space-y-2.5">
        {exercises.map((ex) => (
          <div key={ex.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <span className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${ex.iconBgClass}`}>
              {iconMap[ex.icon]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{ex.name}</p>
              <p className="text-xs text-slate-400">{ex.detail}</p>
            </div>
            <span className="text-xs text-slate-500 font-mono-fk">{ex.tag}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="btn-primary w-full mt-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" /> Start Today's Workout
      </button>
    </div>
  );
}
