import type { SocialActivity, Achievement, WorkoutPlanData } from '../types';

export const workoutPlan: WorkoutPlanData = {
  name: 'Full Body Hypertrophy',
  weekLabel: 'Week 2 of 4',
  progressPct: 50,
  exercises: [
    {
      name: 'Push-ups',
      detail: '3 sets × 12 reps',
      tag: 'Strength',
      icon: 'dumbbell',
      iconBgClass: 'bg-lime-400/10 border-lime-400/20',
    },
    {
      name: 'Treadmill Running',
      detail: '20 minutes · moderate pace',
      tag: 'Cardio',
      icon: 'timer',
      iconBgClass: 'bg-cyan-400/10 border-cyan-400/20',
    },
  ],
};

export const socialActivities: SocialActivity[] = [
  {
    id: '1',
    name: 'Jane Doe',
    initials: 'JD',
    avatarGradient: 'from-lime-400 to-emerald-500',
    message: 'completed her 10K Step Goal! 🎯',
    timeAgo: '12 minutes ago',
    reactions: [
      { emoji: '🔥', count: 14 },
      { emoji: '💪', count: 6 },
      { emoji: '👏', count: 3 },
    ],
  },
  {
    id: '2',
    name: 'Marcus Reyes',
    initials: 'MR',
    avatarGradient: 'from-cyan-400 to-blue-500',
    message: 'set a new PR on Deadlift: 315 lb',
    timeAgo: '48 minutes ago',
    reactions: [
      { emoji: '🔥', count: 21 },
      { emoji: '💪', count: 9 },
      { emoji: '👏', count: 2 },
    ],
  },
  {
    id: '3',
    name: 'Priya Lal',
    initials: 'PL',
    avatarGradient: 'from-fuchsia-400 to-purple-500',
    message: 'joined the "Full Body Hypertrophy" plan',
    timeAgo: '2 hours ago',
    reactions: [
      { emoji: '🔥', count: 8 },
      { emoji: '💪', count: 4 },
      { emoji: '👏', count: 1 },
    ],
  },
];

export const achievements: Achievement[] = [
  { id: 'a1', label: '10K Club', icon: 'footprints' },
  { id: 'a2', label: '7-Day Streak', icon: 'flame' },
  { id: 'a3', label: 'Iron Beginner', icon: 'dumbbell' },
  { id: 'a4', label: 'Marathoner', icon: 'lock', locked: true },
];

export const rankInfo = {
  currentRank: 'Silver Member',
  nextRank: 'Gold Rank',
  tenure: '3 years',
  xpCurrent: 680,
  xpTarget: 1000,
};

export const dailyStats = {
  steps: 10500,
  stepsGoal: 10000,
  calories: 620,
  caloriesGoal: 800,
  hydration: 1750,
  hydrationGoal: 2800,
  streakDays: 7,
  streakBest: 12,
};
