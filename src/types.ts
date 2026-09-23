export interface Reaction {
  emoji: string;
  count: number;
}

export interface SocialActivity {
  id: string;
  userId?: number;
  name: string;
  initials: string;
  avatarGradient: string; // tailwind gradient stops, e.g. "from-lime-400 to-emerald-500"
  message: string;
  timeAgo: string;
  reactions: Reaction[];
  activeReaction?: string | null;
}

export interface WeeklyMetric {
  activity_date: string;
  steps: number;
  hydration: number;
  calories: number;
  workouts: number;
}

export type AchievementIcon = 'footprints' | 'flame' | 'dumbbell' | 'lock';

export interface Achievement {
  id: string;
  label: string;
  icon: AchievementIcon;
  locked?: boolean;
}

export type ExerciseIcon = 'dumbbell' | 'timer';

export interface ExerciseData {
  name: string;
  detail: string;
  tag: string;
  icon: ExerciseIcon;
  iconBgClass: string;
}

export interface WorkoutPlanData {
  name: string;
  weekLabel: string;
  progressPct: number;
  exercises: ExerciseData[];
}

export interface WorkoutPlan {
  id: number;
  title: string;
  level: string;
  goal: string;
  duration: string;
  exercises: number;
  accent: string;
}

export interface Activity {
  id: number;
  name: string;
  detail: string;
  time: string;
  icon: string;
  calories: number;
}
