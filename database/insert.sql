-- FitKit sample/seed data


-- 1. Geographic Location Baseline
INSERT INTO Region (region_id, region_name) VALUES
    (1, 'Asia'),
    (2, 'Americas'),
    (3, 'Europe'),
    (4, 'Africa'),
    (5, 'Oceania')
ON CONFLICT (region_id) DO NOTHING;

INSERT INTO Country (country_id, country_name, region_id) VALUES
    ('BD', 'Bangladesh', 1),
    ('US', 'United States', 2),
    ('UK', 'United Kingdom', 3),
    ('CA', 'Canada', 2),
    ('AU', 'Australia', 5),
    ('JP', 'Japan', 1),
    ('DE', 'Germany', 3),
    ('BR', 'Brazil', 2),
    ('IN', 'India', 1),
    ('ZA', 'South Africa', 4)
ON CONFLICT (country_id) DO NOTHING;

INSERT INTO Address (address_id, street_address, city, state_province, postal_code, country_id) VALUES
    (1, 'Polashi', 'Dhaka', 'Dhaka Division', '1205', 'BD'),
    (2, '742 Evergreen Terrace', 'Springfield', 'Oregon', '97477', 'US'),
    (3, '18 King Street', 'Manchester', 'Greater Manchester', 'M2 6AG', 'UK'),
    (4, '120 Harbour Street', 'Toronto', 'Ontario', 'M5J 2L9', 'CA'),
    (5, '44 George Street', 'Sydney', 'New South Wales', '2000', 'AU'),
    (6, '3-5-1 Marunouchi', 'Tokyo', 'Tokyo', '100-0005', 'JP'),
    (7, '27 Alexanderplatz', 'Berlin', 'Berlin', '10178', 'DE'),
    (8, '155 Avenida Paulista', 'Sao Paulo', 'Sao Paulo', '01310-200', 'BR'),
    (9, '42 MG Road', 'Bengaluru', 'Karnataka', '560001', 'IN'),
    (10, '81 Long Street', 'Cape Town', 'Western Cape', '8001', 'ZA')
ON CONFLICT (address_id) DO NOTHING;

-- 2. Membership Ranks
INSERT INTO MembershipRank (rank_name, min_years) VALUES
    ('Bronze', 0),
    ('Silver', 1),
    ('Gold', 3),
    ('Platinum', 5),
    ('Diamond', 10)
ON CONFLICT (rank_name) DO NOTHING;

-- 3. Pre-Seeded Users with Salted Bcrypt Hashes (Password: "Password@123")
-- Hash generated for the demo password below.
INSERT INTO users (
    user_id, name, email, password_hash, phone_no, gender, 
    birth_date, height_cm, weight_kg, fitness_level, primary_goal, 
    default_privacy, address_id, address_type, created_at
) VALUES 
(
    1, 'FitKit Admin', 'admin@fitkit.com', 
    '$2b$10$v1dx1SG5zUWaAKremjb5YOyraH4ZUPqR7pJ45jkkaxjxrsLtxFwK.',
    '01700000000', 'Male', '1995-05-15', 178.0, 75.0, 
    'Advanced', 'General Fitness', 'Public', 1, 'Work', '2023-01-01 00:00:00'
),
(
    2, 'Regular Member', 'member@fitkit.com', 
    '$2b$10$v1dx1SG5zUWaAKremjb5YOyraH4ZUPqR7pJ45jkkaxjxrsLtxFwK.',
    '01800000000', 'Female', '2001-08-20', 162.0, 58.0, 
    'Beginner', 'Weight Loss', 'Friends', 1, 'Home', '2025-06-01 00:00:00'
)
ON CONFLICT (user_id) DO NOTHING;

-- Subclass Assignments
INSERT INTO Admin (user_id, admin_role, department, can_curate_plans, is_active, can_manage_admins) VALUES
    (1, 'SuperAdmin', 'Operations', TRUE, TRUE, TRUE)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO Member (user_id, daily_step_goal, is_rest_mode) VALUES
    (2, 10000, FALSE)
