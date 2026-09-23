import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Footprints, Medal, Trophy } from 'lucide-react';
import { fetchLeaderboard } from '../services/api';
import UserAvatar from '../components/UserAvatar';

type Metric = 'steps' | 'calories' | 'workouts';
type Period = 'today' | 'week' | 'month' | 'all';
type Level = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';

interface Entry {
  user_id: number;
  name: string;
  photo_url?: string | null;
  fitness_level: string | null;
  score: number | string;
  rank: number;
}

const metricLabels: Record<Metric, string> = { steps: 'Public steps', calories: 'Public calories', workouts: 'Public workouts' };
const metricUnits: Record<Metric, string> = { steps: 'steps', calories: 'kcal', workouts: 'workouts' };

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>('steps');
  const [period, setPeriod] = useState<Period>('week');
  const [level, setLevel] = useState<Level>('All');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUserId = Number(JSON.parse(localStorage.getItem('user') || '{}').id);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard({ metric, period, level })
      .then((data) => { if (!cancelled) { setEntries(data); setError(''); } })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || 'Could not load leaderboard'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [metric, period, level]);

  const updateMetric = (value: Metric) => { setLoading(true); setMetric(value); };
  const updatePeriod = (value: Period) => { setLoading(true); setPeriod(value); };
  const updateLevel = (value: Level) => { setLoading(true); setLevel(value); };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3"><Trophy className="w-7 h-7 text-lime-300" /><h1 className="font-display font-semibold text-2xl text-white">Community Leaderboard</h1></div>
        <p className="text-sm text-slate-400 mt-2">Compare member activity using public logs only. Private workouts and steps never count here.</p>
      </div>

      <div className="glass rounded-2xl p-5 grid sm:grid-cols-3 gap-4">
        <label className="text-xs font-semibold text-slate-400">Metric
          <select value={metric} onChange={(event) => updateMetric(event.target.value as Metric)} className="input-pro mt-1.5">
            {Object.entries(metricLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-400">Time period
          <select value={period} onChange={(event) => updatePeriod(event.target.value as Period)} className="input-pro mt-1.5">
            <option value="today">Today</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option><option value="all">All time</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-400">Fitness level
          <select value={level} onChange={(event) => updateLevel(event.target.value as Level)} className="input-pro mt-1.5">
            <option>All</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </label>
      </div>

      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4 text-slate-300">
          {metric === 'steps' ? <Footprints className="w-4 h-4 text-lime-300" /> : metric === 'calories' ? <Flame className="w-4 h-4 text-orange-300" /> : <Medal className="w-4 h-4 text-cyan-300" />}
          <h2 className="font-display font-semibold text-lg text-white">{metricLabels[metric]}</h2>
        </div>
        {error && <p role="alert" className="text-sm text-red-300 mb-4">{error}</p>}
        {loading ? <p className="text-sm text-slate-400 py-6">Loading rankings...</p> : !error && entries.length === 0 ? (
          <p className="text-sm text-slate-400 py-6">No members match these filters.</p>
        ) : !error && (
          <div className="space-y-2">
            {entries.every((entry) => Number(entry.score) === 0) && <p className="text-sm text-amber-200 mb-3">No public {metricUnits[metric]} logged in this period yet.</p>}
            {entries.map((entry) => (
              <div key={entry.user_id} className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${entry.user_id === currentUserId ? 'border-lime-400/35 bg-lime-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
                <span className="w-9 text-center font-mono-fk font-bold text-lime-300">#{entry.rank}</span>
                <UserAvatar name={entry.name} photoUrl={entry.photo_url} className="w-9 h-9" />
                <div className="flex-1 min-w-0"><Link to={`/profile/${entry.user_id}`} className="text-sm font-semibold text-white hover:text-lime-300">{entry.name}</Link><p className="text-xs text-slate-400">{entry.fitness_level || 'Level not set'}{entry.user_id === currentUserId ? ' · You' : ''}</p></div>
                <span className="font-mono-fk text-sm font-semibold text-white whitespace-nowrap">{Number(entry.score).toLocaleString()} <span className="text-xs font-normal text-slate-400">{metricUnits[metric]}</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
