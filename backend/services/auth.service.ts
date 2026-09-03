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

export async function loginUserService(email: string, plainPass: string) {
  // Resolve role directly from database inheritance hierarchy
  const userRoleQuery = `
    SELECT 
      u.user_id, 
      u.name, 
      u.email, 
      u.password_hash,
      CASE 
        WHEN a.user_id IS NOT NULL THEN 'Admin'
        WHEN m.user_id IS NOT NULL THEN 'Member'
        ELSE 'Unassigned'
      END AS role
    FROM users u
    LEFT JOIN Admin a ON u.user_id = a.user_id
    LEFT JOIN Member m ON u.user_id = m.user_id
    WHERE u.email = $1;
  `;

  const { rows } = await query(userRoleQuery, [email]);
  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(plainPass, user.password_hash);
  if (!isMatch) {
    return null;
  }

  const token = jwt.sign(
    { userId: user.user_id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' }
  );

  return {
    user: {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
}