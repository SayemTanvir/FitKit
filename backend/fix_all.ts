import bcrypt from 'bcrypt';
import { query } from './db';

async function masterFix() {
  try {
    console.log('--- Syncing Users, Roles & Workout Plans ---');

    // 1. Ensure profile & role columns exist on users
    await query(`
      ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active Member',
        ADD COLUMN IF NOT EXISTS active_plan VARCHAR(100) DEFAULT 'Full Body Hypertrophy';
    `);

    // 2. Refresh Admin and Member roles
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('Password@123', saltRounds);
    const memberHash = await bcrypt.hash('Password@123', saltRounds);

    await query(`
      INSERT INTO users (name, email, password_hash, role, status, active_plan)
      VALUES 
        ('FitKit Admin', 'admin@fitkit.com', '${adminHash}', 'Admin', 'Head Curator', 'Full Body Hypertrophy'),
        ('Regular Member', 'member@fitkit.com', '${memberHash}', 'Member', 'Active Member', 'Full Body Hypertrophy')
      ON CONFLICT (email) DO UPDATE 
      SET 
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        active_plan = EXCLUDED.active_plan,
        password_hash = EXCLUDED.password_hash;
    `);

    // 3. Create workout_plan table if not exists & seed initial plans
    await query(`
      CREATE TABLE IF NOT EXISTS workout_plan (
        plan_id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        target_level VARCHAR(50) DEFAULT 'Intermediate',
        goal VARCHAR(100) DEFAULT 'Hypertrophy',
        duration_weeks INT DEFAULT 4,
        curated_by VARCHAR(100) DEFAULT 'FitKit Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      INSERT INTO workout_plan (title, target_level, goal, duration_weeks, curated_by)
      VALUES 
        ('Full Body Hypertrophy', 'Intermediate', 'Muscle Gain', 4, 'FitKit Admin'),
        ('Cardio Endurance Blast', 'Beginner', 'Fat Loss', 6, 'FitKit Admin')
      ON CONFLICT DO NOTHING;
    `);

    console.log('All user roles, statuses, and workout plans successfully updated!');
    process.exit(0);
  } catch (err) {
    console.error('Master fix error:', err);
    process.exit(1);
  }
}

masterFix();