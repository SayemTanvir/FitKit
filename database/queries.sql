-- FitKit required SQL queries for the DBMS project


-- 1. Verify Role Resolution for Login Route
SELECT u.user_id, u.email, u.password_hash,
       CASE 
         WHEN a.user_id IS NOT NULL THEN 'Admin'
         WHEN m.user_id IS NOT NULL THEN 'Member'
         ELSE 'Unassigned'
       END AS resolved_role
FROM users u
LEFT JOIN Admin a ON u.user_id = a.user_id
LEFT JOIN Member m ON u.user_id = m.user_id
WHERE u.email = 'admin@fitkit.com';

-- 2. Test Membership Rank Dynamic Stored Function
SELECT u.user_id, u.name, u.created_at, get_membership_rank(u.user_id) AS rank
FROM users u;

-- 3. Test Water Goal Dynamic Stored Function
SELECT u.user_id, u.name, u.height_cm, u.weight_kg, calculate_water_goal(u.user_id) AS water_goal_ml
FROM users u;

-- 4. Test Exercise Hierarchy Inspection
SELECT * FROM view_exercise_catalog;

-- 5. Test Daily Aggregate Overview
SELECT * FROM view_daily_member_summary WHERE user_id = 2;

-- 6. Test Public Leaderboard
SELECT * FROM view_global_leaderboard;