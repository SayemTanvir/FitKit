import { Router, Request, Response } from 'express';
import {
  getUserProfileService,
  loginUserService,
  registerMemberService,
  updateUserProfileService,
} from '../services/auth.service';
import { AuthRequest, verifyToken } from '../middleware/auth.middleware';

const router = Router();

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
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(String(birth_date || ''));
    if (!String(name || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '')) || String(password || '').length < 8) {
      return res.status(400).json({ error: 'Provide a name, valid email, and password of at least 8 characters.' });
    }
    if (!validDate || !validGender || !validLevel || !(Number(height_cm) > 0) || !(Number(weight_kg) > 0)) {
      return res.status(400).json({ error: 'Provide a valid birth date, gender, fitness level, height, and weight.' });
    }

    const newMember = await registerMemberService({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
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
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await loginUserService(email, password);
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

router.get('/profile/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }
  try {
    const profile = await getUserProfileService(userId);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const { user, achievements } = profile;
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
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

  if (!String(name || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(birth_date || '')) || !validGender || !validLevel || !positiveNumbers || !validMemberGoals) {
    return res.status(400).json({ error: 'Invalid profile or goal values.' });
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
