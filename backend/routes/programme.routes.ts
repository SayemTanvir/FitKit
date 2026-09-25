import { Router, Response } from 'express';
import pool, { query } from '../db';
import { AuthRequest, requireRole, verifyToken } from '../middleware/auth.middleware';

const router = Router();
router.use(verifyToken);

const goals = new Set(['hypertrophy', 'strength', 'endurance', 'fat loss', 'general fitness', 'mobility', 'athletic conditioning']);
const difficulties = new Set(['Beginner', 'Intermediate', 'Advanced']);
const environments = new Set(['gym', 'home', 'outdoor', 'hybrid']);

function details(body: any) {
  const name = String(body?.name || '').trim();
  const description = String(body?.description || '').trim();
  const goal = String(body?.goal || '').trim().toLowerCase();
  const difficulty = String(body?.difficulty || 'Beginner');
  const environment = String(body?.environment || 'hybrid');
  const durationWeeks = Number(body?.duration_weeks);
  const daysPerWeek = Number(body?.days_per_week);
  const sessionMinutes = Number(body?.session_minutes);
  if (!name || name.length > 120 || !description ||
      (!goals.has(goal) && !(goal.startsWith('custom:') && goal.length <= 60)) ||
      !difficulties.has(difficulty) || !environments.has(environment) ||
      !Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 52 ||
      !Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7 ||
      !Number.isInteger(sessionMinutes) || sessionMinutes < 5 || sessionMinutes > 300) {
    return { error: 'Provide a name, description, valid goal, difficulty, duration, training days, and session length.' };
  }
  const coverUrl = body?.cover_url ? String(body.cover_url) : null;
  if (coverUrl && (!/^https:\/\//i.test(coverUrl) && !/^\/api\/community\/media\/\d+$/.test(coverUrl) || coverUrl.length > 1000)) return { error: 'Cover image must be an HTTPS URL or uploaded image.' };
  return {
    name, description, goal, difficulty, environment, durationWeeks, daysPerWeek, sessionMinutes,
    coverUrl, equipment: String(body?.equipment || '').slice(0, 2000),
    audience: String(body?.audience || '').slice(0, 2000), prerequisites: String(body?.prerequisites || '').slice(0, 2000),
    restrictions: String(body?.restrictions || '').slice(0, 2000),
    targetMuscles: Array.isArray(body?.target_muscles) ? body.target_muscles.map(String).slice(0, 20) : [],
    tags: Array.isArray(body?.tags) ? body.tags.map(String).slice(0, 20) : [],
    visibility: body?.visibility === 'unlisted' ? 'unlisted' : 'public',
  };
}

async function loadProgramme(programmeId: number, versionId?: number) {
  const header = await query(
    `SELECT tp.*, u.name AS creator_name, u.profile_photo_url AS creator_photo_url, pv.version_id, pv.version_number, pv.status, pv.published_at, pv.details_snapshot
     FROM TrainingProgramme tp
     JOIN users u ON u.user_id = tp.admin_id
     JOIN ProgrammeVersion pv ON pv.programme_id = tp.programme_id
     WHERE tp.programme_id = $1 AND pv.version_id = COALESCE($2,
       (SELECT version_id FROM ProgrammeVersion WHERE programme_id = $1 ORDER BY (status = 'Draft') DESC, version_number DESC LIMIT 1))`,
    [programmeId, versionId || null]
  );
  if (!header.rowCount) return null;
  const rows = await query(
    `SELECT pw.week_number, pw.title AS week_title, pw.is_deload, pw.progression_notes,
            pd.day_number, pd.day_type, pd.title AS day_title, pd.notes AS day_notes,
            ws.session_id, ws.title AS session_title, ws.estimated_minutes,
            ep.prescription_id, ep.exercise_id, ep.position, ep.sets, ep.tracking_type,
            ep.rep_min, ep.rep_max, ep.target_load_kg, ep.duration_seconds, ep.distance_meters,
            ep.rpe, ep.rest_seconds, ep.tempo, ep.is_warmup, ep.notes AS exercise_notes,
            e.name AS exercise_name, e.media_url AS exercise_media_url
     FROM ProgrammeWeek pw
     LEFT JOIN ProgrammeDay pd ON pd.week_id = pw.week_id
     LEFT JOIN WorkoutSession ws ON ws.day_id = pd.day_id
     LEFT JOIN ExercisePrescription ep ON ep.session_id = ws.session_id
     LEFT JOIN Exercise e ON e.exercise_id = ep.exercise_id
     WHERE pw.version_id = $1
     ORDER BY pw.week_number, pd.day_number, ep.position`,
    [header.rows[0].version_id]
  );
  const weeks: any[] = [];
  for (const row of rows.rows) {
    let week = weeks.find((item) => item.week_number === row.week_number);
    if (!week) {
      week = { week_number: row.week_number, title: row.week_title, is_deload: row.is_deload, progression_notes: row.progression_notes, days: [] };
      weeks.push(week);
    }
    if (!row.day_number) continue;
    let day = week.days.find((item: any) => item.day_number === row.day_number);
    if (!day) {
      day = { day_number: row.day_number, day_type: row.day_type, title: row.day_title, notes: row.day_notes,
        session_id: row.session_id, session_title: row.session_title, estimated_minutes: row.estimated_minutes, exercises: [] };
      week.days.push(day);
    }
    if (row.prescription_id) day.exercises.push({
      prescription_id: row.prescription_id, exercise_id: row.exercise_id, exercise_name: row.exercise_name,
      exercise_media_url: row.exercise_media_url,
      position: row.position, sets: row.sets, tracking_type: row.tracking_type, rep_min: row.rep_min,
      rep_max: row.rep_max, target_load_kg: row.target_load_kg, duration_seconds: row.duration_seconds,
      distance_meters: row.distance_meters, rpe: row.rpe, rest_seconds: row.rest_seconds,
      tempo: row.tempo, is_warmup: row.is_warmup, notes: row.exercise_notes,
    });
  }
  const item = header.rows[0];
  return { ...item, ...(item.status !== 'Draft' ? item.details_snapshot || {} : {}), weeks };
}

function validateWeeks(weeks: any, duration: number, daysPerWeek: number, exerciseIds: Set<number>, requireComplete = false) {
  if (!Array.isArray(weeks) || weeks.length !== duration) return 'Every programme week must be present.';
  for (let index = 0; index < weeks.length; index++) {
    const week = weeks[index];
    if (week.week_number !== index + 1 || !Array.isArray(week.days) || week.days.length !== 7) return `Week ${index + 1} needs days 1–7.`;
    let training = 0;
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = week.days[dayIndex];
      if (day.day_number !== dayIndex + 1 || !['Training', 'Rest'].includes(day.day_type)) return `Week ${index + 1}, day ${dayIndex + 1} is invalid.`;
      if (day.day_type === 'Rest') continue;
      training++;
      if (!String(day.session_title || '').trim() || !Array.isArray(day.exercises) || (requireComplete && !day.exercises.length)) return `Week ${index + 1}, day ${dayIndex + 1} needs a titled session and exercises.`;
      for (const exercise of day.exercises) {
        const sets = Number(exercise.sets);
        if (!exerciseIds.has(Number(exercise.exercise_id)) || !Number.isInteger(sets) || sets < 1 || sets > 20) return `Week ${index + 1}, day ${dayIndex + 1} has an invalid exercise or set count.`;
        if (!['reps', 'time', 'distance'].includes(exercise.tracking_type) ||
            (exercise.tracking_type === 'reps' && !(Number(exercise.rep_min) > 0 && Number(exercise.rep_max) >= Number(exercise.rep_min))) ||
            (exercise.tracking_type === 'time' && !(Number(exercise.duration_seconds) > 0)) ||
            (exercise.tracking_type === 'distance' && !(Number(exercise.distance_meters) > 0))) return `Week ${index + 1}, day ${dayIndex + 1} has an incomplete prescription.`;
      }
    }
    if (requireComplete && training !== daysPerWeek) return `Week ${index + 1} needs exactly ${daysPerWeek} training days.`;
  }
  return null;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const mine = req.query.mine === 'true' && req.user!.role === 'Admin';
  const result = await query(
    `SELECT tp.programme_id,
            COALESCE(pv.details_snapshot->>'name',tp.name) AS name,
            COALESCE(pv.details_snapshot->>'description',tp.description) AS description,
            COALESCE(pv.details_snapshot->>'cover_url',tp.cover_url) AS cover_url,
            COALESCE(pv.details_snapshot->>'goal',tp.goal) AS goal,
            COALESCE(pv.details_snapshot->>'difficulty',tp.difficulty) AS difficulty,
            COALESCE((pv.details_snapshot->>'duration_weeks')::int,tp.duration_weeks) AS duration_weeks,
            COALESCE((pv.details_snapshot->>'days_per_week')::int,tp.days_per_week) AS days_per_week,
            COALESCE((pv.details_snapshot->>'session_minutes')::int,tp.session_minutes) AS session_minutes,
            COALESCE(pv.details_snapshot->>'environment',tp.environment) AS environment,
            tp.equipment, tp.tags, tp.updated_at, tp.archived_at, u.name AS creator_name, u.profile_photo_url AS creator_photo_url,
            pv.version_id, pv.version_number, pv.status,
            (SELECT COUNT(*)::int FROM ProgrammeEnrollment pe WHERE pe.version_id = pv.version_id) AS enrollments
     FROM TrainingProgramme tp JOIN users u ON u.user_id = tp.admin_id
     JOIN LATERAL (
       SELECT * FROM ProgrammeVersion v WHERE v.programme_id = tp.programme_id
         AND (CASE WHEN $2::boolean THEN TRUE ELSE v.status = 'Published' END)
       ORDER BY (v.status = 'Draft') DESC, v.version_number DESC LIMIT 1
     ) pv ON TRUE
     WHERE ($2::boolean OR tp.archived_at IS NULL) AND
       (CASE WHEN $2::boolean THEN tp.admin_id = $1 ELSE tp.visibility = 'public' END)
     ORDER BY tp.updated_at DESC LIMIT 100`,
    [req.user!.userId, mine]
  );
  return res.json(result.rows);
});

