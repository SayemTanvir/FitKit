import { Router, Request, Response } from 'express';
import {
  getUserProfileService,
  loginUserService,
  registerMemberService,
  updateUserProfileService,
} from '../services/auth.service';
import { AuthRequest, verifyToken } from '../middleware/auth.middleware';
import { query } from '../db';

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizedEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isValidBirthDate(value: unknown) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return false;
  const today = new Date();
  const latest = new Date(Date.UTC(today.getFullYear() - 16, today.getMonth(), today.getDate()));
  return date <= latest;
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      email, 
      password, 
      gender, 
      birth_date, 
      height_cm, 
      weight_kg, 
      fitness_level, 
      primary_goal,
      daily_step_goal 
    } = req.body || {};

    const validLevel = ['Beginner', 'Intermediate', 'Advanced'].includes(fitness_level);
    const validGender = gender === 'Male' || gender === 'Female';
    const validDate = isValidBirthDate(birth_date);
    const cleanEmail = normalizedEmail(email);
    if (!String(name || '').trim() || !EMAIL_PATTERN.test(cleanEmail) || String(password || '').length < 8) {
      return res.status(400).json({ error: 'Provide a name, valid email, and password of at least 8 characters.' });
    }
    if (!validDate || !validGender || !validLevel || !(Number(height_cm) > 0) || !(Number(weight_kg) > 0)) {
      return res.status(400).json({ error: 'Provide a valid birth date (age 16+), gender, fitness level, height, and weight.' });
    }

    const newMember = await registerMemberService({
      name: String(name).trim(),
      email: cleanEmail,
      password,
      gender,
      birth_date,
      height_cm: Number(height_cm),
      weight_kg: Number(weight_kg),
      fitness_level,
      primary_goal: primary_goal || 'General Fitness',
      daily_step_goal: Number(daily_step_goal) || 10000,
    });

    return res.status(201).json(newMember);
  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    if (err.message?.includes('older than 15 years')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = normalizedEmail(email);
    if (!EMAIL_PATTERN.test(cleanEmail) || !password) {
      return res.status(400).json({ error: 'Enter an email in the name@domain.com format and a password.' });
    }
    const result = await loginUserService(cleanEmail, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getUserProfileService(req.user!.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    return res.status(200).json(profile);
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
});

async function savePhoto(req:AuthRequest,res:Response,remove=false){
  const photo=remove?null:req.body?.photo_url?String(req.body.photo_url):null;
  const match=/^\/api\/community\/media\/(\d+)$/.exec(photo||'');
  if(photo&&(!match&&!/^https:\/\//i.test(photo)||photo.length>1000))return res.status(400).json({error:'Choose an uploaded image or HTTPS URL.'});
  if(match){
    const owned=await query("SELECT 1 FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Avatar'",[Number(match[1]),req.user!.userId]);
    if(!owned.rowCount)return res.status(403).json({error:'Profile image does not belong to you.'});
  }
  const previous=await query('SELECT profile_photo_url FROM users WHERE user_id=$1',[req.user!.userId]);
  await query('UPDATE users SET profile_photo_url=$1 WHERE user_id=$2',[photo,req.user!.userId]);
  await query('UPDATE MemberProfile SET photo_url=$1,updated_at=CURRENT_TIMESTAMP WHERE user_id=$2',[photo,req.user!.userId]);
  const old=/^\/api\/community\/media\/(\d+)$/.exec(previous.rows[0]?.profile_photo_url||'');
  if(old&&previous.rows[0].profile_photo_url!==photo)await query("DELETE FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Avatar'",[Number(old[1]),req.user!.userId]);
  return res.json({photo_url:photo});
}
router.put('/me/photo',verifyToken,(req:AuthRequest,res:Response)=>savePhoto(req,res));
router.delete('/me/photo',verifyToken,(req:AuthRequest,res:Response)=>savePhoto(req,res,true));

router.get('/profile/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }
  try {
    if (userId !== req.user!.userId) {
      const access = await query(`SELECT 1 FROM MemberProfile mp WHERE mp.user_id=$2
        AND NOT EXISTS (SELECT 1 FROM UserBlock b WHERE (b.blocker_id=$1 AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=$1))
        AND (mp.is_private=FALSE OR EXISTS (SELECT 1 FROM FollowRelationship f WHERE f.follower_id=$1 AND f.followed_id=$2 AND f.status='Accepted')
        OR EXISTS (SELECT 1 FROM FriendRequest f WHERE ((f.requester_id=$1 AND f.recipient_id=$2) OR (f.recipient_id=$1 AND f.requester_id=$2)) AND f.status='Accepted'))`,[req.user!.userId,userId]);
      if (!access.rowCount) return res.status(404).json({ error: 'Profile not found or private.' });
    }
    const profile = await getUserProfileService(userId);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const { user, achievements } = profile;
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        photo_url: user.photo_url,
        role: user.role,
        fitness_level: user.fitness_level,
        primary_goal: user.primary_goal,
        membership_rank: user.membership_rank,
        membership_months: user.membership_months,
      },
      achievements,
    });
  } catch (err) {
    console.error('Public profile error:', err);
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
});

router.put('/me', verifyToken, async (req: AuthRequest, res: Response) => {
  const {
    name,
    gender,
    birth_date,
    height_cm,
    weight_kg,
    fitness_level,
    primary_goal,
    daily_step_goal,
    daily_calorie_goal,
    daily_hydration_goal,
  } = req.body || {};

  const validGender = gender === 'Male' || gender === 'Female';
  const validLevel = ['Beginner', 'Intermediate', 'Advanced'].includes(fitness_level);
  const positiveNumbers = [height_cm, weight_kg].every((value) => Number(value) > 0);
  const validMemberGoals =
    req.user!.role !== 'Member' ||
    [daily_step_goal, daily_calorie_goal, daily_hydration_goal].every(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0
    );

  if (!String(name || '').trim() || !isValidBirthDate(birth_date) || !validGender || !validLevel || !positiveNumbers || !validMemberGoals) {
    return res.status(400).json({ error: 'Invalid profile, birth date (age 16+), or goal values.' });
  }

  try {
    const profile = await updateUserProfileService(req.user!.userId, req.user!.role, {
      name: String(name).trim(),
      gender,
      birth_date,
      height_cm: Number(height_cm),
      weight_kg: Number(weight_kg),
      fitness_level,
      primary_goal: String(primary_goal || 'General Fitness'),
      daily_step_goal: Number(daily_step_goal),
      daily_calorie_goal: Number(daily_calorie_goal),
      daily_hydration_goal: Number(daily_hydration_goal),
    });
    return res.status(200).json(profile);
  } catch (err: any) {
    if (err.message?.includes('older than 15 years')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
