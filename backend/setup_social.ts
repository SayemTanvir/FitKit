import { query } from './db';

async function syncFeed() {
  try {
    // 1. Backfill any rows where description was null
    await query(`
      UPDATE ActivityFeed 
      SET description = message 
      WHERE description IS NULL AND message IS NOT NULL;
    `);

    // 2. Trigger that populates BOTH description and message
    await query(`
      CREATE OR REPLACE FUNCTION fn_workout_to_feed()
      RETURNS TRIGGER AS $$
      DECLARE
        v_exercise_name VARCHAR(100);
        v_msg TEXT;
      BEGIN
        IF NEW.is_public = TRUE THEN
          SELECT name INTO v_exercise_name FROM Exercise WHERE exercise_id = NEW.exercise_id;

          v_msg := 'Completed ' || NEW.quantity || ' reps/mins of ' || COALESCE(v_exercise_name, 'an exercise') || ' (' || NEW.calories_burned || ' kcal)';

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

    console.log('ActivityFeed synchronized and trigger updated!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncFeed();