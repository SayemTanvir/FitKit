import { query } from './db';

async function fixConstraint() {
  try {
    console.log('Dropping restrictive feed_type check constraint...');
    await query(`
      ALTER TABLE ActivityFeed 
      DROP CONSTRAINT IF EXISTS activityfeed_feed_type_check;
    `);

    console.log('Updating trigger function...');
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

    console.log('Database constraint removed and trigger updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Database fix error:', err);
    process.exit(1);
  }
}

fixConstraint();