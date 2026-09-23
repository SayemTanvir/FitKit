-- Compatibility migration for databases created by an earlier FitKit version.
-- This script only adds missing canonical role, plan, and assignment rows.

ALTER TABLE Member
    ADD COLUMN IF NOT EXISTS daily_calorie_goal INT NOT NULL DEFAULT 800,
    ADD COLUMN IF NOT EXISTS daily_hydration_goal INT NOT NULL DEFAULT 2800;

-- Restore missing profile fields on the original demo accounts created by
-- earlier development scripts. Existing non-null values are preserved.
UPDATE users
SET gender = COALESCE(gender, 'Male'),
    birth_date = COALESCE(birth_date, DATE '1995-05-15'),
    height_cm = COALESCE(height_cm, 178),
    weight_kg = COALESCE(weight_kg, 75),
    fitness_level = COALESCE(fitness_level, 'Advanced'),
    primary_goal = COALESCE(primary_goal, 'General Fitness')
WHERE LOWER(email) = 'admin@fitkit.com';

UPDATE users
SET gender = COALESCE(gender, 'Female'),
    birth_date = COALESCE(birth_date, DATE '2001-08-20'),
    height_cm = COALESCE(height_cm, 162),
    weight_kg = COALESCE(weight_kg, 58),
    fitness_level = COALESCE(fitness_level, 'Beginner'),
    primary_goal = COALESCE(primary_goal, 'Weight Loss')
WHERE LOWER(email) = 'member@fitkit.com';


INSERT INTO Admin (user_id, admin_role, department, can_curate_plans)
SELECT user_id, 'SuperAdmin', 'Operations', TRUE
FROM users
WHERE LOWER(email) = 'admin@fitkit.com'
ON CONFLICT (user_id) DO UPDATE
SET admin_role = EXCLUDED.admin_role,
    department = EXCLUDED.department,
    can_curate_plans = EXCLUDED.can_curate_plans;

INSERT INTO Member (user_id, daily_step_goal, is_rest_mode)
SELECT user_id, 10000, FALSE
FROM users
WHERE LOWER(email) = 'member@fitkit.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO WorkoutPlan (admin_id, title, target_level, goal_category, duration_weeks)
SELECT u.user_id, plan.title, plan.target_level, plan.goal_category, plan.duration_weeks
FROM users u
CROSS JOIN (
    VALUES
        ('Full Body Foundation', 'Beginner', 'General Fitness', 4),
        ('Strength Builder', 'Intermediate', 'Strength', 6),
        ('Cardio Endurance', 'Intermediate', 'Weight Loss', 6)
) AS plan(title, target_level, goal_category, duration_weeks)
WHERE LOWER(u.email) = 'admin@fitkit.com'
  AND NOT EXISTS (
      SELECT 1 FROM WorkoutPlan existing WHERE existing.title = plan.title
  );

INSERT INTO WorkoutPlanExercise
    (plan_id, exercise_id, day_number, order_seq, target_quantity)
SELECT wp.plan_id, e.exercise_id, mapping.day_number, mapping.order_seq, mapping.target_quantity
FROM (
    VALUES
        ('Full Body Foundation', 'Push-Up', 1, 1, 12),
        ('Full Body Foundation', 'Bodyweight Squat', 1, 2, 15),
        ('Full Body Foundation', 'Hamstring Stretch', 1, 3, 30),
        ('Strength Builder', 'Pull-Up', 1, 1, 8),
        ('Strength Builder', 'Push-Up', 1, 2, 15),
        ('Cardio Endurance', 'Running', 1, 1, 30)
) AS mapping(plan_title, exercise_name, day_number, order_seq, target_quantity)
JOIN WorkoutPlan wp ON wp.title = mapping.plan_title
JOIN Exercise e ON e.name = mapping.exercise_name
ON CONFLICT (plan_id, exercise_id, day_number) DO NOTHING;

-- Earlier development seeds used these exercise names.
INSERT INTO WorkoutPlanExercise
    (plan_id, exercise_id, day_number, order_seq, target_quantity)
SELECT wp.plan_id, e.exercise_id, mapping.day_number, mapping.order_seq, mapping.target_quantity
FROM (
    VALUES
        ('Full Body Foundation', 'Push-ups', 1, 1, 12),
        ('Full Body Foundation', 'Squats', 1, 2, 15),
        ('Full Body Foundation', 'Plank (seconds)', 1, 3, 30),
        ('Strength Builder', 'Push-ups', 1, 1, 15),
        ('Strength Builder', 'Squats', 1, 2, 12),
        ('Cardio Endurance', 'Treadmill Running', 1, 1, 30)
) AS mapping(plan_title, exercise_name, day_number, order_seq, target_quantity)
JOIN WorkoutPlan wp ON wp.title = mapping.plan_title
JOIN Exercise e ON e.name = mapping.exercise_name
ON CONFLICT (plan_id, exercise_id, day_number) DO NOTHING;

INSERT INTO MemberWorkoutPlan (user_id, plan_id, start_date, status)
SELECT u.user_id, wp.plan_id, CURRENT_DATE, 'Active'
FROM users u
JOIN WorkoutPlan wp ON wp.title = 'Full Body Foundation'
WHERE LOWER(u.email) = 'member@fitkit.com'
ON CONFLICT (user_id, plan_id) DO NOTHING;

INSERT INTO MemberAchievement (user_id, achievement_id, earned_date)
SELECT u.user_id, a.achievement_id, CURRENT_TIMESTAMP
FROM users u
JOIN Achievement a ON a.badge_name = 'First Step'
WHERE LOWER(u.email) = 'member@fitkit.com'
ON CONFLICT (user_id, achievement_id) DO NOTHING;
