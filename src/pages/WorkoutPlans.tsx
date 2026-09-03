import React, { useEffect, useState } from 'react';
import { fetchWorkoutPlans, createWorkoutPlan } from '../services/api';
import { PlusCircle, Dumbbell } from 'lucide-react';

export default function WorkoutPlans() {
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const [plans, setPlans] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [targetLevel, setTargetLevel] = useState('Beginner');
  const [goalCategory, setGoalCategory] = useState('Strength');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [statusMsg, setStatusMsg] = useState('');

  const loadPlans = async () => {
    try {
      const data = await fetchWorkoutPlans();
      if (Array.isArray(data)) setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');

    try {
      await createWorkoutPlan({
        title,
        target_level: targetLevel,
        goal_category: goalCategory,
        duration_weeks: Number(durationWeeks),
      });
      setTitle('');
      setStatusMsg('Plan published successfully!');
      loadPlans();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h1 className="font-display font-semibold text-2xl text-white mb-1">Workouts &amp; Plans</h1>
        <p className="text-slate-400 text-sm">Browse curated plans or curate new regimens.</p>
      </div>

      {/* Admin Exclusive: Plan Curation Workspace */}
      {user?.role === 'Admin' && (
        <div className="glass rounded-2xl p-6 border border-blue-500/20 bg-blue-950/10">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <PlusCircle className="w-5 h-5" />
            <h2 className="font-display font-semibold text-lg text-white">Curate New Plan (Admin Exclusive)</h2>
          </div>

          {statusMsg && <div className="text-emerald-400 text-sm mb-4 font-medium">{statusMsg}</div>}

          <form onSubmit={handleCreatePlan} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Plan Title (e.g. Core 5x5)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="lg:col-span-2 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm"
              required
            />
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <select
              value={goalCategory}
              onChange={(e) => setGoalCategory(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none"
            >
              <option value="Strength">Strength</option>
              <option value="Muscle Gain">Muscle Gain</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Flexibility">Flexibility</option>
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Weeks"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                min={1}
                className="w-20 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                required
              />
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
              >
                Publish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans Catalog Table */}
      <div className="glass rounded-2xl p-6 overflow-hidden">
        <h2 className="font-display font-semibold text-lg text-white mb-4">Curated Catalog</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Target Level</th>
                <th className="py-3 px-4">Goal</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 rounded-r-xl">Curated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No workout plans published yet.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.plan_id} className="hover:bg-white/5">
                    <td className="py-3.5 px-4 font-mono text-cyan-400">#{p.plan_id}</td>
                    <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-cyan-400" /> {p.title}
                    </td>
                    <td className="py-3.5 px-4">{p.target_level}</td>
                    <td className="py-3.5 px-4">{p.goal_category}</td>
                    <td className="py-3.5 px-4">{p.duration_weeks} Weeks</td>
                    <td className="py-3.5 px-4 text-slate-400">{p.curated_by}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}