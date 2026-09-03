import React, { useEffect, useState } from 'react';
import { fetchExercises, fetchMyWorkoutLogs, logWorkout, deleteWorkoutLog } from '../services/api';
import { Flame, Trash2, CheckCircle } from 'lucide-react';

export default function Progress() {
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedEx, setSelectedEx] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(30);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [logs, setLogs] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const exList = await fetchExercises();
      if (Array.isArray(exList)) {
        setExercises(exList);
        if (exList.length > 0) setSelectedEx(exList[0].exercise_id);
      }

      if (user?.role === 'Member') {
        const logList = await fetchMyWorkoutLogs();
        if (Array.isArray(logList)) setLogs(logList);
      }
    } catch (err) {
      console.error('Failed to load progress data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await logWorkout({
        exercise_id: selectedEx,
        quantity: Number(quantity),
        is_public: isPublic,
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (entryId: number) => {
    try {
      await deleteWorkoutLog(entryId);
      loadData();
    } catch (err: any) {
      alert(`Delete rejected: ${err.message}`);
    }
  };

  if (user?.role !== 'Member') {
    return (
      <div className="glass rounded-2xl p-8 border border-amber-500/20">
        <h1 className="font-display font-semibold text-2xl text-white mb-2">Member Activity Logging</h1>
        <p className="text-slate-400 text-sm">
          You are currently signed in with an <strong className="text-blue-400">Admin</strong> role. Workout and step logging is reserved for Member accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h1 className="font-display font-semibold text-2xl text-white mb-1">Daily Activity Logs</h1>
        <p className="text-slate-400 text-sm">Log your exercises and track automatic calorie burn computations.</p>
      </div>

      {/* Member Activity Logging Form */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-display font-semibold text-lg text-white mb-4">Record Exercise Set</h2>
        <form onSubmit={handleLog} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Select Exercise</label>
            <select
              value={selectedEx}
              onChange={(e) => setSelectedEx(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none"
            >
              {exercises.map((ex) => {
                const descriptor = ex.category || ex.type || ex.muscle_group;
                return (
                  <option key={ex.exercise_id} value={ex.exercise_id}>
                    {ex.name} {descriptor ? `(${descriptor})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Reps / Mins</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 pb-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-white/10 bg-white/5 text-cyan-400"
            />
            Share to Feed
          </label>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" /> Save Workout
          </button>
        </form>
      </div>

      {/* Activity History & Calorie Ledger */}
      <div className="glass rounded-2xl p-6 overflow-hidden">
        <h2 className="font-display font-semibold text-lg text-white mb-4">Workout Log History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Log ID</th>
                <th className="py-3 px-4">Exercise</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Calories Burned (Auto Trigger)</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No workouts logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.entry_id} className="hover:bg-white/5">
                    <td className="py-3.5 px-4 font-mono text-cyan-400">#{log.entry_id}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{log.exercise_name}</td>
                    <td className="py-3.5 px-4">{log.quantity}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                        <Flame className="w-4 h-4" /> {log.calories_burned} kcal
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{new Date(log.logged_at).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(log.entry_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete (Ownership Verification)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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