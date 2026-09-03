import { query } from './db';

async function fixTriggerAndTable() {
  try {
    console.log('Fixing ActivityFeed constraints...');
    // Ensure existing columns don't block inserts
    await query(`
      ALTER TABLE ActivityFeed 
        ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50) DEFAULT 'workout',
        ADD COLUMN IF NOT EXISTS description TEXT;
      
      ALTER TABLE ActivityFeed ALTER COLUMN message DROP NOT NULL;
      ALTER TABLE ActivityFeed ALTER COLUMN feed_type DROP NOT NULL;
    `);

    console.log('Updating trigger function with complete column mapping...');
    await query(`
      CREATE OR REPLACE FUNCTION fn_workout_to_feed()
      RETURNS TRIGGER AS $$
      DECLARE
        v_exercise_name VARCHAR(100);
        v_msg TEXT;
      BEGIN
        IF NEW.is_public = TRUE THEN
          SELECT name INTO v_exercise_name FROM Exercise WHERE exercise_id = NEW.exercise_id;

          v_msg := 'Completed ' || NEW.quantity || ' reps/mins of ' || COALESCE(v_exercise_name, 'an exercise') || ' (' || COALESCE(NEW.calories_burned, 0) || ' kcal)';

          INSERT INTO ActivityFeed (user_id, activity_type, feed_type, description, message)
          VALUES (
            NEW.user_id,
            'workout',
            'workout',
            v_msg,
            v_msg
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('Trigger and table successfully repaired!');
    process.exit(0);
  } catch (err) {
    console.error('Repair error:', err);
    process.exit(1);
  }
}

fixTriggerAndTable();