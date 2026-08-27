import type { Activity, WorkoutPlan } from './types'

export const workoutPlans: WorkoutPlan[] = [
  { id: 1, title: 'Full Body Foundation', level: 'Beginner', goal: 'General Fitness', duration: '4 weeks', exercises: 18, accent: 'violet' },
  { id: 2, title: 'Strength Builder', level: 'Intermediate', goal: 'Strength', duration: '6 weeks', exercises: 26, accent: 'cyan' },
  { id: 3, title: 'Lean & Strong', level: 'Advanced', goal: 'Weight Loss', duration: '8 weeks', exercises: 32, accent: 'orange' },
]

export const recentActivities: Activity[] = [
  { id: 1, name: 'Upper Body Power', detail: '45 min · 8 exercises', time: 'Today, 9:24 AM', icon: '▣', calories: 318 },
  { id: 2, name: 'Morning Walk', detail: '3.2 km · 4,126 steps', time: 'Today, 7:10 AM', icon: '◉', calories: 184 },
  { id: 3, name: 'Evening Stretch', detail: '18 min · Flexibility', time: 'Yesterday, 8:41 PM', icon: '✦', calories: 62 },
]

export const feed = [
  { id: 1, name: 'Nadia Rahman', initials: 'NR', text: 'Completed my first 10K step streak! 🔥', time: '18 min ago', likes: 24, reaction: '🔥' },
  { id: 2, name: 'Arif Hasan', initials: 'AH', text: 'Finished the Strength Builder — week 3/6 💪', time: '1 hr ago', likes: 17, reaction: '👏' },
  { id: 3, name: 'Maliha Chowdhury', initials: 'MC', text: 'New personal best on squats today.', time: '3 hrs ago', likes: 31, reaction: '💪' },
]
