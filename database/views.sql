-- FitKit database views


-- 1. Daily Aggregated Telemetry per Member
CREATE OR REPLACE VIEW view_daily_member_summary AS
SELECT 
    u.user_id,
    u.name,
    d.activity_date,
    COALESCE(s.total_steps, 0) AS total_steps,
    COALESCE(s.step_calories, 0) + COALESCE(w.workout_calories, 0) AS total_calories_burned,
    COALESCE(h.total_water_ml, 0) AS total_water_ml
FROM users u
CROSS JOIN LATERAL (
    SELECT DISTINCT logged_at::DATE AS activity_date 
    FROM (
        SELECT logged_at FROM StepEntry WHERE user_id = u.user_id
        UNION
        SELECT logged_at FROM WorkoutEntry WHERE user_id = u.user_id
        UNION
        SELECT logged_at FROM HydrationEntry WHERE user_id = u.user_id
    ) all_dates
) d
LEFT JOIN LATERAL (
    SELECT SUM(steps_added) AS total_steps, SUM(calories_burned) AS step_calories
    FROM StepEntry 
    WHERE user_id = u.user_id AND logged_at::DATE = d.activity_date
) s ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(calories_burned) AS workout_calories
    FROM WorkoutEntry 
    WHERE user_id = u.user_id AND logged_at::DATE = d.activity_date
) w ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(amount_ml) AS total_water_ml
    FROM HydrationEntry 
    WHERE user_id = u.user_id AND logged_at::DATE = d.activity_date
) h ON TRUE;

-- 2. Global Leaderboard (Only Public Step Submissions are Counted)
CREATE OR REPLACE VIEW view_global_leaderboard AS
SELECT 
    u.user_id,
    u.name,
    COALESCE(SUM(s.steps_added), 0) AS total_public_steps,
    RANK() OVER (ORDER BY COALESCE(SUM(s.steps_added), 0) DESC) AS global_rank
FROM users u
JOIN Member m ON u.user_id = m.user_id
LEFT JOIN StepEntry s ON u.user_id = s.user_id AND s.is_public = TRUE
GROUP BY u.user_id, u.name;

-- 3. Comprehensive Exercise Catalog View
CREATE OR REPLACE VIEW view_exercise_catalog AS
SELECT 
    e.exercise_id,
    e.name,
    e.target_muscle_group,
    e.calorie_factor,
    e.difficulty_level,
    e.instructions,
    CASE 
        WHEN se.exercise_id IS NOT NULL THEN 'Strength'
        WHEN ce.exercise_id IS NOT NULL THEN 'Cardio'
        WHEN fe.exercise_id IS NOT NULL THEN 'Flexibility'
        ELSE 'General'
    END AS category,
    se.equipment_needed,
    ce.mets_score,
    fe.hold_type
FROM Exercise e
LEFT JOIN StrengthExercise se ON e.exercise_id = se.exercise_id
LEFT JOIN CardioExercise ce ON e.exercise_id = ce.exercise_id
LEFT JOIN FlexibilityExercise fe ON e.exercise_id = fe.exercise_id;