ON CONFLICT (user_id) DO NOTHING;

-- Explicit IDs above do not advance PostgreSQL sequences.
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- 100 deterministic demo members. Their local email part is also their
-- community username; every account uses the password "12345678".
WITH demo AS (
    SELECT
        n,
        first_names[((n - 1) % array_length(first_names, 1)) + 1] AS first_name,
        last_names[(((n - 1) / array_length(first_names, 1))::INT % array_length(last_names, 1)) + 1] AS last_name,
        country_codes[((n - 1) % array_length(country_codes, 1)) + 1] AS country_id
    FROM generate_series(1, 100) AS series(n)
    CROSS JOIN (SELECT ARRAY[
        'Aisha','Liam','Sofia','Noah','Maya','Ethan','Priya','Lucas','Hana','Oliver',
        'Nadia','Mateo','Emma','Arif','Chloe','Daniel','Yuki','Amara','Leo','Fatima'
    ]::TEXT[] AS first_names) f
    CROSS JOIN (SELECT ARRAY[
        'Rahman','Carter','Silva','Ahmed','Patel','Kim','Tanaka','Muller','Smith','Khan',
        'Brown','Sato','Wilson','Garcia','Das','Martin','Ali','Johnson','Naidoo','Roy'
    ]::TEXT[] AS last_names) l
    CROSS JOIN (SELECT ARRAY['BD','US','UK','CA','AU','JP','DE','BR','IN','ZA']::CHAR(2)[] AS country_codes) c
)
INSERT INTO users (
    name, email, password_hash, phone_no, gender, birth_date, height_cm,
    weight_kg, fitness_level, primary_goal, country_id, default_privacy,
    address_id, address_type, created_at
)
SELECT
    first_name || ' ' || last_name,
    LOWER(first_name || '.' || last_name || LPAD(n::TEXT, 3, '0') || '@fitkit.com'),
    '$2b$10$dYTMSr/fWUU63II61XowouX1lBr5.08Qh06bC7PjbUaJ7O2RUOisS',
    '+8801' || LPAD((700000000 + n)::TEXT, 9, '0'),
    CASE WHEN n % 2 = 0 THEN 'Male' ELSE 'Female' END,
    (DATE '1984-01-01' + ((n * 173) % 7300))::DATE,
    (150 + (n * 7 % 46))::NUMERIC(5,2),
    (48 + (n * 11 % 53))::NUMERIC(5,2),
    (ARRAY['Beginner','Intermediate','Advanced'])[((n - 1) % 3) + 1],
    (ARRAY['Weight Loss','Muscle Gain','Strength','Flexibility','General Fitness'])[((n - 1) % 5) + 1],
    country_id,
    (ARRAY['Public','Friends','Private'])[((n - 1) % 3) + 1],
    ((n - 1) % 10) + 1,
    (ARRAY['Home','Work','Gym'])[((n - 1) % 3) + 1],
    CURRENT_TIMESTAMP - ((30 + n * 12) || ' days')::INTERVAL
FROM demo
ON CONFLICT (email) DO NOTHING;

INSERT INTO Member (user_id, daily_step_goal, daily_calorie_goal, daily_hydration_goal, is_rest_mode)
SELECT
    user_id,
    6000 + (user_id % 9) * 1000,
    500 + (user_id % 8) * 100,
    1800 + (user_id % 9) * 200,
    user_id % 17 = 0
FROM users
WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
ON CONFLICT (user_id) DO NOTHING;

-- Sync Sequence Counters
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('Region_region_id_seq', (SELECT MAX(region_id) FROM Region));
SELECT setval('Address_address_id_seq', (SELECT MAX(address_id) FROM Address));

