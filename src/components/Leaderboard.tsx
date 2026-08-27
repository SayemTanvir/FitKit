import { Trophy, Shield, Footprints, Flame, Dumbbell, Lock } from 'lucide-react';
import ProgressBar from './ProgressBar';
import type { Achievement, AchievementIcon } from '../types';

const iconMap: Record<AchievementIcon, JSX.Element> = {
  footprints: <Footprints className="w-4 h-4 text-lime-300" />,
  flame: <Flame className="w-4 h-4 text-orange-300" />,
  dumbbell: <Dumbbell className="w-4 h-4 text-cyan-300" />,
  lock: <Lock className="w-4 h-4 text-slate-400" />,
};

interface LeaderboardProps {
  currentRank: string;
  nextRank: string;
  tenure: string;
  xpCurrent: number;
  xpTarget: number;
  achievements: Achievement[];
}

export default function Leaderboard({
  currentRank,
  nextRank,
  tenure,
  xpCurrent,
  xpTarget,
  achievements,
}: LeaderboardProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-lg text-white">Leaderboard &amp; Ranks</h2>
        <Trophy className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shrink-0">
          <Shield className="w-7 h-7 text-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-semibold text-white">{currentRank}</span>
            <span className="text-slate-400 text-xs">
              Next: <span className="grad-text font-semibold">{nextRank}</span>
            </span>
          </div>
          <ProgressBar value={xpCurrent} max={xpTarget} />
          <p className="text-[11px] text-slate-500 mt-1.5">
            {tenure} tenure · {xpCurrent.toLocaleString()} / {xpTarget.toLocaleString()} XP to {nextRank}
          </p>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-6 mb-3">Recent Achievements</p>
      <div className="flex flex-wrap gap-2.5">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 ${
              a.locked ? 'opacity-40' : ''
            }`}
          >
            {iconMap[a.icon]}
            <span className={`text-xs font-medium ${a.locked ? 'text-slate-400' : 'text-slate-200'}`}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
