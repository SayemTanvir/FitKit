import dotenv from 'dotenv';
import pg from 'pg';

const base = process.env.FITKIT_API_URL || 'http://localhost:5000/api';

function expectOk(result, label) {
  if (!result.response.ok) {
    console.error(`${label} failed with HTTP ${result.response.status}.`);
    process.exitCode = 1;
  }
  return result;
}

async function request(path, token, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  console.log(`${options.method || 'GET'} ${path}: ${response.status}${response.ok ? '' : ` ${JSON.stringify(body)}`}`);
  return { response, body };
}

const login = await request('/auth/login', undefined, {
  method: 'POST',
  body: JSON.stringify({ email: 'member@fitkit.com', password: 'Password@123' }),
});
if (!login.response.ok) process.exit(1);

const token = login.body.token;
const adminLogin = await request('/auth/login', undefined, {
  method: 'POST',
  body: JSON.stringify({ email: 'admin@fitkit.com', password: 'Password@123' }),
});
if (!adminLogin.response.ok) process.exit(1);
const adminProfile = expectOk(await request('/auth/me', adminLogin.body.token), 'Admin profile');
if (adminProfile.response.ok) {
  const admin = adminProfile.body.user;
  const savedAdmin = expectOk(await request('/auth/me', adminLogin.body.token, {
    method: 'PUT',
    body: JSON.stringify({
      name: admin.name,
      gender: admin.gender,
      birth_date: admin.birth_date,
      height_cm: admin.height_cm,
      weight_kg: admin.weight_kg,
      fitness_level: admin.fitness_level,
      primary_goal: admin.primary_goal,
    }),
  }), 'Admin profile update');
  if (savedAdmin.response.ok && savedAdmin.body.user.birth_date !== admin.birth_date) {
    console.error('Admin birth date changed during profile round-trip.');
    process.exitCode = 1;
  }
}
const responses = {};
for (const path of [
  '/auth/me',
  '/exercises',
  '/plans',
  '/logs/summary',
  '/logs/analytics?days=7',
  '/logs/workout',
  '/logs/steps',
  '/logs/hydration',
  '/social/feed',
  '/social/leaderboard?metric=steps&period=week&level=All',
  '/social/leaderboard?metric=calories&period=month&level=Beginner',
  '/social/leaderboard?metric=workouts&period=all&level=All',
]) {
  responses[path] = expectOk(await request(path, token), `GET ${path}`);
}

const profile = responses['/auth/me'].body?.user;
if (!profile) throw new Error('Authenticated profile was not returned.');
if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.birth_date)) {
  console.error('Birth date must be a date-only string.');
  process.exitCode = 1;
}
const publicProfile = await request(`/auth/profile/${profile.id}`, token);
expectOk(publicProfile, 'Public profile');
if (publicProfile.response.ok && ('email' in publicProfile.body.user || 'birth_date' in publicProfile.body.user)) {
  console.error('Public profile exposes private fields.');
  process.exitCode = 1;
}
expectOk(await request('/auth/me', token, {
  method: 'PUT',
  body: JSON.stringify({
    name: profile.name,
    gender: profile.gender,
    birth_date: profile.birth_date,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    fitness_level: profile.fitness_level,
    primary_goal: profile.primary_goal,
    daily_step_goal: profile.daily_step_goal,
    daily_calorie_goal: profile.daily_calorie_goal,
    daily_hydration_goal: profile.daily_hydration_goal,
  }),
}), 'Profile update');

const activePlan = responses['/plans'].body.find((plan) => plan.is_active);
if (activePlan) {
  const restarted = expectOk(await request(`/plans/${activePlan.plan_id}/start`, token, { method: 'POST' }), 'Plan start');
  if (restarted.response.ok && restarted.body.start_date !== activePlan.active_start_date) {
    console.error('Starting an already-active plan reset its progress date.');
    process.exitCode = 1;
  }
}

