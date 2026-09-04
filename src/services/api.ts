const BASE_URL = 'http://localhost:5000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// Authentication
export async function loginUser(credentials: { email: string; password: string }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

// Exercise Catalog
export async function fetchExercises() {
  const res = await fetch(`${BASE_URL}/exercises`, { headers: getAuthHeaders() });
  return res.json();
}

// Workout Plans (Admin & Member)
export async function fetchWorkoutPlans() {
  const res = await fetch(`${BASE_URL}/plans`, { headers: getAuthHeaders() });
  return res.json();
}

export async function createWorkoutPlan(plan: {
  title: string;
  target_level: string;
  goal_category: string;
  duration_weeks: number;
}) {
  const res = await fetch(`${BASE_URL}/plans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(plan),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create plan');
  }
  return res.json();
}

// Member Activity Logging & Ownership
export async function fetchMyWorkoutLogs() {
  const res = await fetch(`${BASE_URL}/logs/workout`, { headers: getAuthHeaders() });
  return res.json();
}

export async function logWorkout(entry: {
  exercise_id: number;
  quantity: number;
  is_public: boolean;
}) {
  const res = await fetch(`${BASE_URL}/logs/workout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to log workout');
  }
  return res.json();
}

export async function deleteWorkoutLog(entryId: number) {
  const res = await fetch(`${BASE_URL}/logs/workout/${entryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete log');
  }
  return res.json();
}

export async function fetchSocialFeed() {
  const res = await fetch('http://localhost:5000/api/social/feed', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch social feed');
  return res.json();
}

export async function fetchDailySummary() {
  const res = await fetch(`${BASE_URL}/logs/summary`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch daily summary');
  return res.json();
}

export async function logHydration(amount_ml: number = 250) {
  const res = await fetch(`${BASE_URL}/logs/hydration`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount_ml }),
  });
  if (!res.ok) throw new Error('Failed to log hydration');
  return res.json();
}

export async function logSteps(steps_added: number = 1000, is_public: boolean = true) {
  const res = await fetch(`${BASE_URL}/logs/steps`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ steps_added, is_public }),
  });
  if (!res.ok) throw new Error('Failed to log steps');
  return res.json();
}

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  fitness_level?: string;
}) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}