router.post('/', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const data = details(req.body);
  if ('error' in data) return res.status(400).json({ error: data.error });
  if(data.coverUrl?.startsWith('/api/community/media/')){
    const owned=await query("SELECT 1 FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Programme'",[Number(data.coverUrl.split('/').at(-1)),req.user!.userId]);
    if(!owned.rowCount)return res.status(403).json({error:'Cover image does not belong to you.'});
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(
      `INSERT INTO TrainingProgramme (admin_id,name,description,cover_url,goal,difficulty,duration_weeks,days_per_week,session_minutes,environment,equipment,audience,prerequisites,restrictions,target_muscles,tags,visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING programme_id`,
      [req.user!.userId,data.name,data.description,data.coverUrl,data.goal,data.difficulty,data.durationWeeks,data.daysPerWeek,data.sessionMinutes,data.environment,data.equipment,data.audience,data.prerequisites,data.restrictions,data.targetMuscles,data.tags,data.visibility]
    );
    const programmeId = created.rows[0].programme_id;
    const version = await client.query('INSERT INTO ProgrammeVersion (programme_id,version_number) VALUES ($1,1) RETURNING version_id', [programmeId]);
    for (let week = 1; week <= data.durationWeeks; week++) {
      const added = await client.query('INSERT INTO ProgrammeWeek (version_id,week_number,title) VALUES ($1,$2,$3) RETURNING week_id', [version.rows[0].version_id,week,`Week ${week}`]);
      for (let day = 1; day <= 7; day++) await client.query('INSERT INTO ProgrammeDay (week_id,day_number,day_type,title) VALUES ($1,$2,$3,$4)', [added.rows[0].week_id,day,'Rest',`Day ${day}`]);
    }
    await client.query('COMMIT');
    return res.status(201).json(await loadProgramme(programmeId));
  } catch (error) {
    await client.query('ROLLBACK'); console.error('Create programme:', error);
    return res.status(500).json({ error: 'Could not create programme.' });
  } finally { client.release(); }
});