const feedItem = responses['/social/feed'].body[0];
if (feedItem) {
  for (const field of ['fire_count', 'flex_count', 'clap_count']) {
    if (Number(feedItem[field]) < 0) {
      console.error(`Feed ${field} must be a real non-negative reaction count.`);
      process.exitCode = 1;
    }
  }
  const original = feedItem.my_reaction;
  const reaction = original || 'Fire';
  const field = { Fire: 'fire_count', Flex: 'flex_count', Clap: 'clap_count' }[reaction];
  const toggled = expectOk(await request(`/social/feed/${feedItem.feed_id}/reaction`, token, {
    method: 'POST',
    body: JSON.stringify({ reaction_type: reaction }),
  }), 'Reaction toggle on');
  const restored = expectOk(await request(`/social/feed/${feedItem.feed_id}/reaction`, token, {
    method: 'POST',
    body: JSON.stringify({ reaction_type: reaction }),
  }), 'Reaction toggle off');
  if (toggled.response.ok && restored.response.ok) {
    const expectedChange = original ? -1 : 1;
    if (Number(toggled.body[field]) !== Number(feedItem[field]) + expectedChange ||
        Number(restored.body[field]) !== Number(feedItem[field])) {
      console.error('Reaction counts did not update and restore correctly.');
      process.exitCode = 1;
    }
  }
}

const exercise = responses['/exercises'].body?.[0];
if (!exercise) throw new Error('Exercise catalogue is empty.');
const invalidLeaderboard = await request('/social/leaderboard?metric=unknown', token);
if (invalidLeaderboard.response.status !== 400) process.exitCode = 1;
const deniedPlan = await request('/plans', token, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Forbidden test plan', target_level: 'Beginner',
    goal_category: 'Strength', duration_weeks: 1,
    exercise_id: exercise.exercise_id, target_quantity: 1,
  }),
});
if (deniedPlan.response.status !== 403) process.exitCode = 1;
for (const path of ['/logs/steps', '/logs/hydration', '/logs/workout']) {
  const invalid = await request(path, token, { method: 'POST' });
  if (invalid.response.status !== 400) {
    console.error(`Empty POST ${path} should return HTTP 400.`);
    process.exitCode = 1;
  }
}

const createdPlan = await request('/plans', adminLogin.body.token, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Smoke test plan', target_level: 'Beginner',
    goal_category: 'Strength', duration_weeks: 1,
  }),
});
expectOk(createdPlan, 'Admin plan creation');
if (createdPlan.response.ok) {
  const beforeScheduling = expectOk(await request('/plans', token), 'Member plan listing before scheduling');
  if (beforeScheduling.body.some((plan) => plan.plan_id === createdPlan.body.plan_id)) {
    console.error('An empty draft plan is visible to members.');
    process.exitCode = 1;
  }
  const emptyStart = await request(`/plans/${createdPlan.body.plan_id}/start`, token, { method: 'POST' });
  if (emptyStart.response.status !== 404) process.exitCode = 1;
  const cardioExercise = responses['/exercises'].body.find((item) => item.category === 'Cardio');
  if (cardioExercise) {
    const mismatched = await request(`/plans/${createdPlan.body.plan_id}/exercises`, adminLogin.body.token, {
      method: 'POST',
      body: JSON.stringify({ exercise_id: cardioExercise.exercise_id, day_number: 1, target_quantity: 12 }),
    });
    if (mismatched.response.status !== 400) process.exitCode = 1;
  }
  expectOk(await request(`/plans/${createdPlan.body.plan_id}/exercises`, adminLogin.body.token, {
    method: 'POST',
    body: JSON.stringify({ exercise_id: exercise.exercise_id, day_number: 1, target_quantity: 12 }),
  }), 'Add plan exercise');
  const listedPlans = expectOk(await request('/plans', adminLogin.body.token), 'Admin plan listing');
  const afterScheduling = expectOk(await request('/plans', token), 'Member plan listing after scheduling');
  if (!afterScheduling.body.some((plan) => plan.plan_id === createdPlan.body.plan_id)) {
    console.error('A scheduled plan is not visible to members.');
    process.exitCode = 1;
  }
  const plannedExercise = listedPlans.body.find((plan) => plan.plan_id === createdPlan.body.plan_id)?.exercises?.[0];
  console.log('Created plan exercise:', plannedExercise?.name || 'MISSING');
  if (!plannedExercise) process.exitCode = 1;
  expectOk(await request(`/plans/${createdPlan.body.plan_id}/exercises/${exercise.exercise_id}/1`, adminLogin.body.token, {
    method: 'DELETE',
  }), 'Remove plan exercise');
  expectOk(await request(`/plans/${createdPlan.body.plan_id}`, adminLogin.body.token, { method: 'DELETE' }), 'Plan cleanup');
}

