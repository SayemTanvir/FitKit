import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool, { query } from '../db';

function jwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('replace_with_')) throw new Error('Set JWT_SECRET in backend/.env.');
  return process.env.JWT_SECRET;
}

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

interface UpdateProfileDTO {
  name: string;
  gender: 'Male' | 'Female';
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  fitness_level: 'Beginner' | 'Intermediate' | 'Advanced';
  primary_goal: string;
  daily_step_goal?: number;
  daily_calorie_goal?: number;
  daily_hydration_goal?: number;
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
    await client.query('INSERT INTO MemberProfile (user_id,username) VALUES ($1,$2)', [newUser.user_id, `member${newUser.user_id}`]);

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: newUser.user_id, role: 'Member' },
      jwtSecret(),
      { expiresIn: '1d' }
    );

    return {
      user: {
        ...newUser,
        id: newUser.user_id,
        role: 'Member',
        status: 'Active Member',
      },
      token,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function loginUserService(email: string, password: string) {
  const result = await query(
    `SELECT
       u.user_id,
       u.name,
       COALESCE(mp.photo_url,u.profile_photo_url) AS photo_url,
       u.email,
       u.password_hash,
       CASE
         WHEN a.user_id IS NOT NULL THEN 'Admin'
         WHEN m.user_id IS NOT NULL THEN 'Member'
       END AS role,
       a.admin_role,
       (
         SELECT wp.title
         FROM MemberWorkoutPlan mwp
         JOIN WorkoutPlan wp ON wp.plan_id = mwp.plan_id
         WHERE mwp.user_id = u.user_id AND mwp.status = 'Active'
         ORDER BY mwp.start_date DESC
         LIMIT 1
       ) AS active_plan
     FROM users u
     LEFT JOIN Admin a ON a.user_id = u.user_id
     LEFT JOIN Member m ON m.user_id = u.user_id
     LEFT JOIN MemberProfile mp ON mp.user_id = u.user_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  if (!user.role) {
    return null;
  }

  // 2. Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return null;
  }

  const token = jwt.sign(
    { userId: user.user_id, role: user.role },
    jwtSecret(),
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.user_id,
      name: user.name,
      photo_url: user.photo_url,
      email: user.email,
      role: user.role,
      status: user.role === 'Admin' ? user.admin_role : 'Active Member',
      active_plan: user.active_plan,
    },
  };
}

export async function getUserProfileService(userId: number) {
  const profileResult = await query(
    `SELECT
       u.user_id AS id,
       u.name,
       COALESCE(mp.photo_url,u.profile_photo_url) AS photo_url,
       u.email,
       u.gender,
       TO_CHAR(u.birth_date, 'YYYY-MM-DD') AS birth_date,
       u.height_cm,
       u.weight_kg,
       u.fitness_level,
       u.primary_goal,
       u.created_at,
       m.daily_step_goal,
       m.daily_calorie_goal,
       m.daily_hydration_goal,
       a.admin_role,
       CASE WHEN a.user_id IS NOT NULL THEN 'Admin' ELSE 'Member' END AS role,
       COALESCE(rank_info.rank_name, 'Bronze') AS membership_rank,
       EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.created_at::DATE))::int AS membership_years,
       (
         EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.created_at::DATE)) * 12 +
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, u.created_at::DATE))
       )::int AS membership_months,
       (
         SELECT wp.title
         FROM MemberWorkoutPlan mwp
         JOIN WorkoutPlan wp ON wp.plan_id = mwp.plan_id
         WHERE mwp.user_id = u.user_id AND mwp.status = 'Active'
         ORDER BY mwp.start_date DESC
         LIMIT 1
       ) AS active_plan
     FROM users u
     LEFT JOIN Admin a ON a.user_id = u.user_id
     LEFT JOIN Member m ON m.user_id = u.user_id
     LEFT JOIN MemberProfile mp ON mp.user_id = u.user_id
     LEFT JOIN LATERAL (
       SELECT mr.rank_name
       FROM MembershipRank mr
       WHERE mr.min_years <= EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.created_at::DATE))
       ORDER BY mr.min_years DESC
       LIMIT 1
     ) rank_info ON TRUE
     WHERE u.user_id = $1`,
    [userId]
  );

  if (profileResult.rows.length === 0) {
    return null;
  }

  const achievementsResult = await query(
    `SELECT
       a.achievement_id AS id,
       a.badge_name AS label,
       a.criteria_description,
       ma.earned_date
     FROM Achievement a
     LEFT JOIN MemberAchievement ma
       ON ma.achievement_id = a.achievement_id AND ma.user_id = $1
     ORDER BY a.achievement_id`,
    [userId]
  );

  return {
    user: profileResult.rows[0],
    achievements: achievementsResult.rows,
  };
}

export async function updateUserProfileService(
  userId: number,
  role: 'Admin' | 'Member',
  data: UpdateProfileDTO
) {
  await query(
    `UPDATE users
     SET name = $1,
         gender = $2,
         birth_date = $3,
         height_cm = $4,
         weight_kg = $5,
         fitness_level = $6,
         primary_goal = $7
     WHERE user_id = $8`,
    [
      data.name,
      data.gender,
      data.birth_date,
      data.height_cm,
      data.weight_kg,
      data.fitness_level,
      data.primary_goal,
      userId,
    ]
  );

  if (role === 'Member') {
    await query(
      `UPDATE Member
       SET daily_step_goal = $1,
           daily_calorie_goal = $2,
           daily_hydration_goal = $3
       WHERE user_id = $4`,
      [
        data.daily_step_goal,
        data.daily_calorie_goal,
        data.daily_hydration_goal,
        userId,
      ]
    );
  }

  return getUserProfileService(userId);
}