router.get('/enrollments', requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT pe.enrollment_id, pe.status, pe.started_at, pv.version_id, pv.version_number,
            tp.programme_id, tp.name, tp.duration_weeks,
            (SELECT COUNT(*)::int FROM WorkoutSession ws JOIN ProgrammeDay pd ON pd.day_id=ws.day_id JOIN ProgrammeWeek pw ON pw.week_id=pd.week_id WHERE pw.version_id=pv.version_id) AS total_sessions,
            (SELECT COUNT(*)::int FROM WorkoutSessionLog sl WHERE sl.enrollment_id=pe.enrollment_id AND sl.status='Completed') AS completed_sessions
     FROM ProgrammeEnrollment pe JOIN ProgrammeVersion pv ON pv.version_id=pe.version_id
     JOIN TrainingProgramme tp ON tp.programme_id=pv.programme_id
     WHERE pe.user_id=$1 ORDER BY pe.started_at DESC`, [req.user!.userId]
  );
  return res.json(result.rows);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  if (!Number.isInteger(programmeId)) return res.status(400).json({ error: 'Invalid programme ID.' });
  const requestedVersion = req.query.version ? Number(req.query.version) : undefined;
  let item = await loadProgramme(programmeId, requestedVersion);
  if (!item) return res.status(404).json({ error: 'Programme not found.' });
  const owner = req.user!.role === 'Admin' && item.admin_id === req.user!.userId;
  if (!owner && !requestedVersion && item.status === 'Draft') {
    const latest = await query(`SELECT version_id FROM ProgrammeVersion WHERE programme_id=$1 AND status='Published' ORDER BY version_number DESC LIMIT 1`,[programmeId]);
    item = latest.rowCount ? await loadProgramme(programmeId,latest.rows[0].version_id) : null;
  }
  if (!owner && item) {
    const enrolled = await query('SELECT 1 FROM ProgrammeEnrollment WHERE user_id=$1 AND version_id=$2',[req.user!.userId,item.version_id]);
    if (!enrolled.rowCount && (item.status !== 'Published' || item.archived_at || item.visibility === 'unlisted')) item = null;
  }
  if (!item) return res.status(404).json({ error: 'Programme not found.' });
  return res.json(item);
});

router.put('/:id', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  const data = details(req.body);
  if (!Number.isInteger(programmeId) || 'error' in data) return res.status(400).json({ error: 'Invalid programme details.' });
  if(data.coverUrl?.startsWith('/api/community/media/')){
    const owned=await query("SELECT 1 FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Programme'",[Number(data.coverUrl.split('/').at(-1)),req.user!.userId]);
    if(!owned.rowCount)return res.status(403).json({error:'Cover image does not belong to you.'});
  }
  const draft = await query(`SELECT pv.version_id,tp.duration_weeks FROM ProgrammeVersion pv JOIN TrainingProgramme tp ON tp.programme_id=pv.programme_id WHERE tp.programme_id=$1 AND tp.admin_id=$2 AND pv.status='Draft' ORDER BY pv.version_number DESC LIMIT 1`, [programmeId, req.user!.userId]);
  if (!draft.rowCount) return res.status(409).json({ error: 'Create a new draft version before editing a published programme.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE TrainingProgramme SET name=$1,description=$2,cover_url=$3,goal=$4,difficulty=$5,duration_weeks=$6,days_per_week=$7,session_minutes=$8,environment=$9,equipment=$10,audience=$11,prerequisites=$12,restrictions=$13,target_muscles=$14,tags=$15,visibility=$16,updated_at=CURRENT_TIMESTAMP WHERE programme_id=$17`,
      [data.name,data.description,data.coverUrl,data.goal,data.difficulty,data.durationWeeks,data.daysPerWeek,data.sessionMinutes,data.environment,data.equipment,data.audience,data.prerequisites,data.restrictions,data.targetMuscles,data.tags,data.visibility,programmeId]
    );
    await client.query('DELETE FROM ProgrammeWeek WHERE version_id=$1 AND week_number>$2', [draft.rows[0].version_id,data.durationWeeks]);
    for (let week = Number(draft.rows[0].duration_weeks) + 1; week <= data.durationWeeks; week++) {
      const added = await client.query('INSERT INTO ProgrammeWeek (version_id,week_number,title) VALUES ($1,$2,$3) RETURNING week_id', [draft.rows[0].version_id,week,`Week ${week}`]);
      for (let day = 1; day <= 7; day++) {
        await client.query('INSERT INTO ProgrammeDay (week_id,day_number,day_type,title) VALUES ($1,$2,$3,$4)', [added.rows[0].week_id,day,'Rest',`Day ${day}`]);
      }
    }
    await client.query('COMMIT');
    return res.json(await loadProgramme(programmeId, draft.rows[0].version_id));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update programme:', error);
    return res.status(500).json({ error: 'Could not update programme details.' });
  } finally {
    client.release();
  }
});

