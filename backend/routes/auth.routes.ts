import { Router, Request, Response } from 'express';
import { registerMemberService, loginUserService } from '../services/auth.service';

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
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Apply defaults to satisfy schema NOT NULL and CHECK constraints
    const newMember = await registerMemberService({
      name,
      email,
      password,
      gender: gender === 'Female' ? 'Female' : 'Male',
      birth_date: birth_date || '2000-01-01',
      height_cm: Number(height_cm) > 0 ? Number(height_cm) : 175,
      weight_kg: Number(weight_kg) > 0 ? Number(weight_kg) : 70,
      fitness_level: fitness_level || 'Beginner',
      primary_goal: primary_goal || 'General Fitness',
      daily_step_goal: Number(daily_step_goal) || 10000,
    });

    return res.status(201).json(newMember);
  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
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

export default router;