import { query } from './db';

async function seedPlans() {
  try {
    console.log('Seeding workout plans catalog safely...');

    // 1. Ensure target tables exist
    await query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        plan_id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        target_level VARCHAR(50) DEFAULT 'Intermediate',
        goal VARCHAR(100) DEFAULT 'Hypertrophy',
        duration_weeks INT DEFAULT 4,
        curated_by VARCHAR(100) DEFAULT 'FitKit Admin'
      );

      CREATE TABLE IF NOT EXISTS workout_plan (
        plan_id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        target_level VARCHAR(50) DEFAULT 'Intermediate',
        goal VARCHAR(100) DEFAULT 'Hypertrophy',
        duration_weeks INT DEFAULT 4,
        curated_by VARCHAR(100) DEFAULT 'FitKit Admin'
      );
    `);

    // 2. Seed records cleanly without relying on UNIQUE indexes
    await query(`
      INSERT INTO workout_plans (title, target_level, goal, duration_weeks, curated_by)
      SELECT 'Full Body Hypertrophy', 'Intermediate', 'Muscle Gain', 4, 'FitKit Admin'
      WHERE NOT EXISTS (SELECT 1 FROM workout_plans WHERE title = 'Full Body Hypertrophy');

      INSERT INTO workout_plans (title, target_level, goal, duration_weeks, curated_by)
      SELECT 'Cardio Endurance Blast', 'Beginner', 'Fat Loss', 6, 'FitKit Admin'
      WHERE NOT EXISTS (SELECT 1 FROM workout_plans WHERE title = 'Cardio Endurance Blast');

      INSERT INTO workout_plans (title, target_level, goal, duration_weeks, curated_by)
      SELECT 'Core & Power Conditioning', 'Advanced', 'Strength', 8, 'FitKit Admin'
      WHERE NOT EXISTS (SELECT 1 FROM workout_plans WHERE title = 'Core & Power Conditioning');

      INSERT INTO workout_plan (title, target_level, goal, duration_weeks, curated_by)
      SELECT 'Full Body Hypertrophy', 'Intermediate', 'Muscle Gain', 4, 'FitKit Admin'
      WHERE NOT EXISTS (SELECT 1 FROM workout_plan WHERE title = 'Full Body Hypertrophy');

      INSERT INTO workout_plan (title, target_level, goal, duration_weeks, curated_by)
      SELECT 'Cardio Endurance Blast', 'Beginner', 'Fat Loss', 6, 'FitKit Admin'
      WHERE NOT EXISTS (SELECT 1 FROM workout_plan WHERE title = 'Cardio Endurance Blast');
    `);

    console.log('Plans catalog successfully seeded!');
    process.exit(0);
  } catch (err) {
    console.error('Plan seeding failed:', err);
    process.exit(1);
  }
}

seedPlans();