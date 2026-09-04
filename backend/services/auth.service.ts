import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool, { query } from '../db';

interface RegisterMemberDTO {
  name: string;
  email: string;
  password: string;
  gender: 'Male' | 'Female';
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  fitness_level: 'Beginner' | 'Intermediate' | 'Advanced';
  primary_goal?: string;
  daily_step_goal?: number;
}

export async function registerMemberService(data: RegisterMemberDTO) {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(data.password, saltRounds);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into superclass users table
    const userInsertQuery = `
      INSERT INTO users (
        name, email, password_hash, gender, birth_date,
        height_cm, weight_kg, fitness_level, primary_goal
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING user_id, name, email;
    `;
    const userRes = await client.query(userInsertQuery, [
      data.name,
      data.email,
      passwordHash,
      data.gender,
      data.birth_date,
      data.height_cm,
      data.weight_kg,
      data.fitness_level,
      data.primary_goal || 'General Fitness',
    ]);

    const newUser = userRes.rows[0];

    // 2. Insert into Member subclass table
    const memberInsertQuery = `
      INSERT INTO Member (user_id, daily_step_goal)
      VALUES ($1, $2);
    `;
    await client.query(memberInsertQuery, [
      newUser.user_id,
      data.daily_step_goal || 10000,
    ]);

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: newUser.user_id, role: 'Member' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    return { user: { ...newUser, role: 'Member' }, token };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function loginUserService(email: string, password: string) {
  // 1. Fetch user including role, status, and active_plan
  const result = await query(
    `SELECT user_id, name, email, password_hash, role, status, active_plan 
     FROM users 
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // 2. Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return null;
  }

  // 3. Sign Token
  const token = jwt.sign(
    { id: user.user_id, role: user.role },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: '24h' }
  );

  // 4. Return full object expected by frontend Navbar & localStorage
  return {
    token,
    user: {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role || 'Admin',
      status: user.status || (user.role === 'Admin' ? 'Admin' : 'Active Member'),
      active_plan: user.active_plan || 'Member'
    }
  };
}