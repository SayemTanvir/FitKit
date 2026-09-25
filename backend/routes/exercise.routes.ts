import { Router, Response } from 'express';
import { getExercises } from '../controllers/exercise.controller';
import { AuthRequest, requireRole, verifyToken } from '../middleware/auth.middleware';
import pool, { query } from '../db';

const router = Router();

router.get('/', verifyToken, getExercises);

function validate(body: any) {
  const name = String(body?.name || '').trim();
  const category = String(body?.category || '');
  const tracking = String(body?.tracking_type || 'reps');
  const difficulty = String(body?.difficulty_level || 'Beginner');
  const media = body?.media_url ? String(body.media_url) : null;
  if (!name || name.length > 100 || !['Strength','Cardio','Flexibility'].includes(category) ||
      !['reps','time','distance'].includes(tracking) || !['Beginner','Intermediate','Advanced'].includes(difficulty) ||
      !String(body?.target_muscle_group || '').trim() ||
      (media && (!/^https:\/\//i.test(media) && !/^\/api\/community\/media\/\d+$/.test(media) || media.length > 1000))) {
    return { error: 'Provide a unique name, category, muscle group, difficulty, tracking type and valid media URL if supplied.' };
  }
  return { name, category, tracking, difficulty, media,
    muscle: String(body.target_muscle_group).trim(), description: String(body?.description || '').slice(0,4000),
    movement: String(body?.movement_pattern || '').slice(0,80),
    instructions: String(body?.instructions || '').slice(0,4000),
    optionalEquipment: String(body?.optional_equipment || '').slice(0,500),
    secondaryMuscles: Array.isArray(body?.secondary_muscles) ? body.secondary_muscles.map(String).slice(0,12) : [],
    calorieFactor: Number(body?.calorie_factor || 0.3),
    equipment: String(body?.equipment_needed || '').slice(0,50),
  };
}

async function saveExercise(req: AuthRequest, res: Response, id?: number) {
  if (id !== undefined && (!Number.isInteger(id) || id < 1)) return res.status(400).json({ error: 'Invalid exercise ID.' });
  const data = validate(req.body);
  if ('error' in data) return res.status(400).json({ error: data.error });
  if(data.media?.startsWith('/api/community/media/')){
    const owned=await query("SELECT 1 FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Exercise'",[Number(data.media.split('/').at(-1)),req.user!.userId]);
    if(!owned.rowCount)return res.status(403).json({error:'Exercise image does not belong to you.'});
  }
  if (!Number.isFinite(data.calorieFactor) || data.calorieFactor <= 0) return res.status(400).json({ error: 'Calorie factor must be positive.' });
  const duplicate = await query('SELECT exercise_id FROM Exercise WHERE LOWER(name)=LOWER($1) AND exercise_id<>COALESCE($2,0)', [data.name,id||0]);
  if (duplicate.rowCount) return res.status(409).json({ error: 'An exercise with this name already exists.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = id
      ? await client.query(`UPDATE Exercise SET name=$1,target_muscle_group=$2,calorie_factor=$3,difficulty_level=$4,instructions=$5,description=$6,movement_pattern=$7,secondary_muscles=$8,optional_equipment=$9,tracking_type=$10,media_url=$11 WHERE exercise_id=$12 RETURNING exercise_id`, [data.name,data.muscle,data.calorieFactor,data.difficulty,data.instructions,data.description,data.movement,data.secondaryMuscles,data.optionalEquipment,data.tracking,data.media,id])
      : await client.query(`INSERT INTO Exercise (name,target_muscle_group,calorie_factor,difficulty_level,instructions,description,movement_pattern,secondary_muscles,optional_equipment,tracking_type,media_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING exercise_id`, [data.name,data.muscle,data.calorieFactor,data.difficulty,data.instructions,data.description,data.movement,data.secondaryMuscles,data.optionalEquipment,data.tracking,data.media]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Exercise not found.' }); }
    const exerciseId = result.rows[0].exercise_id;
    if (id) for (const table of ['StrengthExercise','CardioExercise','FlexibilityExercise']) await client.query(`DELETE FROM ${table} WHERE exercise_id=$1`,[exerciseId]);
    if (data.category==='Strength') await client.query('INSERT INTO StrengthExercise (exercise_id,equipment_needed) VALUES ($1,$2)',[exerciseId,data.equipment]);
    if (data.category==='Cardio') await client.query('INSERT INTO CardioExercise (exercise_id,mets_score) VALUES ($1,8)',[exerciseId]);
    if (data.category==='Flexibility') await client.query('INSERT INTO FlexibilityExercise (exercise_id,hold_type) VALUES ($1,$2)',[exerciseId,'Static']);
    await client.query('COMMIT');
    return res.status(id?200:201).json({ exercise_id: exerciseId });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code==='23505') return res.status(409).json({ error: 'Exercise name already exists.' });
    console.error('Save exercise:',error); return res.status(500).json({ error: 'Could not save exercise.' });
  } finally { client.release(); }
}

router.post('/', verifyToken, requireRole('Admin'), (req: AuthRequest,res: Response)=>saveExercise(req,res));
router.put('/:id', verifyToken, requireRole('Admin'), (req: AuthRequest,res: Response)=>saveExercise(req,res,Number(req.params.id)));
router.delete('/:id', verifyToken, requireRole('Admin'), async (req: AuthRequest,res: Response)=>{
  const exerciseId=Number(req.params.id);
  if(!Number.isInteger(exerciseId)||exerciseId<1)return res.status(400).json({error:'Invalid exercise ID.'});
  const dependencies=await query(`SELECT e.media_url,
    (SELECT COUNT(*)::int FROM WorkoutPlanExercise WHERE exercise_id=e.exercise_id) AS plans,
    (SELECT COUNT(*)::int FROM WorkoutEntry WHERE exercise_id=e.exercise_id) AS logs,
    (SELECT COUNT(*)::int FROM ExercisePrescription WHERE exercise_id=e.exercise_id) AS programmes
    FROM Exercise e WHERE e.exercise_id=$1`,[exerciseId]);
  if(!dependencies.rowCount)return res.status(404).json({error:'Exercise not found.'});
  const usage=dependencies.rows[0];
  if(usage.plans||usage.logs||usage.programmes)return res.status(409).json({error:'This exercise is used by a plan, programme, or workout history and cannot be permanently deleted.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('DELETE FROM Exercise WHERE exercise_id=$1',[exerciseId]);
    const mediaId=/^\/api\/community\/media\/(\d+)$/.exec(String(usage.media_url||''))?.[1];
    if(mediaId)await client.query("DELETE FROM MediaAsset WHERE media_id=$1 AND purpose='Exercise'",[Number(mediaId)]);
    await client.query('COMMIT');
    return res.json({message:'Exercise permanently deleted.'});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
});

export default router;
