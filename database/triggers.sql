 
-- 1. Trigger for User Age Validation
DROP TRIGGER IF EXISTS trg_validate_user_age ON users;
CREATE TRIGGER trg_validate_user_age
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_user_age();

-- 2. Auto-Calculate Workout Calories Burned
CREATE OR REPLACE FUNCTION trg_fn_calc_workout_calories()
RETURNS TRIGGER AS $$
DECLARE
    v_weight NUMERIC;
    v_factor NUMERIC;
BEGIN
    SELECT weight_kg INTO v_weight FROM users WHERE user_id = NEW.user_id;
    SELECT calorie_factor INTO v_factor FROM Exercise WHERE exercise_id = NEW.exercise_id;

    -- Defaults to baseline factor 1.0 if not configured
    IF v_factor IS NULL THEN
        v_factor := 1.0;
    END IF;

    -- Standardized burn formula scaled against 70kg baseline
    NEW.calories_burned := ROUND((NEW.quantity * v_factor * (v_weight / 70.0)), 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_workout_calories ON WorkoutEntry;
CREATE TRIGGER trg_calc_workout_calories
BEFORE INSERT ON WorkoutEntry
FOR EACH ROW
EXECUTE FUNCTION trg_fn_calc_workout_calories();

-- 3. Auto-Calculate Step Calories Burned (~0.04 kcal per step for a 70kg individual)
CREATE OR REPLACE FUNCTION trg_fn_calc_step_calories()
RETURNS TRIGGER AS $$
DECLARE
    v_weight NUMERIC;
BEGIN
    SELECT weight_kg INTO v_weight FROM users WHERE user_id = NEW.user_id;
    NEW.calories_burned := ROUND((NEW.steps_added * 0.04 * (v_weight / 70.0)), 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_step_calories ON StepEntry;
CREATE TRIGGER trg_calc_step_calories
BEFORE INSERT ON StepEntry
FOR EACH ROW
EXECUTE FUNCTION trg_fn_calc_step_calories();

-- 4. Auto-Publish to ActivityFeed When Workout is Public
CREATE OR REPLACE FUNCTION trg_fn_publish_workout_feed()
RETURNS TRIGGER AS $$
DECLARE
    v_ex_name VARCHAR(100);
BEGIN
    IF NEW.is_public = TRUE THEN
        SELECT name INTO v_ex_name FROM Exercise WHERE exercise_id = NEW.exercise_id;
        
        INSERT INTO ActivityFeed (user_id, message, feed_type, created_at)
        VALUES (
            NEW.user_id,
            'Completed ' || NEW.quantity || ' reps/mins of ' || v_ex_name || ' (Burned ' || NEW.calories_burned || ' kcal)!',
            'WorkoutCompleted',
            NEW.logged_at
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_publish_workout_feed ON WorkoutEntry;
CREATE TRIGGER trg_publish_workout_feed
AFTER INSERT ON WorkoutEntry
FOR EACH ROW
EXECUTE FUNCTION trg_fn_publish_workout_feed();

-- 5. Auto-Publish Step Goal Milestones
CREATE OR REPLACE FUNCTION trg_fn_check_step_goal()
RETURNS TRIGGER AS $$
DECLARE
    v_step_goal INT;
    v_total_steps INT;
BEGIN
    SELECT daily_step_goal INTO v_step_goal FROM Member WHERE user_id = NEW.user_id;
    
    SELECT SUM(steps_added) INTO v_total_steps 
    FROM StepEntry 
    WHERE user_id = NEW.user_id AND logged_at::DATE = NEW.logged_at::DATE;

    IF v_total_steps >= v_step_goal AND (v_total_steps - NEW.steps_added) < v_step_goal THEN
        INSERT INTO ActivityFeed (user_id, message, feed_type, created_at)
        VALUES (
            NEW.user_id,
            'Reached the daily target of ' || v_step_goal || ' steps today!',
            'StepGoalReached',
            NEW.logged_at
        );

        INSERT INTO Notification (user_id, title, message, notification_type)
        VALUES (
            NEW.user_id,
            'Daily Goal Reached!',
            'Congratulations, you reached your step goal of ' || v_step_goal || ' steps!',
            'Goal'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_step_goal ON StepEntry;
CREATE TRIGGER trg_check_step_goal
AFTER INSERT ON StepEntry
FOR EACH ROW
EXECUTE FUNCTION trg_fn_check_step_goal();