router.delete('/:id/draft', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  if (!Number.isInteger(programmeId) || programmeId < 1) return res.status(400).json({ error: 'Invalid programme ID.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const draft = await client.query(
      `SELECT pv.version_id,
              EXISTS (SELECT 1 FROM ProgrammeVersion published WHERE published.programme_id=tp.programme_id AND published.status='Published') AS has_published
       FROM TrainingProgramme tp JOIN ProgrammeVersion pv ON pv.programme_id=tp.programme_id
       WHERE tp.programme_id=$1 AND tp.admin_id=$2 AND pv.status='Draft'
       ORDER BY pv.version_number DESC LIMIT 1 FOR UPDATE OF pv`,
      [programmeId,req.user!.userId]
    );
    if (!draft.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Editable draft not found.' });
    }
    const programmeDeleted = !draft.rows[0].has_published;
    if (programmeDeleted) await client.query('DELETE FROM TrainingProgramme WHERE programme_id=$1 AND admin_id=$2',[programmeId,req.user!.userId]);
    else await client.query('DELETE FROM ProgrammeVersion WHERE version_id=$1',[draft.rows[0].version_id]);
    await client.query('COMMIT');
    return res.json({ message: 'Draft deleted.', programme_deleted: programmeDeleted });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete programme draft:', error);
    return res.status(500).json({ error: 'Could not delete draft.' });
  } finally {
    client.release();
  }
});