-- 4. Exercise Catalog
INSERT INTO Exercise (exercise_id, name, target_muscle_group, calorie_factor, difficulty_level, instructions) VALUES
    (1, 'Push-Up', 'Chest', 0.35, 'Beginner', 'Keep back flat, descend until chest touches ground.'),
    (2, 'Pull-Up', 'Back', 0.80, 'Intermediate', 'Full hang to chin over bar.'),
    (3, 'Bodyweight Squat', 'Quads', 0.30, 'Beginner', 'Hips below knees, chest upright.'),
    (4, 'Running', 'Cardio', 1.20, 'Intermediate', 'Outdoor jog or treadmill pacing.'),
    (5, 'Hamstring Stretch', 'Hamstrings', 0.10, 'Beginner', 'Hold sitting toe reach without bouncing.')
ON CONFLICT (exercise_id) DO NOTHING;

INSERT INTO StrengthExercise (exercise_id, equipment_needed) VALUES
    (1, 'Bodyweight'),
    (2, 'Pull-Up Bar'),
    (3, 'Bodyweight')
ON CONFLICT (exercise_id) DO NOTHING;

INSERT INTO CardioExercise (exercise_id, mets_score) VALUES
    (4, 8.5)
ON CONFLICT (exercise_id) DO NOTHING;

INSERT INTO FlexibilityExercise (exercise_id, hold_type) VALUES
    (5, 'Static')
ON CONFLICT (exercise_id) DO NOTHING;

SELECT setval('Exercise_exercise_id_seq', (SELECT MAX(exercise_id) FROM Exercise));

-- 5. Curated Workout Plans
INSERT INTO WorkoutPlan (plan_id, admin_id, title, target_level, goal_category, duration_weeks) VALUES
    (1, 1, 'Full Body Foundation', 'Beginner', 'General Fitness', 4),
    (2, 1, 'Strength Builder', 'Intermediate', 'Strength', 6),
    (3, 1, 'Cardio Endurance', 'Intermediate', 'Weight Loss', 6)
ON CONFLICT (plan_id) DO NOTHING;

INSERT INTO WorkoutPlanExercise
    (plan_id, exercise_id, day_number, order_seq, target_quantity) VALUES
    (1, 1, 1, 1, 12),
    (1, 3, 1, 2, 15),
    (1, 5, 1, 3, 30),
    (2, 2, 1, 1, 8),
    (2, 1, 1, 2, 15),
    (3, 4, 1, 1, 30)
ON CONFLICT (plan_id, exercise_id, day_number) DO NOTHING;

INSERT INTO MemberWorkoutPlan (user_id, plan_id, start_date, status) VALUES
    (2, 1, CURRENT_DATE, 'Active')
ON CONFLICT (user_id, plan_id) DO NOTHING;

INSERT INTO MemberWorkoutPlan (user_id, plan_id, start_date, status)
SELECT
    u.user_id,
    1 + (u.user_id % 3),
    CURRENT_DATE - (20 + u.user_id % 180),
    (ARRAY['Active','Completed','Abandoned'])[(u.user_id % 3) + 1]
FROM users u
WHERE u.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
ON CONFLICT (user_id, plan_id) DO NOTHING;

SELECT setval('WorkoutPlan_plan_id_seq', (SELECT MAX(plan_id) FROM WorkoutPlan));

-- 6. Achievements
INSERT INTO Achievement (achievement_id, badge_name, criteria_description) VALUES
    (1, 'First Step', 'Log your first workout or step increment.'),
    (2, '10k Club', 'Reach 10,000 steps in a single day.'),
    (3, 'Hydration Champion', 'Log 3,000 mL of water intake in a single day.')
ON CONFLICT (achievement_id) DO NOTHING;

SELECT setval('Achievement_achievement_id_seq', (SELECT MAX(achievement_id) FROM Achievement));

INSERT INTO MemberAchievement (user_id, achievement_id, earned_date) VALUES
    (2, 1, CURRENT_TIMESTAMP)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Historical data: twelve weekly workouts plus thirty days of step and
