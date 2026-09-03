import { Request, Response } from 'express';
import { registerMemberService, loginUserService } from '../services/auth.service';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, gender, birth_date, height_cm, weight_kg, fitness_level } = req.body;
    
    if (!name || !email || !password || !birth_date || !height_cm || !weight_kg) {
      return res.status(400).json({ error: 'Missing required profile fields.' });
    }

    const result = await registerMemberService(req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    if (error.message && error.message.includes('FitKit users must be older than 15 years')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const authData = await loginUserService(email, password);
    if (!authData) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    return res.status(200).json(authData);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function logout(_req: Request, res: Response) {
  return res.status(200).json({ message: 'Logged out successfully.' });
}