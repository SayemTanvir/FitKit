const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new Error('Cannot reach the FitKit API. Start the app with npm run dev and check PostgreSQL.');
  }
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.assign('/login');
    }
    throw new Error(data.error || 'The server could not complete this request.');
  }

  return data as T;
}

export const setMyPhoto=(photo_url:string)=>request<{photo_url:string}>('/auth/me/photo',{method:'PUT',headers:getAuthHeaders(),body:JSON.stringify({photo_url})});
export const removeMyPhoto=()=>request<{photo_url:null}>('/auth/me/photo',{method:'DELETE',headers:getAuthHeaders()});

export async function loginUser(credentials: { email: string; password: string }) {
  return request<any>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
}

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
  gender?: string;
  birth_date?: string;
  height_cm?: number;
  weight_kg?: number;
  fitness_level?: string;
  primary_goal?: string;
}) {
  return request<any>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
}

export async function fetchMyProfile(userId?: string) {
  const path = userId ? `/auth/profile/${userId}` : '/auth/me';
  return request<any>(path, { headers: getAuthHeaders() });
}

export async function updateMyProfile(profile: Record<string, unknown>) {
  return request<any>('/auth/me', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });
}

export async function fetchExercises() {
  return request<any[]>('/exercises', { headers: getAuthHeaders() });
}

export async function saveExerciseLibraryItem(data: Record<string, unknown>, id?: number) {
  return request<any>(id ? `/exercises/${id}` : '/exercises', {
    method: id ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
  });
}

export async function setExerciseActive(id: number, is_active: boolean) {
  return request<any>(`/exercises/${id}/archive`, {
    method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ is_active }),
  });
}

export async function fetchWorkoutPlans() {
  return request<any[]>('/plans', { headers: getAuthHeaders() });
}

export async function createWorkoutPlan(plan: {
  title: string;
  target_level: string;
  goal_category: string;
  duration_weeks: number;
  exercise_id?: number;
  target_quantity?: number;
}) {
  return request<any>('/plans', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(plan),
  });
}

export async function addPlanExercise(planId: number, detail: {
  exercise_id: number;
  day_number: number;
  target_quantity: number;
}) {
  return request<any>(`/plans/${planId}/exercises`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(detail),
  });
}

export async function removePlanExercise(planId: number, exerciseId: number, dayNumber: number) {
  return request<{ message: string }>(`/plans/${planId}/exercises/${exerciseId}/${dayNumber}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function updateWorkoutPlan(planId: number, plan: {
  title: string;
  target_level: string;
  goal_category: string;
  duration_weeks: number;
}) {
  return request<any>(`/plans/${planId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(plan),
  });
}

export async function deleteWorkoutPlan(planId: number) {
  return request<{ message: string }>(`/plans/${planId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function startWorkoutPlan(planId: number) {
  return request<any>(`/plans/${planId}/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

export async function fetchMyWorkoutLogs() {
  return request<any[]>('/logs/workout', { headers: getAuthHeaders() });
}

export async function logWorkout(entry: {
  exercise_id: number;
  quantity: number;
  is_public: boolean;
}) {
  return request<any>('/logs/workout', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(entry),
  });
}

export async function deleteWorkoutLog(entryId: number) {
  return request<{ message: string }>(`/logs/workout/${entryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function fetchSocialFeed() {
  return request<any[]>('/social/feed', { headers: getAuthHeaders() });
}

export async function fetchLeaderboard(filters: {
  metric: 'steps' | 'calories' | 'workouts';
  period: 'today' | 'week' | 'month' | 'all';
  level: 'All' | 'Beginner' | 'Intermediate' | 'Advanced';
}) {
  const params = new URLSearchParams(filters);
  return request<any[]>(`/social/leaderboard?${params}`, { headers: getAuthHeaders() });
}

export async function fetchDailySummary() {
  return request<any>('/logs/summary', { headers: getAuthHeaders() });
}

export async function fetchWeeklyAnalytics(days = 7) {
  return request<any[]>(`/logs/analytics?days=${days}`, { headers: getAuthHeaders() });
}

export async function reactToFeed(feedId: number, reaction_type: 'Fire' | 'Flex' | 'Clap') {
  return request<any>(`/social/feed/${feedId}/reaction`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reaction_type }),
  });
}

export async function logHydration(amount_ml = 250) {
  return request<any>('/logs/hydration', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount_ml }),
  });
}

export async function fetchHydrationHistory() {
  return request<any[]>('/logs/hydration', { headers: getAuthHeaders() });
}

export async function deleteHydrationEntry(entryId: number) {
  return request<{ message: string }>(`/logs/hydration/${entryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function logSteps(steps_added = 1000, is_public = false) {
  return request<any>('/logs/steps', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ steps_added, is_public }),
  });
}

export async function fetchStepHistory() {
  return request<any[]>('/logs/steps', { headers: getAuthHeaders() });
}

export async function deleteStepEntry(entryId: number) {
  return request<{ message: string }>(`/logs/steps/${entryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}