-- hydration records per demo member. NOT EXISTS guards keep this rerunnable.
INSERT INTO WorkoutEntry (user_id, exercise_id, logged_at, quantity, is_public)
SELECT
    u.user_id,
    1 + ((u.user_id + history.week_no) % 5),
    CURRENT_TIMESTAMP - ((history.week_no * 7 + u.user_id % 6) || ' days')::INTERVAL,
    8 + ((u.user_id * 3 + history.week_no * 5) % 43),
    (u.user_id + history.week_no) % 3 = 0
FROM users u
CROSS JOIN generate_series(1, 12) AS history(week_no)
WHERE u.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
  AND NOT EXISTS (
      SELECT 1 FROM WorkoutEntry existing
      WHERE existing.user_id = u.user_id
        AND existing.logged_at::DATE = (CURRENT_DATE - (history.week_no * 7 + u.user_id % 6))
        AND existing.exercise_id = 1 + ((u.user_id + history.week_no) % 5)
  );

INSERT INTO StepEntry (user_id, logged_at, steps_added, is_public)
SELECT
    u.user_id,
    CURRENT_TIMESTAMP - (history.day_no || ' days')::INTERVAL,
    3500 + ((u.user_id * 613 + history.day_no * 977) % 12501),
    (u.user_id + history.day_no) % 4 = 0
FROM users u
CROSS JOIN generate_series(1, 30) AS history(day_no)
WHERE u.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
  AND NOT EXISTS (
      SELECT 1 FROM StepEntry existing
      WHERE existing.user_id = u.user_id
        AND existing.logged_at::DATE = CURRENT_DATE - history.day_no
  );

INSERT INTO HydrationEntry (user_id, logged_at, amount_ml, is_public)
SELECT
    u.user_id,
    CURRENT_TIMESTAMP - (history.day_no || ' days')::INTERVAL,
    1200 + ((u.user_id * 137 + history.day_no * 211) % 2601),
    FALSE
FROM users u
CROSS JOIN generate_series(1, 30) AS history(day_no)
WHERE u.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
  AND NOT EXISTS (
      SELECT 1 FROM HydrationEntry existing
      WHERE existing.user_id = u.user_id
        AND existing.logged_at::DATE = CURRENT_DATE - history.day_no
  );

INSERT INTO MemberAchievement (user_id, achievement_id, earned_date)
SELECT
    u.user_id,
    achievement.achievement_id,
    CURRENT_TIMESTAMP - ((u.user_id % 90 + achievement.achievement_id * 3) || ' days')::INTERVAL
FROM users u
JOIN Achievement achievement ON achievement.achievement_id <= 1 + (u.user_id % 3)
WHERE u.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users
    WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
), pairs AS (
    SELECT
        member.user_id,
        friend.user_id AS friend_id,
        CASE WHEN member.position % 6 = 0 THEN 'Pending' ELSE 'Accepted' END AS status,
        member.position
    FROM ranked member
    JOIN ranked friend ON friend.position = (member.position % 100) + 1
)
INSERT INTO Friendship (user_id, friend_id, status, since_date)
SELECT user_id, friend_id, status, CURRENT_TIMESTAMP - ((position * 4) || ' days')::INTERVAL
FROM pairs
ON CONFLICT DO NOTHING;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('WorkoutEntry_entry_id_seq', (SELECT MAX(entry_id) FROM WorkoutEntry));
SELECT setval('StepEntry_step_entry_id_seq', (SELECT MAX(step_entry_id) FROM StepEntry));
SELECT setval('HydrationEntry_hydration_id_seq', (SELECT MAX(hydration_id) FROM HydrationEntry));
SELECT setval('ActivityFeed_feed_id_seq', (SELECT MAX(feed_id) FROM ActivityFeed));
SELECT setval('Notification_notification_id_seq', (SELECT MAX(notification_id) FROM Notification));
