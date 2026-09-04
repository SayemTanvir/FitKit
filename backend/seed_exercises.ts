import { query } from './db';

async function seedExercises() {
  try {
    console.log('Syncing Exercise table schema and stripping restrictive constraints...');

    // 1. Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS Exercise (
        exercise_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      );
    `);

    // 2. Add missing columns safely
    await query(`
      ALTER TABLE Exercise 
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General',
        ADD COLUMN IF NOT EXISTS calories_per_unit NUMERIC(5,2) DEFAULT 0.50,
        ADD COLUMN IF NOT EXISTS target_muscle_group VARCHAR(100) DEFAULT 'Full Body';
    `);

    // 3. Drop NOT NULL on non-essential columns
    await query(`
      DO $$
      DECLARE
        col RECORD;
      BEGIN
        FOR col IN 
          SELECT column_name 
          FROM information_schema.columns 
          WHERE LOWER(table_name) = 'exercise' 
            AND is_nullable = 'NO' 
            AND column_name NOT IN ('exercise_id', 'name')
        LOOP
          EXECUTE format('ALTER TABLE Exercise ALTER COLUMN %I DROP NOT NULL', col.column_name);
        END LOOP;
      END $$;
    `);

    // 4. Seed default exercise records
    await query(`
      INSERT INTO Exercise (name, category, calories_per_unit, target_muscle_group)
      VALUES 
        ('Push-ups', 'Strength', 0.29, 'Chest'),
        ('Squats', 'Strength', 0.32, 'Legs'),
        ('Treadmill Running', 'Cardio', 10.00, 'Full Body'),
        ('Jumping Jacks', 'Cardio', 0.20, 'Full Body'),
        ('Plank (seconds)', 'Core', 0.15, 'Abs')
      ON CONFLICT (name) DO UPDATE 
      SET 
        category = EXCLUDED.category,
        calories_per_unit = EXCLUDED.calories_per_unit,
        target_muscle_group = EXCLUDED.target_muscle_group;
    `);

    console.log('Exercise table successfully updated and seeded!');
    process.exit(0);
  } catch (err) {
    console.error('Exercise seed error:', err);
    process.exit(1);
  }
}

seedExercises();