const workout = await request('/logs/workout', token, {
  method: 'POST',
  body: JSON.stringify({ exercise_id: exercise.exercise_id, quantity: 1, is_public: false }),
});
expectOk(workout, 'Workout logging');
if (workout.response.ok) {
  expectOk(await request(`/logs/workout/${workout.body.entry_id}`, token, { method: 'DELETE' }), 'Workout cleanup');
}

const step = await request('/logs/steps', token, {
  method: 'POST',
  body: JSON.stringify({ steps_added: 1, is_public: false }),
});
expectOk(step, 'Step logging');
if (step.response.ok) {
  const baselineScore = Number(responses['/social/leaderboard?metric=steps&period=week&level=All'].body.find((entry) => entry.user_id === profile.id)?.score || 0);
  const privateRanking = expectOk(await request('/social/leaderboard?metric=steps&period=week&level=All', token), 'Private step ranking');
  const privateScore = Number(privateRanking.body.find((entry) => entry.user_id === profile.id)?.score || 0);
  if (privateScore !== baselineScore) {
    console.error('Private steps leaked into leaderboard.');
    process.exitCode = 1;
  }
  expectOk(await request(`/logs/steps/${step.body.step_entry_id}`, token, { method: 'DELETE' }), 'Step cleanup');
  const publicStep = expectOk(await request('/logs/steps', token, {
    method: 'POST',
    body: JSON.stringify({ steps_added: 1, is_public: true }),
  }), 'Public step logging');
  if (publicStep.response.ok) {
    const publicRanking = expectOk(await request('/social/leaderboard?metric=steps&period=week&level=All', token), 'Public step ranking');
    const publicScore = Number(publicRanking.body.find((entry) => entry.user_id === profile.id)?.score || 0);
    if (publicScore !== baselineScore + 1) {
      console.error('Public steps did not update leaderboard.');
      process.exitCode = 1;
    }
    expectOk(await request(`/logs/steps/${publicStep.body.step_entry_id}`, token, { method: 'DELETE' }), 'Public step cleanup');
  }
}

const hydration = await request('/logs/hydration', token, {
  method: 'POST',
  body: JSON.stringify({ amount_ml: 1, is_public: false }),
});
expectOk(hydration, 'Hydration logging');
if (hydration.response.ok) {
  expectOk(await request(`/logs/hydration/${hydration.body.hydration_id}`, token, { method: 'DELETE' }), 'Hydration cleanup');
}

console.log('Analytics first date:', responses['/logs/analytics?days=7'].body?.[0]?.activity_date);
if (!/^\d{4}-\d{2}-\d{2}$/.test(responses['/logs/analytics?days=7'].body?.[0]?.activity_date || '')) {
  console.error('Analytics activity date must be a date-only string.');
  process.exitCode = 1;
}

const email = `fitkit-smoke-${Date.now()}@example.test`;
const registered = await request('/auth/register', undefined, {
  method: 'POST',
  body: JSON.stringify({
    name: 'Smoke Test Member',
    email,
    password: 'SmokeTest@123',
    gender: 'Male',
    birth_date: '2000-01-01',
    height_cm: 175,
    weight_kg: 70,
    fitness_level: 'Beginner',
  }),
});
if (registered.response.ok) {
  expectOk(await request('/auth/me', registered.body.token), 'New member profile');
  const planIds = responses['/plans'].body.filter((plan) => plan.exercises?.length).slice(0, 2).map((plan) => plan.plan_id);
  if (planIds.length === 2) {
    for (const planId of planIds) {
      expectOk(await request(`/plans/${planId}/start`, registered.body.token, { method: 'POST' }), 'Multi-plan start');
    }
    const memberPlans = expectOk(await request('/plans', registered.body.token), 'Multi-plan listing');
    const activeCount = memberPlans.body.filter((plan) => plan.is_active).length;
    if (activeCount !== 2) {
      console.error(`Expected two active plans, found ${activeCount}.`);
      process.exitCode = 1;
    }
  }
  dotenv.config({ path: 'backend/.env', quiet: true });
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'FitKitDB',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''),
  });
  try {
    const deleted = await pool.query('DELETE FROM users WHERE user_id = $1 AND email = $2', [registered.body.user.id, email]);
    if (deleted.rowCount !== 1) throw new Error('Temporary registration cleanup did not match one user.');
    console.log('Temporary registration removed.');
  } finally {
    await pool.end();
  }
} else {
  process.exitCode = 1;
}
