import dotenv from 'dotenv';
import pg from 'pg';

const base = process.env.FITKIT_API_URL || 'http://localhost:5000/api';
async function call(path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
async function upload(token,purpose,expected=201){
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=','base64');
  const response=await fetch(`${base}/community/media/${purpose}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'image/png'},body:png});
  const data=await response.json();if(response.status!==expected)throw new Error(`Upload ${purpose}: ${response.status} ${JSON.stringify(data)}`);
  return data.url;
}

dotenv.config({ path: 'backend/.env', quiet: true });
const pool = new pg.Pool({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME || 'FitKitDB', user: process.env.DB_USER || 'postgres', password: String(process.env.DB_PASSWORD || '') });
let programmeId, memberId, exerciseId, cover, exerciseImage, adminPhotoUserId;
try {
  const admin = await call('/auth/login', null, 'POST', { email: 'admin@fitkit.com', password: 'Password@123' });
  const adminEmail=`photo-admin-${Date.now()}@example.test`;
  const temporaryAdmin=await pool.query(`INSERT INTO users(name,email,password_hash,birth_date,height_cm,weight_kg)
    SELECT 'Photo Smoke Admin',$1,password_hash,birth_date,height_cm,weight_kg FROM users WHERE email='admin@fitkit.com' RETURNING user_id`,[adminEmail]);
  adminPhotoUserId=temporaryAdmin.rows[0].user_id;
  await pool.query("INSERT INTO Admin(user_id,admin_role) VALUES ($1,'Smoke Admin')",[adminPhotoUserId]);
  const photoAdmin=await call('/auth/login',null,'POST',{email:adminEmail,password:'Password@123'});
  const adminAvatar=await upload(photoAdmin.token,'avatar');
  await call('/auth/me/photo',photoAdmin.token,'PUT',{photo_url:adminAvatar});
  if((await call('/auth/me',photoAdmin.token)).user.photo_url!==adminAvatar)throw new Error('Admin avatar was not persisted.');
  await call('/auth/me/photo',photoAdmin.token,'DELETE');
  if((await call('/auth/me',photoAdmin.token)).user.photo_url!==null)throw new Error('Admin avatar removal failed.');
  const demoList = await call('/programmes?mine=true', admin.token);
  const demo = demoList.find((item) => item.name === 'Foundation Strength: Two-Week Progression');
  if (!demo) throw new Error('Seeded demo programme missing. Run npm run migrate:existing.');
  const demoDetails = await call(`/programmes/${demo.programme_id}`, admin.token);
  if (demoDetails.weeks.length !== 2 || demoDetails.weeks[0].days[0].exercises.length < 2) throw new Error('Seeded demo programme has incomplete prescriptions.');
  const email = `programme-smoke-${Date.now()}@example.test`;
  const member = await call('/auth/register', null, 'POST', { name: 'Programme Smoke Member', email, password: 'SmokeTest@123', gender: 'Female', birth_date: '2000-01-01', height_cm: 165, weight_kg: 60, fitness_level: 'Beginner' });
  memberId = member.user.id;
  await upload(member.token,'programme',403);
  cover=await upload(admin.token,'programme');
  exerciseImage=await upload(admin.token,'exercise');
  const exercise = await call('/exercises', admin.token, 'POST', {
    name: `Smoke Tempo Squat ${Date.now()}`, category: 'Strength', target_muscle_group: 'Quads',
    difficulty_level: 'Beginner', tracking_type: 'reps', calorie_factor: 0.3,
    description: 'Disposable integration exercise.', instructions: 'Move with control.', media_url:exerciseImage,
  });
  exerciseId = exercise.exercise_id;
  await call(`/exercises/${exerciseId}/archive`, admin.token, 'PATCH', { is_active: false });
  await call(`/exercises/${exerciseId}/archive`, admin.token, 'PATCH', { is_active: true });
  const draft = await call('/programmes', admin.token, 'POST', {
    name: 'Disposable two-week test', description: 'Integration test programme.', goal: 'strength', difficulty: 'Beginner', duration_weeks: 2,
    days_per_week: 2, session_minutes: 30, environment: 'home', equipment: 'Bodyweight', audience: 'Demo members', visibility: 'public',cover_url:cover,
  });
  programmeId = draft.programme_id;
  if (draft.weeks.length !== 2 || draft.weeks[0].days.length !== 7) throw new Error('Draft weeks were not initialized.');
  const weeks = draft.weeks;
  for (const week of weeks) {
    for (const dayNumber of [1, 3]) {
      const day = week.days[dayNumber - 1];
      day.day_type = 'Training'; day.session_title = `Week ${week.week_number} day ${dayNumber}`; day.estimated_minutes = 30;
      day.exercises = [{ exercise_id: exercise.exercise_id, sets: 2, tracking_type: 'reps', rep_min: 8 + week.week_number, rep_max: 10 + week.week_number, rest_seconds: 60, notes: 'Controlled tempo' }];
    }
  }
  const saved = await call(`/programmes/${programmeId}/structure`, admin.token, 'PUT', { weeks });
  if (saved.weeks[1].days[2].exercises[0].rep_min !== 10) throw new Error('Week-specific progression was not saved.');
  const published = await call(`/programmes/${programmeId}/publish`, admin.token, 'POST');
  if (published.status !== 'Published') throw new Error('Programme was not published.');
  const coverResponse=await fetch(`${base.replace(/\/api$/,'')}${cover}`,{headers:{Authorization:`Bearer ${member.token}`}});
  if(coverResponse.status!==200)throw new Error('Published cover image unavailable to member.');
  const enrollment = await call(`/programmes/${programmeId}/enroll`, member.token, 'POST');
  const session = published.weeks[0].days[0];
  const log = await call(`/programmes/enrollments/${enrollment.enrollment_id}/sessions/${session.session_id}`, member.token, 'POST');
  const prescription = session.exercises[0];
  for (const setNumber of [1, 2]) await call(`/programmes/logs/${log.log_id}/sets/${prescription.prescription_id}/${setNumber}`, member.token, 'PUT', { actual_reps: 9, actual_load_kg: 0, rpe: 7, completed: true });
  const finished = await call(`/programmes/logs/${log.log_id}/finish`, member.token, 'POST', { notes: 'Good session' });
  if (finished.status !== 'Completed') throw new Error('Workout did not complete.');
  const history = await call(`/programmes/enrollments/${enrollment.enrollment_id}/logs`, member.token);
  if (history[0]?.sets?.length !== 2) throw new Error('Set performance was not persisted.');
  const progress = await call('/programmes/enrollments', member.token);
  if (progress.find((item) => item.enrollment_id === enrollment.enrollment_id)?.completed_sessions !== 1) throw new Error('Completion progress is wrong.');
  const version2 = await call(`/programmes/${programmeId}/new-version`, admin.token, 'POST');
  if (version2.version_number !== 2 || version2.status !== 'Draft') throw new Error('New version was not created.');
  const stillPublished = await call(`/programmes/${programmeId}`, member.token);
  if (stillPublished.version_id !== published.version_id) throw new Error('Member saw an unpublished draft version.');
  const original = await call(`/programmes/${programmeId}?version=${published.version_id}`, member.token);
  if (original.weeks[1].days[2].exercises[0].rep_min !== 10) throw new Error('Published version changed after cloning.');
  await call(`/programmes/${programmeId}/archive`, admin.token, 'PATCH', { archived: true });
  const hidden = await call('/programmes', member.token);
  if (hidden.some((item) => item.programme_id === programmeId)) throw new Error('Archived programme was visible in discovery.');
  const enrolledArchive = await call(`/programmes/${programmeId}?version=${published.version_id}`, member.token);
  if (enrolledArchive.version_id !== published.version_id) throw new Error('Archiving broke an existing enrollment.');
  await call(`/programmes/${programmeId}/archive`, admin.token, 'PATCH', { archived: false });
  console.log('Programme smoke passed: draft, progression, publication, enrollment, actual sets, completion, version integrity, archive.');
} finally {
  if (memberId) await pool.query('DELETE FROM users WHERE user_id=$1', [memberId]);
  if (programmeId) await pool.query('DELETE FROM TrainingProgramme WHERE programme_id=$1', [programmeId]);
  if (exerciseId) await pool.query('DELETE FROM Exercise WHERE exercise_id=$1', [exerciseId]);
  if(adminPhotoUserId)await pool.query('DELETE FROM users WHERE user_id=$1',[adminPhotoUserId]);
  for(const url of [cover,exerciseImage])if(url)await pool.query('DELETE FROM MediaAsset WHERE media_id=$1',[Number(url.split('/').at(-1))]);
  await pool.end();
}