router.delete('/:id', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const programmeId=Number(req.params.id);
  if(!Number.isInteger(programmeId)||programmeId<1)return res.status(400).json({error:'Invalid programme ID.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const found=await client.query('SELECT programme_id FROM TrainingProgramme WHERE programme_id=$1 AND admin_id=$2 FOR UPDATE',[programmeId,req.user!.userId]);
    if(!found.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Programme not found.'});}
    await client.query(`DELETE FROM ProgrammeEnrollment WHERE version_id IN
      (SELECT version_id FROM ProgrammeVersion WHERE programme_id=$1)`,[programmeId]);
    await client.query('DELETE FROM TrainingProgramme WHERE programme_id=$1',[programmeId]);
    await client.query('COMMIT');
    return res.json({message:'Programme and its enrollments permanently deleted.'});
  }catch(error){await client.query('ROLLBACK');console.error('Delete programme:',error);return res.status(500).json({error:'Could not delete programme.'});}finally{client.release();}
});

router.put('/:id/structure', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  const found = await query(`SELECT tp.duration_weeks,tp.days_per_week,tp.session_minutes,pv.version_id FROM TrainingProgramme tp JOIN ProgrammeVersion pv ON pv.programme_id=tp.programme_id WHERE tp.programme_id=$1 AND tp.admin_id=$2 AND pv.status='Draft' ORDER BY pv.version_number DESC LIMIT 1`, [programmeId,req.user!.userId]);
  if (!found.rowCount) return res.status(404).json({ error: 'Editable draft not found.' });
  const exercises = await query('SELECT exercise_id FROM Exercise WHERE is_active=TRUE');
  const error = validateWeeks(req.body?.weeks, found.rows[0].duration_weeks, found.rows[0].days_per_week, new Set(exercises.rows.map((row) => row.exercise_id)));
  if (error) return res.status(400).json({ error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`SELECT status FROM ProgrammeVersion WHERE version_id=$1 FOR UPDATE`, [found.rows[0].version_id]);
    if (locked.rows[0]?.status !== 'Draft') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'This version is no longer editable.' }); }
    await client.query('DELETE FROM ProgrammeWeek WHERE version_id=$1', [found.rows[0].version_id]);
    await client.query(`WITH week_data AS (
        SELECT (week->>'week_number')::int AS week_number,
          COALESCE(week->>'title','Week '||(week->>'week_number')) AS title,
          COALESCE((week->>'is_deload')::boolean,FALSE) AS is_deload,
          COALESCE(week->>'progression_notes','') AS progression_notes,
          week->'days' AS days
        FROM jsonb_array_elements($2::jsonb) AS week
      ), inserted_weeks AS (
        INSERT INTO ProgrammeWeek(version_id,week_number,title,is_deload,progression_notes)
        SELECT $1,week_number,title,is_deload,progression_notes FROM week_data
        RETURNING week_id,week_number
      ), day_data AS (
        SELECT iw.week_id,(day->>'day_number')::int AS day_number,
          day->>'day_type' AS day_type,COALESCE(day->>'title','') AS title,
          COALESCE(day->>'notes','') AS notes,COALESCE(day->>'session_title','') AS session_title,
          COALESCE((day->>'estimated_minutes')::int,$3::int) AS estimated_minutes,
          COALESCE(day->'exercises','[]'::jsonb) AS exercises
        FROM week_data wd JOIN inserted_weeks iw USING(week_number)
        CROSS JOIN LATERAL jsonb_array_elements(wd.days) AS day
      ), inserted_days AS (
        INSERT INTO ProgrammeDay(week_id,day_number,day_type,title,notes)
        SELECT week_id,day_number,day_type,title,notes FROM day_data
        RETURNING day_id,week_id,day_number,day_type
      ), session_data AS (
        SELECT id.day_id,dd.session_title,dd.estimated_minutes,dd.exercises
        FROM inserted_days id JOIN day_data dd USING(week_id,day_number)
        WHERE id.day_type='Training'
      ), inserted_sessions AS (
        INSERT INTO WorkoutSession(day_id,title,estimated_minutes)
        SELECT day_id,session_title,estimated_minutes FROM session_data
        RETURNING session_id,day_id
      ), exercise_data AS (
        SELECT ins.session_id,exercise.value AS exercise,exercise.ordinality::int AS position
        FROM session_data sd JOIN inserted_sessions ins USING(day_id)
        CROSS JOIN LATERAL jsonb_array_elements(sd.exercises) WITH ORDINALITY AS exercise(value,ordinality)
      )
      INSERT INTO ExercisePrescription(session_id,exercise_id,position,sets,tracking_type,rep_min,rep_max,target_load_kg,duration_seconds,distance_meters,rpe,rest_seconds,tempo,is_warmup,notes)
      SELECT session_id,(exercise->>'exercise_id')::int,position,(exercise->>'sets')::int,exercise->>'tracking_type',
        CASE WHEN exercise->>'tracking_type'='reps' THEN (exercise->>'rep_min')::int END,
        CASE WHEN exercise->>'tracking_type'='reps' THEN (exercise->>'rep_max')::int END,
        NULLIF(exercise->>'target_load_kg','')::numeric,
        CASE WHEN exercise->>'tracking_type'='time' THEN (exercise->>'duration_seconds')::int END,
        CASE WHEN exercise->>'tracking_type'='distance' THEN (exercise->>'distance_meters')::int END,
        NULLIF(exercise->>'rpe','')::numeric,COALESCE((exercise->>'rest_seconds')::int,0),
        NULLIF(exercise->>'tempo',''),COALESCE((exercise->>'is_warmup')::boolean,FALSE),COALESCE(exercise->>'notes','')
      FROM exercise_data`,[found.rows[0].version_id,JSON.stringify(req.body.weeks),found.rows[0].session_minutes]);
    await client.query('UPDATE TrainingProgramme SET updated_at=CURRENT_TIMESTAMP WHERE programme_id=$1', [programmeId]);
    await client.query('COMMIT');
    return res.json(await loadProgramme(programmeId, found.rows[0].version_id));
  } catch (error) {
    await client.query('ROLLBACK'); console.error('Save programme structure:', error);
    return res.status(500).json({ error: 'Could not save programme structure.' });
  } finally { client.release(); }
});

