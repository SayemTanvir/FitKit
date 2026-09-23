import { useMemo, useState } from 'react';
import { BarChart3, Droplet, Flame, Footprints } from 'lucide-react';
import type { WeeklyMetric } from '../types';

type MetricKey = 'steps' | 'calories' | 'hydration';

const metricConfig = {
  steps: { label: 'Steps', unit: '', icon: Footprints, color: 'from-lime-400 to-emerald-500' },
  calories: { label: 'Calories', unit: ' kcal', icon: Flame, color: 'from-orange-400 to-amber-400' },
  hydration: { label: 'Hydration', unit: ' ml', icon: Droplet, color: 'from-cyan-400 to-blue-500' },
};

export default function WeeklyAnalytics({ data }: { data: WeeklyMetric[] }) {
  const [metric, setMetric] = useState<MetricKey>('steps');
  const config = metricConfig[metric];
  const maximum = Math.max(1, ...data.map((item) => Number(item[metric])));
  const totals = useMemo(
    () => ({
      steps: data.reduce((sum, item) => sum + Number(item.steps), 0),
      calories: data.reduce((sum, item) => sum + Number(item.calories), 0),
      hydration: data.reduce((sum, item) => sum + Number(item.hydration), 0),
      workouts: data.reduce((sum, item) => sum + Number(item.workouts), 0),
    }),
    [data]
  );

  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-300" />
            <h2 className="font-display font-semibold text-lg text-white">7-Day Performance</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Live totals calculated from your activity logs</p>
        </div>
        <div className="flex p-1 rounded-xl bg-white/5 border border-white/10">
          {(Object.keys(metricConfig) as MetricKey[]).map((key) => {
            const Icon = metricConfig[key].icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${metric === key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {metricConfig[key].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <Metric label="Total steps" value={totals.steps.toLocaleString()} />
        <Metric label="Calories burned" value={`${totals.calories.toLocaleString()} kcal`} />
        <Metric label="Water logged" value={`${totals.hydration.toLocaleString()} ml`} />
        <Metric label="Workouts" value={totals.workouts.toLocaleString()} />
      </div>

      <div className="h-48 flex items-end gap-2 sm:gap-4 mt-6 px-1">
        {data.map((item) => {
          const value = Number(item[metric]);
          const height = value === 0 ? 3 : Math.max(8, Math.round((value / maximum) * 100));
          const date = new Date(`${item.activity_date.slice(0, 10)}T00:00:00`);
          return (
            <div key={item.activity_date} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
              <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                {value.toLocaleString()}{config.unit}
              </span>
              <div className="w-full max-w-10 h-32 flex items-end rounded-lg bg-white/[0.03] overflow-hidden">
                <div className={`w-full rounded-lg bg-gradient-to-t ${config.color} transition-all duration-500`} style={{ height: `${height}%` }} />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm sm:text-base font-semibold text-white mt-1">{value}</p>
    </div>
  );
}
