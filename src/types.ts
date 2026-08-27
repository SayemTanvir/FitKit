export interface Reaction {
  emoji: string;
  count: number;
}

export interface SocialActivity {
  id: string;
  name: string;
  initials: string;
  avatarGradient: string; // tailwind gradient stops, e.g. "from-lime-400 to-emerald-500"
  message: string;
  timeAgo: string;
  reactions: Reaction[];
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
