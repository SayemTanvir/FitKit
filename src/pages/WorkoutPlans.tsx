import React, { useEffect, useState } from 'react';
import { fetchWorkoutPlans, createWorkoutPlan, deleteWorkoutPlan, fetchExercises, startWorkoutPlan, addPlanExercise, removePlanExercise } from '../services/api';
import { PlusCircle, Dumbbell, Trash2, Play, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkoutPlans() {
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const role = user?.role;
  const [plans, setPlans] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [targetLevel, setTargetLevel] = useState('Beginner');
  const [goalCategory, setGoalCategory] = useState('Strength');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [exerciseId, setExerciseId] = useState(0);
  const [dayNumber, setDayNumber] = useState(1);
  const [targetQuantity, setTargetQuantity] = useState(12);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPlans = async () => {
    try {
      const data = await fetchWorkoutPlans();
      if (Array.isArray(data)) setPlans(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    if (role === 'Admin') {
      fetchExercises()
        .then((items) => {
          setExercises(items);
          if (items.length > 0) setExerciseId(items[0].exercise_id);
        })
        .catch((requestError) => setError(requestError.message));
    }
  }, [role]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    setSaving(true);
    try {
      const created = await createWorkoutPlan({
        title,
        target_level: targetLevel,
        goal_category: goalCategory,
        duration_weeks: Number(durationWeeks),
      });
      setTitle('');
      setSelectedPlanId(created.plan_id);
      setDayNumber(1);
      setStatusMsg('Plan created. Add its exercises below before members can start it.');
      await loadPlans();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !selectedPlan) return;
    const matching = exercises.filter((exercise) =>
      selectedPlan.goal_category === 'General Fitness' ||
      (selectedPlan.goal_category === 'Weight Loss' && exercise.category === 'Cardio') ||
      (selectedPlan.goal_category === 'Flexibility' && exercise.category === 'Flexibility') ||
      (['Strength', 'Muscle Gain'].includes(selectedPlan.goal_category) && exercise.category === 'Strength')
    );
    const chosenId = matching.some((exercise) => exercise.exercise_id === exerciseId) ? exerciseId : matching[0]?.exercise_id;
    if (!chosenId) return;
    setSaving(true);
    try {
      await addPlanExercise(selectedPlanId, { exercise_id: chosenId, day_number: dayNumber, target_quantity: targetQuantity });
      toast.success('Exercise saved to plan');
      await loadPlans();
    } catch (err: any) {
      toast.error(err.message || 'Could not save exercise');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExercise = async (planId: number, detail: any) => {
    if (!window.confirm(`Remove ${detail.name} from day ${detail.day_number}?`)) return;
    try {
      await removePlanExercise(planId, detail.exercise_id, detail.day_number);
      toast.success('Exercise removed');
      await loadPlans();
    } catch (err: any) {
      toast.error(err.message || 'Could not remove exercise');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!window.confirm('Delete this workout plan?')) return;
    try {
      await deleteWorkoutPlan(planId);
      if (selectedPlanId === planId) setSelectedPlanId(null);
      toast.success('Workout plan deleted');
      loadPlans();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStartPlan = async (planId: number) => {
    try {
      await startWorkoutPlan(planId);
      toast.success('Active workout plan updated');
      loadPlans();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedPlan = plans.find((plan) => plan.plan_id === selectedPlanId);
  const availableExercises = exercises.filter((exercise) =>
    !selectedPlan || selectedPlan.goal_category === 'General Fitness' ||
    (selectedPlan.goal_category === 'Weight Loss' && exercise.category === 'Cardio') ||
    (selectedPlan.goal_category === 'Flexibility' && exercise.category === 'Flexibility') ||
    (['Strength', 'Muscle Gain'].includes(selectedPlan.goal_category) && exercise.category === 'Strength')
  );
  const visibleExerciseId = availableExercises.some((exercise) => exercise.exercise_id === exerciseId) ? exerciseId : availableExercises[0]?.exercise_id || 0;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h1 className="font-display font-semibold text-2xl text-white mb-1">Workouts &amp; Plans</h1>
        <p className="text-slate-400 text-sm">Browse plans, schedule exercises, and track the programs you start.</p>
      </div>

      {/* Admin Exclusive: Plan Curation Workspace */}
      {user?.role === 'Admin' && (
        <div className="glass rounded-2xl p-6 border border-blue-500/20 bg-blue-950/10">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <PlusCircle className="w-5 h-5" />
            <h2 className="font-display font-semibold text-lg text-white">Create a Plan</h2>
          </div>

          {statusMsg && <div className="text-emerald-400 text-sm mb-4 font-medium">{statusMsg}</div>}

          <p className="text-sm text-slate-400 mb-4">Set the plan basics first. Then add its exercise schedule below.</p>
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
              <option value="General Fitness">General Fitness</option>
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
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans Catalog Table */}
      <div className="glass rounded-2xl p-6 overflow-hidden">
        <h2 className="font-display font-semibold text-lg text-white mb-4">Curated Catalog</h2>
        {error && <p className="text-red-300 text-sm mb-4">{error}</p>}
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
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">Loading plans...</td></tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No workout plans published yet.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.plan_id} className="hover:bg-white/5">
                    <td className="py-3.5 px-4 font-mono text-cyan-400">#{p.plan_id}</td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <button type="button" onClick={() => setSelectedPlanId(p.plan_id)} className="inline-flex items-center gap-2 text-left hover:text-cyan-300">
                        <Dumbbell className="w-4 h-4 text-cyan-400" /> {p.title}
                      </button>
                      <span className="ml-2 text-xs text-slate-500">({p.exercises?.length || 0} exercises)</span>
                    </td>
                    <td className="py-3.5 px-4">{p.target_level}</td>
                    <td className="py-3.5 px-4">{p.goal_category}</td>
                    <td className="py-3.5 px-4">{p.duration_weeks} Weeks</td>
                    <td className="py-3.5 px-4 text-slate-400">{p.curated_by}</td>
                    {user?.role === 'Admin' && (
                      <td className="py-3.5 px-4 text-right">
                        <button type="button" onClick={() => handleStartPlan(p.plan_id)} disabled={p.is_active || !p.exercises?.length} className="mr-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:bg-emerald-500/10 disabled:text-emerald-300">
                          {p.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{p.is_active ? 'Active' : !p.exercises?.length ? 'Awaiting exercises' : 'Start plan'}
                        </button>
                        <button type="button" onClick={() => setSelectedPlanId(p.plan_id)} className="mr-2 text-xs text-cyan-300 hover:text-cyan-200">Edit exercises</button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(p.plan_id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          aria-label={`Delete ${p.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                    {user?.role === 'Member' && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleStartPlan(p.plan_id)}
                          disabled={p.is_active || !p.exercises?.length}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:bg-emerald-500/10 disabled:text-emerald-300"
                        >
                          {p.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {p.is_active ? 'Active' : !p.exercises?.length ? 'Awaiting exercises' : 'Start plan'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlan && (
        <div className="glass rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="font-display font-semibold text-xl text-white">{selectedPlan.title} · Exercise Schedule</h2>
            <p className="text-sm text-slate-400 mt-1">Day numbers run from 1 to {selectedPlan.duration_weeks * 7}. Select another plan above to view its details.</p>
          </div>
          {selectedPlan.exercises?.length ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {selectedPlan.exercises.map((detail: any) => (
                <div key={`${detail.exercise_id}-${detail.day_number}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white">Day {detail.day_number} · {detail.name}</p><p className="text-xs text-slate-400">Target: {detail.target_quantity} reps/minutes</p></div>
                  {role === 'Admin' && <button type="button" onClick={() => handleRemoveExercise(selectedPlan.plan_id, detail)} className="p-2 text-slate-400 hover:text-red-300" aria-label={`Remove ${detail.name} from day ${detail.day_number}`}><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-amber-300">No exercises yet. Members cannot start this plan until an exercise is saved.</p>}
          {role === 'Admin' && (
            <form onSubmit={handleAddExercise} className="grid sm:grid-cols-4 gap-3 border-t border-white/10 pt-5">
              <label className="text-xs text-slate-400">Exercise<select value={visibleExerciseId} onChange={(e) => setExerciseId(Number(e.target.value))} className="input-pro mt-1.5">{availableExercises.map((exercise) => <option key={exercise.exercise_id} value={exercise.exercise_id}>{exercise.name} ({exercise.category})</option>)}</select></label>
              <label className="text-xs text-slate-400">Day<input type="number" min={1} max={selectedPlan.duration_weeks * 7} value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))} className="input-pro mt-1.5" required /></label>
              <label className="text-xs text-slate-400">Target reps/minutes<input type="number" min={1} value={targetQuantity} onChange={(e) => setTargetQuantity(Number(e.target.value))} className="input-pro mt-1.5" required /></label>
              <button type="submit" disabled={saving || !availableExercises.length} className="self-end h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Saving...' : 'Add exercise'}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