router.post('/:id/publish', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  const item = await loadProgramme(programmeId);
  if (!item || item.admin_id !== req.user!.userId || item.status !== 'Draft' || item.archived_at) return res.status(404).json({ error: 'Editable, unarchived draft not found.' });
  const exercises = await query('SELECT exercise_id FROM Exercise WHERE is_active=TRUE');
  const error = validateWeeks(item.weeks, item.duration_weeks, item.days_per_week, new Set(exercises.rows.map((row) => row.exercise_id)), true);
  if (error) return res.status(400).json({ error });
  await query(`UPDATE ProgrammeVersion pv SET status='Published',published_at=CURRENT_TIMESTAMP,details_snapshot=to_jsonb(tp)
    FROM TrainingProgramme tp WHERE pv.version_id=$1 AND pv.programme_id=tp.programme_id AND pv.status='Draft'`, [item.version_id]);
  return res.json(await loadProgramme(programmeId, item.version_id));
});

router.patch('/:id/archive', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  if (!Number.isInteger(programmeId) || programmeId < 1 || typeof req.body?.archived !== 'boolean') {
    return res.status(400).json({ error: 'Provide a valid programme and archived state.' });
  }
  const result = await query(
    `UPDATE TrainingProgramme SET archived_at=CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE NULL END,
       updated_at=CURRENT_TIMESTAMP WHERE programme_id=$1 AND admin_id=$2 RETURNING programme_id`,
    [programmeId, req.user!.userId, req.body.archived]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Programme not found.' });
  return res.json(await loadProgramme(programmeId));
});

