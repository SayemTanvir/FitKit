-- FitKit sample/seed data


-- 1. Geographic Location Baseline
INSERT INTO Region (region_id, region_name) VALUES
    (1, 'Asia'),
    (2, 'Americas'),
    (3, 'Europe')
ON CONFLICT (region_id) DO NOTHING;

INSERT INTO Country (country_id, country_name, region_id) VALUES
    ('BD', 'Bangladesh', 1),
    ('US', 'United States', 2),
    ('UK', 'United Kingdom', 3)
ON CONFLICT (country_id) DO NOTHING;

INSERT INTO Address (address_id, street_address, city, state_province, postal_code, country_id) VALUES
    (1, 'Polashi', 'Dhaka', 'Dhaka Division', '1205', 'BD'),
    (2, '742 Evergreen Terrace', 'Springfield', 'Oregon', '97477', 'US')
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
-- Hash: $2b$10$z7g0/wzOQY.vQj6L4hN4O.Gf2Bw6X4I90d1qZgKj5J/lQyN9eX5e.
INSERT INTO users (
    user_id, name, email, password_hash, phone_no, gender, 
    birth_date, height_cm, weight_kg, fitness_level, primary_goal, 
    default_privacy, address_id, address_type, created_at
) VALUES 
(
    1, 'FitKit Admin', 'admin@fitkit.com', 
    '$2b$10$z7g0/wzOQY.vQj6L4hN4O.Gf2Bw6X4I90d1qZgKj5J/lQyN9eX5e.', 
    '01700000000', 'Male', '1995-05-15', 178.0, 75.0, 
    'Advanced', 'General Fitness', 'Public', 1, 'Work', '2023-01-01 00:00:00'
),
(
    2, 'Regular Member', 'member@fitkit.com', 
    '$2b$10$z7g0/wzOQY.vQj6L4hN4O.Gf2Bw6X4I90d1qZgKj5J/lQyN9eX5e.', 
    '01800000000', 'Female', '2001-08-20', 162.0, 58.0, 
    'Beginner', 'Weight Loss', 'Friends', 1, 'Home', '2025-06-01 00:00:00'
)
ON CONFLICT (user_id) DO NOTHING;

-- Subclass Assignments
INSERT INTO Admin (user_id, admin_role, department, can_curate_plans) VALUES
    (1, 'SuperAdmin', 'Operations', TRUE)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO Member (user_id, daily_step_goal, is_rest_mode) VALUES
    (2, 10000, FALSE)
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

-- 5. Achievements
INSERT INTO Achievement (achievement_id, badge_name, criteria_description) VALUES
    (1, 'First Step', 'Log your first workout or step increment.'),
    (2, '10k Club', 'Reach 10,000 steps in a single day.'),
    (3, 'Hydration Champion', 'Log 3,000 mL of water intake in a single day.')
ON CONFLICT (achievement_id) DO NOTHING;

SELECT setval('Achievement_achievement_id_seq', (SELECT MAX(achievement_id) FROM Achievement));