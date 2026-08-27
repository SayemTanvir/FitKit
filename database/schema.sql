-- 1. GEOGRAPHIC LOCATION SUBSYSTEM
 

CREATE TABLE Region (
    region_id SERIAL PRIMARY KEY,
    region_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Country (
    country_id CHAR(2) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL UNIQUE,
    region_id INT NOT NULL,
    CONSTRAINT fk_country_region
        FOREIGN KEY (region_id)
        REFERENCES Region(region_id)
        ON DELETE CASCADE
);

CREATE TABLE Address (
    address_id SERIAL PRIMARY KEY,
    street_address VARCHAR(150) NOT NULL,
    city VARCHAR(50) NOT NULL,
    state_province VARCHAR(50),
    postal_code VARCHAR(20),
    country_id CHAR(2) NOT NULL,
    CONSTRAINT fk_address_country
        FOREIGN KEY (country_id)
        REFERENCES Country(country_id)
        ON DELETE CASCADE
);

 
-- 2. USER & ROLE SUBSYSTEM
 

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_no VARCHAR(20),
    gender VARCHAR(10)
        CHECK (gender IN ('Male', 'Female')),
    birth_date DATE NOT NULL,
    height_cm NUMERIC(5,2) NOT NULL
        CHECK (height_cm > 0),
    weight_kg NUMERIC(5,2) NOT NULL
        CHECK (weight_kg > 0),
    fitness_level VARCHAR(20)
        CHECK (
            fitness_level IN ('Beginner', 'Intermediate', 'Advanced')
        ),
    primary_goal VARCHAR(50),
    default_privacy VARCHAR(20) NOT NULL DEFAULT 'Private'
        CHECK (
            default_privacy IN ('Public', 'Friends', 'Private')
        ),
    address_id INT,
    address_type VARCHAR(20)
        CHECK (
            address_type IN ('Home', 'Work', 'Gym')
        ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_address
        FOREIGN KEY (address_id)
        REFERENCES Address(address_id)
        ON DELETE SET NULL
);

CREATE TABLE Admin (
    user_id INT PRIMARY KEY,
    admin_role VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    can_curate_plans BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_admin_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE Member (
    user_id INT PRIMARY KEY,
    daily_step_goal INT NOT NULL DEFAULT 10000
        CHECK (daily_step_goal > 0),
    is_rest_mode BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_member_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE MembershipRank (
    rank_id SERIAL PRIMARY KEY,
    rank_name VARCHAR(30) NOT NULL UNIQUE,
    min_years INT NOT NULL UNIQUE
        CHECK (min_years >= 0)
);

CREATE TABLE Notification (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL
        CHECK (
            notification_type IN (
                'Achievement', 'Workout', 'Reminder', 'Goal', 
                'Friend', 'Plan', 'System', 'MembershipRankUp'
            )
        ),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

 
-- 3. EXERCISE CATALOG & SPECIALIZATION
 

CREATE TABLE Exercise (
    exercise_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    target_muscle_group VARCHAR(50) NOT NULL,
    calorie_factor NUMERIC(5,2)
        CHECK (calorie_factor > 0),
    difficulty_level VARCHAR(20)
        CHECK (
            difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')
        ),
    instructions TEXT
);

CREATE TABLE StrengthExercise (
    exercise_id INT PRIMARY KEY,
    equipment_needed VARCHAR(50),
    CONSTRAINT fk_strength_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES Exercise(exercise_id)
        ON DELETE CASCADE
);

CREATE TABLE CardioExercise (
    exercise_id INT PRIMARY KEY,
    mets_score NUMERIC(4,2)
        CHECK (mets_score > 0),
    CONSTRAINT fk_cardio_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES Exercise(exercise_id)
        ON DELETE CASCADE
);

CREATE TABLE FlexibilityExercise (
    exercise_id INT PRIMARY KEY,
    hold_type VARCHAR(50),
    CONSTRAINT fk_flexibility_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES Exercise(exercise_id)
        ON DELETE CASCADE
);

 
-- 4. WORKOUT PLANS
 

CREATE TABLE WorkoutPlan (
    plan_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    target_level VARCHAR(20)
        CHECK (
            target_level IN ('Beginner', 'Intermediate', 'Advanced')
        ),
    goal_category VARCHAR(50)
        CHECK (
            goal_category IN (
                'Weight Loss', 'Muscle Gain', 'Strength', 
                'Flexibility', 'General Fitness'
            )
        ),
    duration_weeks INT
        CHECK (duration_weeks > 0),
    CONSTRAINT fk_workout_plan_admin
        FOREIGN KEY (admin_id)
        REFERENCES Admin(user_id)
        ON DELETE RESTRICT
);

CREATE TABLE WorkoutPlanExercise (
    plan_id INT NOT NULL,
    exercise_id INT NOT NULL,
    day_number INT NOT NULL
        CHECK (day_number > 0),
    order_seq INT NOT NULL
        CHECK (order_seq > 0),
    target_quantity INT NOT NULL
        CHECK (target_quantity > 0),
    PRIMARY KEY (plan_id, exercise_id, day_number),
    CONSTRAINT fk_wpe_plan
        FOREIGN KEY (plan_id)
        REFERENCES WorkoutPlan(plan_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_wpe_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES Exercise(exercise_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_plan_day_order
        UNIQUE (plan_id, day_number, order_seq)
);

CREATE TABLE MemberWorkoutPlan (
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (
            status IN ('Active', 'Completed', 'Abandoned')
        ),
    PRIMARY KEY (user_id, plan_id),
    CONSTRAINT fk_mwp_member
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_mwp_plan
        FOREIGN KEY (plan_id)
        REFERENCES WorkoutPlan(plan_id)
        ON DELETE CASCADE
);

 
-- 5. TRANSACTIONAL LOGS
 

CREATE TABLE WorkoutEntry (
    entry_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    exercise_id INT NOT NULL,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quantity INT NOT NULL
        CHECK (quantity > 0),
    calories_burned NUMERIC(6,2)
        CHECK (calories_burned >= 0),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_workout_entry_member
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_workout_entry_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES Exercise(exercise_id)
        ON DELETE RESTRICT
);

CREATE TABLE StepEntry (
    step_entry_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    steps_added INT NOT NULL
        CHECK (steps_added > 0),
    calories_burned NUMERIC(6,2)
        CHECK (calories_burned >= 0),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_step_entry_member
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE
);

CREATE TABLE HydrationEntry (
    hydration_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_ml INT NOT NULL
        CHECK (amount_ml > 0),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_hydration_entry_member
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE
);

 
-- 6. GAMIFICATION, SOCIAL FEED & FRIENDSHIPS
 

CREATE TABLE Achievement (
    achievement_id SERIAL PRIMARY KEY,
    badge_name VARCHAR(100) NOT NULL UNIQUE,
    criteria_description TEXT NOT NULL
);

CREATE TABLE MemberAchievement (
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    earned_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    CONSTRAINT fk_member_achievement_member
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_member_achievement_achievement
        FOREIGN KEY (achievement_id)
        REFERENCES Achievement(achievement_id)
        ON DELETE CASCADE
);

CREATE TABLE ActivityFeed (
    feed_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    feed_type VARCHAR(30) NOT NULL
        CHECK (
            feed_type IN (
                'WorkoutCompleted', 'StepGoalReached', 'AchievementEarned', 
                'PlanCompleted', 'MembershipRankUp', 'Streak'
            )
        ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_feed_member
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE
);

CREATE TABLE FeedReaction (
    user_id INT NOT NULL,
    feed_id INT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL
        CHECK (
            reaction_type IN ('Like', 'Fire', 'Clap', 'Flex')
        ),
    reacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, feed_id),
    CONSTRAINT fk_feed_reaction_member
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_feed_reaction_feed
        FOREIGN KEY (feed_id)
        REFERENCES ActivityFeed(feed_id)
        ON DELETE CASCADE
);

CREATE TABLE Friendship (
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (
            status IN ('Pending', 'Accepted', 'Blocked')
        ),
    since_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT fk_friendship_user
        FOREIGN KEY (user_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_friendship_friend
        FOREIGN KEY (friend_id)
        REFERENCES Member(user_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_no_self_friendship
        CHECK (user_id <> friend_id)
);

 
-- 7. PERFORMANCE & UNIQUENESS INDEXES
 

CREATE INDEX idx_country_region ON Country(region_id);
CREATE INDEX idx_address_country ON Address(country_id);
CREATE INDEX idx_notification_user_date ON Notification(user_id, created_at DESC);
CREATE INDEX idx_workout_entry_user_date ON WorkoutEntry(user_id, logged_at DESC);
CREATE INDEX idx_workout_entry_exercise ON WorkoutEntry(exercise_id);
CREATE INDEX idx_step_entry_user_date ON StepEntry(user_id, logged_at DESC);
CREATE INDEX idx_hydration_entry_user_date ON HydrationEntry(user_id, logged_at DESC);
CREATE INDEX idx_member_workout_plan_plan ON MemberWorkoutPlan(plan_id);
CREATE INDEX idx_member_achievement_achievement ON MemberAchievement(achievement_id);
CREATE INDEX idx_activity_feed_user_date ON ActivityFeed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_created ON ActivityFeed(created_at DESC);
CREATE INDEX idx_feed_reaction_feed ON FeedReaction(feed_id);
CREATE INDEX idx_friendship_friend ON Friendship(friend_id);

CREATE UNIQUE INDEX uq_friendship_unordered_pair
ON Friendship (
    LEAST(user_id, friend_id),
    GREATEST(user_id, friend_id)
);

 