router.post('/:id/new-version', requireRole('Admin'), async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  const source = await query(`SELECT tp.admin_id,pv.version_id,pv.version_number FROM TrainingProgramme tp JOIN ProgrammeVersion pv ON pv.programme_id=tp.programme_id WHERE tp.programme_id=$1 ORDER BY pv.version_number DESC LIMIT 1`, [programmeId]);
  if (!source.rowCount || source.rows[0].admin_id !== req.user!.userId) return res.status(404).json({ error: 'Programme not found.' });
  const existing = await query(`SELECT 1 FROM ProgrammeVersion WHERE programme_id=$1 AND status='Draft'`, [programmeId]);
  if (existing.rowCount) return res.status(409).json({ error: 'Finish the existing draft first.' });
  const original = await loadProgramme(programmeId, source.rows[0].version_id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const next = await client.query('INSERT INTO ProgrammeVersion (programme_id,version_number) VALUES ($1,$2) RETURNING version_id', [programmeId,source.rows[0].version_number+1]);
    for (const week of original!.weeks) {
      const w = await client.query('INSERT INTO ProgrammeWeek (version_id,week_number,title,is_deload,progression_notes) VALUES ($1,$2,$3,$4,$5) RETURNING week_id', [next.rows[0].version_id,week.week_number,week.title,week.is_deload,week.progression_notes]);
      for (const day of week.days) {
        const d = await client.query('INSERT INTO ProgrammeDay (week_id,day_number,day_type,title,notes) VALUES ($1,$2,$3,$4,$5) RETURNING day_id', [w.rows[0].week_id,day.day_number,day.day_type,day.title,day.notes]);
        if (day.day_type==='Rest') continue;
        const s = await client.query('INSERT INTO WorkoutSession (day_id,title,estimated_minutes) VALUES ($1,$2,$3) RETURNING session_id', [d.rows[0].day_id,day.session_title,day.estimated_minutes]);
        for (const x of day.exercises) await client.query(`INSERT INTO ExercisePrescription (session_id,exercise_id,position,sets,tracking_type,rep_min,rep_max,target_load_kg,duration_seconds,distance_meters,rpe,rest_seconds,tempo,is_warmup,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [s.rows[0].session_id,x.exercise_id,x.position,x.sets,x.tracking_type,x.rep_min,x.rep_max,x.target_load_kg,x.duration_seconds,x.distance_meters,x.rpe,x.rest_seconds,x.tempo,x.is_warmup,x.notes]);
      }
    }
    await client.query('COMMIT');
    return res.status(201).json(await loadProgramme(programmeId,next.rows[0].version_id));
  } catch (error) { await client.query('ROLLBACK'); console.error('New version:',error); return res.status(500).json({ error: 'Could not create new version.' }); }
  finally { client.release(); }
});

router.post('/:id/enroll', requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const programmeId = Number(req.params.id);
  const item = await query(`SELECT pv.version_id FROM TrainingProgramme tp JOIN ProgrammeVersion pv ON pv.programme_id=tp.programme_id WHERE tp.programme_id=$1 AND tp.archived_at IS NULL AND pv.status='Published' ORDER BY pv.version_number DESC LIMIT 1`, [programmeId]);
  if (!item.rowCount) return res.status(404).json({ error: 'Published programme not found.' });
  const result = await query(`INSERT INTO ProgrammeEnrollment (user_id,version_id) VALUES ($1,$2) ON CONFLICT (user_id,version_id) DO UPDATE SET status='Active' RETURNING *`, [req.user!.userId,item.rows[0].version_id]);
  return res.status(201).json(result.rows[0]);
});

router.patch('/enrollments/:id', requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const status = String(req.body?.status || '');
  if (!['Active','Paused'].includes(status)) return res.status(400).json({ error: 'Status must be Active or Paused.' });
  const result = await query(`UPDATE ProgrammeEnrollment SET status=$1 WHERE enrollment_id=$2 AND user_id=$3 AND status IN ('Active','Paused') RETURNING *`, [status,Number(req.params.id),req.user!.userId]);
  if (!result.rowCount) return res.status(404).json({ error: 'Enrollment not found.' });
  return res.json(result.rows[0]);
});

router.post('/enrollments/:id/sessions/:sessionId', requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const result = await query(
    `INSERT INTO WorkoutSessionLog (enrollment_id,session_id)
     SELECT pe.enrollment_id,ws.session_id FROM ProgrammeEnrollment pe
     JOIN ProgrammeVersion pv ON pv.version_id=pe.version_id
     JOIN ProgrammeWeek pw ON pw.version_id=pv.version_id
     JOIN ProgrammeDay pd ON pd.week_id=pw.week_id
     JOIN WorkoutSession ws ON ws.day_id=pd.day_id
     WHERE pe.enrollment_id=$1 AND pe.user_id=$2 AND pe.status='Active' AND ws.session_id=$3
     ON CONFLICT (enrollment_id,session_id) DO UPDATE SET enrollment_id=EXCLUDED.enrollment_id RETURNING *`,
    [Number(req.params.id),req.user!.userId,Number(req.params.sessionId)]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Active enrollment or session not found.' });
  return res.json(result.rows[0]);
});

router.get('/enrollments/:id/logs', requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const result = await query(`SELECT sl.*, COALESCE(json_agg(json_build_object('prescription_id',st.prescription_id,'set_number',st.set_number,'actual_reps',st.actual_reps,'actual_load_kg',st.actual_load_kg,'duration_seconds',st.duration_seconds,'distance_meters',st.distance_meters,'rpe',st.rpe,'completed',st.completed)) FILTER (WHERE st.set_log_id IS NOT NULL),'[]'::json) AS sets FROM WorkoutSessionLog sl JOIN ProgrammeEnrollment pe ON pe.enrollment_id=sl.enrollment_id LEFT JOIN WorkoutSetLog st ON st.log_id=sl.log_id WHERE pe.enrollment_id=$1 AND pe.user_id=$2 GROUP BY sl.log_id ORDER BY sl.started_at DESC`, [Number(req.params.id),req.user!.userId]);
  return res.json(result.rows);
});

router.put('/logs/:id/sets/:prescriptionId/:setNumber', requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const logId=Number(req.params.id), prescriptionId=Number(req.params.prescriptionId), setNumber=Number(req.params.setNumber);
  if (![logId,prescriptionId,setNumber].every((value)=>Number.isInteger(value)&&value>0)) return res.status(400).json({ error: 'Invalid set.' });
  const values=[req.body?.actual_reps,req.body?.actual_load_kg,req.body?.duration_seconds,req.body?.distance_meters,req.body?.rpe].map((value)=>value===''||value==null?null:Number(value));
  if (values.some((value)=>value!==null&&(!Number.isFinite(value)||value<0))) return res.status(400).json({ error: 'Set values must be non-negative numbers.' });
  if (values[4] !== null && values[4] > 10) return res.status(400).json({ error: 'RPE cannot exceed 10.' });
  if (req.body?.completed === true) {
    const target = await query(`SELECT ep.tracking_type FROM WorkoutSessionLog sl
      JOIN ProgrammeEnrollment pe ON pe.enrollment_id=sl.enrollment_id
      JOIN ExercisePrescription ep ON ep.session_id=sl.session_id
      WHERE sl.log_id=$1 AND pe.user_id=$2 AND ep.prescription_id=$3`,[logId,req.user!.userId,prescriptionId]);
    if (!target.rowCount) return res.status(404).json({ error: 'Prescribed set not found.' });
    const trackingType = target.rows[0].tracking_type;
    const index = trackingType === 'reps' ? 0 : trackingType === 'time' ? 2 : 3;
    const performanceIsValid = values[index] !== null && (trackingType === 'reps' ? values[index]! >= 0 : values[index]! > 0);
    if (!performanceIsValid) return res.status(400).json({ error: 'Actual performance is required to complete a set.' });
  }
  const result=await query(
    `INSERT INTO WorkoutSetLog (log_id,prescription_id,set_number,actual_reps,actual_load_kg,duration_seconds,distance_meters,rpe,completed)
     SELECT sl.log_id,ep.prescription_id,$3,$4,$5,$6,$7,$8,$9
     FROM WorkoutSessionLog sl JOIN ProgrammeEnrollment pe ON pe.enrollment_id=sl.enrollment_id
     JOIN ExercisePrescription ep ON ep.session_id=sl.session_id
     WHERE sl.log_id=$1 AND pe.user_id=$2 AND sl.status='InProgress' AND pe.status='Active'
       AND ep.prescription_id=$10 AND $3<=ep.sets
     ON CONFLICT (log_id,prescription_id,set_number) DO UPDATE SET actual_reps=$4,actual_load_kg=$5,duration_seconds=$6,distance_meters=$7,rpe=$8,completed=$9,updated_at=CURRENT_TIMESTAMP RETURNING *`,
    [logId,req.user!.userId,setNumber,...values,req.body?.completed===true,prescriptionId]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Editable set not found.' });
  return res.json(result.rows[0]);
});

router.post('/logs/:id/finish', requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const logId=Number(req.params.id);
  const pending=await query(
    `SELECT COUNT(*)::int AS pending FROM WorkoutSessionLog sl JOIN ProgrammeEnrollment pe ON pe.enrollment_id=sl.enrollment_id
     JOIN ExercisePrescription ep ON ep.session_id=sl.session_id
     CROSS JOIN LATERAL generate_series(1,ep.sets) n(set_number)
     LEFT JOIN WorkoutSetLog st ON st.log_id=sl.log_id AND st.prescription_id=ep.prescription_id AND st.set_number=n.set_number AND st.completed=TRUE
     WHERE sl.log_id=$1 AND pe.user_id=$2 AND sl.status='InProgress' AND st.set_log_id IS NULL`, [logId,req.user!.userId]
  );
  if (pending.rows[0].pending>0) return res.status(400).json({ error: `${pending.rows[0].pending} prescribed sets are incomplete.` });
  const result=await query(`UPDATE WorkoutSessionLog sl SET status='Completed',completed_at=CURRENT_TIMESTAMP,notes=$3 FROM ProgrammeEnrollment pe WHERE sl.log_id=$1 AND sl.enrollment_id=pe.enrollment_id AND pe.user_id=$2 AND sl.status='InProgress' RETURNING sl.*`, [logId,req.user!.userId,String(req.body?.notes||'').slice(0,2000)]);
  if (!result.rowCount) return res.status(404).json({ error: 'Workout not found or already completed.' });
  return res.json(result.rows[0]);
});

export default router;
