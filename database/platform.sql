-- Additive platform extension. Safe to re-run on an existing FitKit database.
ALTER TABLE Exercise ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE Exercise ADD COLUMN IF NOT EXISTS movement_pattern VARCHAR(80);
ALTER TABLE Exercise ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE Exercise ADD COLUMN IF NOT EXISTS optional_equipment TEXT;
ALTER TABLE Exercise ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(20) NOT NULL DEFAULT 'reps';
ALTER TABLE Exercise ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE Exercise ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS TrainingProgramme (
    programme_id SERIAL PRIMARY KEY,
    legacy_plan_id INT UNIQUE REFERENCES WorkoutPlan(plan_id) ON DELETE SET NULL,
    admin_id INT NOT NULL REFERENCES Admin(user_id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover_url TEXT,
    goal VARCHAR(60) NOT NULL DEFAULT 'general fitness',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
    duration_weeks INT NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
    days_per_week INT NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
    session_minutes INT NOT NULL DEFAULT 45 CHECK (session_minutes BETWEEN 5 AND 300),
    environment VARCHAR(20) NOT NULL DEFAULT 'hybrid' CHECK (environment IN ('gym','home','outdoor','hybrid')),
    equipment TEXT NOT NULL DEFAULT '',
    audience TEXT NOT NULL DEFAULT '',
    prerequisites TEXT NOT NULL DEFAULT '',
    restrictions TEXT NOT NULL DEFAULT '',
    target_muscles TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted')),
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ProgrammeVersion (
    version_id SERIAL PRIMARY KEY,
    programme_id INT NOT NULL REFERENCES TrainingProgramme(programme_id) ON DELETE CASCADE,
    version_number INT NOT NULL CHECK (version_number > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details_snapshot JSONB,
    UNIQUE (programme_id, version_number)
);
ALTER TABLE ProgrammeVersion ADD COLUMN IF NOT EXISTS details_snapshot JSONB;

CREATE TABLE IF NOT EXISTS ProgrammeWeek (
    week_id SERIAL PRIMARY KEY,
    version_id INT NOT NULL REFERENCES ProgrammeVersion(version_id) ON DELETE CASCADE,
    week_number INT NOT NULL CHECK (week_number > 0),
    title VARCHAR(120) NOT NULL DEFAULT '',
    is_deload BOOLEAN NOT NULL DEFAULT FALSE,
    progression_notes TEXT NOT NULL DEFAULT '',
    UNIQUE (version_id, week_number)
);

CREATE TABLE IF NOT EXISTS ProgrammeDay (
    day_id SERIAL PRIMARY KEY,
    week_id INT NOT NULL REFERENCES ProgrammeWeek(week_id) ON DELETE CASCADE,
    day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    day_type VARCHAR(20) NOT NULL DEFAULT 'Training' CHECK (day_type IN ('Training','Rest')),
    title VARCHAR(120) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE (week_id, day_number)
);

CREATE TABLE IF NOT EXISTS WorkoutSession (
    session_id SERIAL PRIMARY KEY,
    day_id INT NOT NULL UNIQUE REFERENCES ProgrammeDay(day_id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    estimated_minutes INT NOT NULL CHECK (estimated_minutes BETWEEN 5 AND 300)
);

CREATE TABLE IF NOT EXISTS ExercisePrescription (
    prescription_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES WorkoutSession(session_id) ON DELETE CASCADE,
    exercise_id INT NOT NULL REFERENCES Exercise(exercise_id) ON DELETE RESTRICT,
    position INT NOT NULL CHECK (position > 0),
    sets INT NOT NULL CHECK (sets BETWEEN 1 AND 20),
    tracking_type VARCHAR(20) NOT NULL CHECK (tracking_type IN ('reps','time','distance')),
    rep_min INT,
    rep_max INT,
    target_load_kg NUMERIC(7,2),
    duration_seconds INT,
    distance_meters INT,
    rpe NUMERIC(3,1),
    rest_seconds INT NOT NULL DEFAULT 60 CHECK (rest_seconds BETWEEN 0 AND 1800),
    tempo VARCHAR(30),
    is_warmup BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE (session_id, position),
    CHECK ((tracking_type = 'reps' AND rep_min > 0 AND rep_max >= rep_min)
        OR (tracking_type = 'time' AND duration_seconds > 0)
        OR (tracking_type = 'distance' AND distance_meters > 0))
);

CREATE TABLE IF NOT EXISTS ProgrammeEnrollment (
    enrollment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    version_id INT NOT NULL REFERENCES ProgrammeVersion(version_id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Paused','Completed')),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE (user_id, version_id)
);

CREATE TABLE IF NOT EXISTS WorkoutSessionLog (
    log_id SERIAL PRIMARY KEY,
    enrollment_id INT NOT NULL REFERENCES ProgrammeEnrollment(enrollment_id) ON DELETE CASCADE,
    session_id INT NOT NULL REFERENCES WorkoutSession(session_id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'InProgress' CHECK (status IN ('InProgress','Completed')),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE (enrollment_id, session_id)
);

CREATE TABLE IF NOT EXISTS WorkoutSetLog (
    set_log_id SERIAL PRIMARY KEY,
    log_id INT NOT NULL REFERENCES WorkoutSessionLog(log_id) ON DELETE CASCADE,
    prescription_id INT NOT NULL REFERENCES ExercisePrescription(prescription_id) ON DELETE RESTRICT,
    set_number INT NOT NULL CHECK (set_number > 0),
    actual_reps INT,
    actual_load_kg NUMERIC(7,2),
    duration_seconds INT,
    distance_meters INT,
    rpe NUMERIC(3,1),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (log_id, prescription_id, set_number)
);

CREATE INDEX IF NOT EXISTS idx_programme_admin ON TrainingProgramme(admin_id);
CREATE INDEX IF NOT EXISTS idx_programme_version_status ON ProgrammeVersion(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_session ON ExercisePrescription(session_id, position);
CREATE INDEX IF NOT EXISTS idx_enrollment_user ON ProgrammeEnrollment(user_id, status);
CREATE INDEX IF NOT EXISTS idx_session_log_enrollment ON WorkoutSessionLog(enrollment_id, status);

UPDATE ProgrammeVersion pv SET details_snapshot=to_jsonb(tp)
FROM TrainingProgramme tp WHERE tp.programme_id=pv.programme_id AND pv.status='Published' AND pv.details_snapshot IS NULL;

-- Preserve older plans as one-week-equivalent, explicitly prescribed versions.
INSERT INTO TrainingProgramme
    (legacy_plan_id, admin_id, name, description, goal, difficulty, duration_weeks, days_per_week)
SELECT wp.plan_id, wp.admin_id, wp.title, 'Imported from the original FitKit plan catalogue.',
       CASE wp.goal_category
         WHEN 'Muscle Gain' THEN 'hypertrophy' WHEN 'Strength' THEN 'strength'
         WHEN 'Weight Loss' THEN 'fat loss' WHEN 'Flexibility' THEN 'mobility'
         ELSE 'general fitness' END,
       COALESCE(wp.target_level, 'Beginner'), COALESCE(wp.duration_weeks, 1),
       GREATEST(1, LEAST(7, COALESCE((SELECT MAX(wpe.day_number) FROM WorkoutPlanExercise wpe WHERE wpe.plan_id = wp.plan_id), 1)))
FROM WorkoutPlan wp
WHERE EXISTS (SELECT 1 FROM WorkoutPlanExercise wpe WHERE wpe.plan_id = wp.plan_id)
ON CONFLICT (legacy_plan_id) DO NOTHING;

INSERT INTO ProgrammeVersion (programme_id, version_number, status, published_at)
SELECT programme_id, 1, 'Published', CURRENT_TIMESTAMP
FROM TrainingProgramme WHERE legacy_plan_id IS NOT NULL
ON CONFLICT (programme_id, version_number) DO NOTHING;

INSERT INTO ProgrammeWeek (version_id, week_number, title)
SELECT pv.version_id, weeks.week_number, 'Week ' || weeks.week_number
FROM ProgrammeVersion pv
JOIN TrainingProgramme tp ON tp.programme_id = pv.programme_id AND tp.legacy_plan_id IS NOT NULL
CROSS JOIN LATERAL generate_series(1, tp.duration_weeks) AS weeks(week_number)
WHERE pv.version_number = 1
ON CONFLICT (version_id, week_number) DO NOTHING;

INSERT INTO ProgrammeDay (week_id, day_number, day_type, title)
SELECT pw.week_id, days.day_number,
       CASE WHEN EXISTS (SELECT 1 FROM WorkoutPlanExercise wpe WHERE wpe.plan_id = tp.legacy_plan_id AND wpe.day_number = days.day_number) THEN 'Training' ELSE 'Rest' END,
       'Day ' || days.day_number
FROM ProgrammeWeek pw
JOIN ProgrammeVersion pv ON pv.version_id = pw.version_id
JOIN TrainingProgramme tp ON tp.programme_id = pv.programme_id AND tp.legacy_plan_id IS NOT NULL
CROSS JOIN LATERAL generate_series(1, 7) AS days(day_number)
ON CONFLICT (week_id, day_number) DO NOTHING;

INSERT INTO WorkoutSession (day_id, title, estimated_minutes)
SELECT pd.day_id, tp.name || ' · Day ' || pd.day_number, tp.session_minutes
FROM ProgrammeDay pd
JOIN ProgrammeWeek pw ON pw.week_id = pd.week_id
JOIN ProgrammeVersion pv ON pv.version_id = pw.version_id
JOIN TrainingProgramme tp ON tp.programme_id = pv.programme_id AND tp.legacy_plan_id IS NOT NULL
WHERE pd.day_type = 'Training'
ON CONFLICT (day_id) DO NOTHING;

INSERT INTO ExercisePrescription
    (session_id, exercise_id, position, sets, tracking_type, rep_min, rep_max, duration_seconds, distance_meters, rest_seconds)
SELECT ws.session_id, wpe.exercise_id, wpe.order_seq, 3,
       CASE WHEN ce.exercise_id IS NOT NULL OR fe.exercise_id IS NOT NULL THEN 'time' ELSE 'reps' END,
       CASE WHEN ce.exercise_id IS NULL AND fe.exercise_id IS NULL THEN wpe.target_quantity END,
       CASE WHEN ce.exercise_id IS NULL AND fe.exercise_id IS NULL THEN wpe.target_quantity END,
       CASE WHEN ce.exercise_id IS NOT NULL OR fe.exercise_id IS NOT NULL THEN wpe.target_quantity * 60 END,
       NULL, 60
FROM WorkoutSession ws
JOIN ProgrammeDay pd ON pd.day_id = ws.day_id
JOIN ProgrammeWeek pw ON pw.week_id = pd.week_id
JOIN ProgrammeVersion pv ON pv.version_id = pw.version_id
JOIN TrainingProgramme tp ON tp.programme_id = pv.programme_id AND tp.legacy_plan_id IS NOT NULL
JOIN WorkoutPlanExercise wpe ON wpe.plan_id = tp.legacy_plan_id AND wpe.day_number = pd.day_number
LEFT JOIN CardioExercise ce ON ce.exercise_id = wpe.exercise_id
LEFT JOIN FlexibilityExercise fe ON fe.exercise_id = wpe.exercise_id
ON CONFLICT (session_id, position) DO NOTHING;

UPDATE ProgrammeVersion pv SET details_snapshot=to_jsonb(tp)
FROM TrainingProgramme tp WHERE tp.programme_id=pv.programme_id AND pv.status='Published' AND pv.details_snapshot IS NULL;

-- Social network extension. Health metrics remain exclusively in private user tables.
ALTER TABLE Notification ADD COLUMN IF NOT EXISTS link_path TEXT;

-- Step milestones only enter the public activity feed with explicit consent.
CREATE OR REPLACE FUNCTION trg_fn_check_step_goal()
RETURNS TRIGGER AS $$
DECLARE v_step_goal INT; v_total_steps INT;
BEGIN
  SELECT daily_step_goal INTO v_step_goal FROM Member WHERE user_id=NEW.user_id;
  SELECT COALESCE(SUM(steps_added),0) INTO v_total_steps FROM StepEntry
    WHERE user_id=NEW.user_id AND logged_at::date=NEW.logged_at::date;
  IF v_total_steps>=v_step_goal AND v_total_steps-NEW.steps_added<v_step_goal THEN
    IF NEW.is_public=TRUE THEN
      INSERT INTO ActivityFeed (user_id,message,feed_type,created_at)
      VALUES (NEW.user_id,'Reached the daily target of '||v_step_goal||' steps today!','StepGoalReached',NEW.logged_at);
    END IF;
    INSERT INTO Notification (user_id,title,message,notification_type)
    VALUES (NEW.user_id,'Daily Goal Reached!','Congratulations, you reached your step goal of '||v_step_goal||' steps!','Goal');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS MemberProfile (
    user_id INT PRIMARY KEY REFERENCES Member(user_id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL UNIQUE,
    bio VARCHAR(500) NOT NULL DEFAULT '',
    interests TEXT[] NOT NULL DEFAULT '{}',
    photo_url TEXT,
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    dm_policy VARCHAR(20) NOT NULL DEFAULT 'Friends' CHECK (dm_policy IN ('Friends','Everyone','None')),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
UPDATE users u SET profile_photo_url=mp.photo_url FROM MemberProfile mp
WHERE mp.user_id=u.user_id AND u.profile_photo_url IS NULL AND mp.photo_url IS NOT NULL;
CREATE TABLE IF NOT EXISTS MediaAsset (
    media_id BIGSERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    purpose VARCHAR(10) NOT NULL CHECK (purpose IN ('Avatar','Post','Programme','Exercise')),
    mime_type VARCHAR(20) NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/gif')),
    content BYTEA NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE MediaAsset DROP CONSTRAINT IF EXISTS mediaasset_owner_id_fkey;
ALTER TABLE MediaAsset ADD CONSTRAINT mediaasset_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE MediaAsset DROP CONSTRAINT IF EXISTS mediaasset_purpose_check;
ALTER TABLE MediaAsset ADD CONSTRAINT mediaasset_purpose_check CHECK (purpose IN ('Avatar','Post','Programme','Exercise'));
CREATE INDEX IF NOT EXISTS idx_media_owner ON MediaAsset(owner_id,created_at DESC);
INSERT INTO MemberProfile (user_id, username)
SELECT user_id, 'member' || user_id FROM Member
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS UserBlock (
    blocker_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    blocked_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS FollowRelationship (
    follower_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    followed_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Requested','Accepted')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
);
CREATE INDEX IF NOT EXISTS idx_follow_target ON FollowRelationship(followed_id, status);

CREATE TABLE IF NOT EXISTS FriendRequest (
    requester_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    recipient_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending','Accepted','Rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (requester_id, recipient_id),
    CHECK (requester_id <> recipient_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_pair ON FriendRequest(LEAST(requester_id,recipient_id), GREATEST(requester_id,recipient_id));
CREATE INDEX IF NOT EXISTS idx_friend_recipient ON FriendRequest(recipient_id,status);
INSERT INTO FriendRequest (requester_id,recipient_id,status)
SELECT DISTINCT ON (LEAST(user_id,friend_id),GREATEST(user_id,friend_id))
       user_id,friend_id,status
FROM Friendship
WHERE status IN ('Pending','Accepted')
ORDER BY LEAST(user_id,friend_id),GREATEST(user_id,friend_id), (status='Accepted') DESC
ON CONFLICT DO NOTHING;
INSERT INTO UserBlock (blocker_id,blocked_id)
SELECT user_id,friend_id FROM Friendship WHERE status='Blocked'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS SocialPost (
    post_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    image_url TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'Private' CHECK (visibility IN ('Public','Followers','Friends','Private')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
-- Reuse the existing Fire/Flex/Clap reaction table for community posts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedreaction_user_feed_unique ON FeedReaction(user_id,feed_id);
ALTER TABLE FeedReaction DROP CONSTRAINT IF EXISTS feedreaction_pkey;
ALTER TABLE FeedReaction ALTER COLUMN feed_id DROP NOT NULL;
ALTER TABLE FeedReaction ADD COLUMN IF NOT EXISTS post_id INT REFERENCES SocialPost(post_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedreaction_user_post_unique ON FeedReaction(user_id,post_id);
CREATE INDEX IF NOT EXISTS idx_feedreaction_post ON FeedReaction(post_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feedreaction_one_target') THEN
    ALTER TABLE FeedReaction ADD CONSTRAINT feedreaction_one_target CHECK ((feed_id IS NULL) <> (post_id IS NULL));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_post_date ON SocialPost(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_user ON SocialPost(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS PostLike (
    post_id INT NOT NULL REFERENCES SocialPost(post_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id,user_id)
);
CREATE TABLE IF NOT EXISTS PostComment (
    comment_id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES SocialPost(post_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    body VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comment_post ON PostComment(post_id,created_at);

CREATE TABLE IF NOT EXISTS DirectMessage (
    message_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    recipient_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    body VARCHAR(4000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_message_sender_date ON DirectMessage(sender_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_recipient_date ON DirectMessage(recipient_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ContentReport (
    report_id SERIAL PRIMARY KEY,
    reporter_id INT NOT NULL REFERENCES Member(user_id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('Member','Post','Comment','Message')),
    target_id INT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Resolved','Dismissed')),
    reviewer_id INT REFERENCES Admin(user_id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_status ON ContentReport(status,created_at DESC);
CREATE TABLE IF NOT EXISTS ModerationAction (
    action_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES Admin(user_id) ON DELETE RESTRICT,
    report_id INT REFERENCES ContentReport(report_id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Clearly fictional, repeatable community demo accounts and posts.
INSERT INTO users (name,email,password_hash,gender,birth_date,height_cm,weight_kg,fitness_level,primary_goal)
SELECT demo.name,demo.email,seed.password_hash,demo.gender,demo.birth_date::date,demo.height_cm,demo.weight_kg,demo.fitness_level,demo.primary_goal
FROM users seed CROSS JOIN (VALUES
  ('Demo Coach','coach.demo@fitkit.test','Female','1994-04-12',168,64,'Advanced','Strength'),
  ('Demo Runner','runner.demo@fitkit.test','Male','1998-07-21',176,72,'Intermediate','Endurance')
) AS demo(name,email,gender,birth_date,height_cm,weight_kg,fitness_level,primary_goal)
WHERE seed.email='member@fitkit.com'
ON CONFLICT (email) DO NOTHING;
INSERT INTO Member (user_id) SELECT user_id FROM users WHERE email IN ('coach.demo@fitkit.test','runner.demo@fitkit.test') ON CONFLICT (user_id) DO NOTHING;
INSERT INTO MemberProfile (user_id,username,bio,interests,is_private,dm_policy)
SELECT user_id,CASE WHEN email='coach.demo@fitkit.test' THEN 'demo_coach' ELSE 'demo_runner' END,
       CASE WHEN email='coach.demo@fitkit.test' THEN 'Fictional coach demo account: building consistent strength.' ELSE 'Fictional runner demo account: tracking steady progress.' END,
       CASE WHEN email='coach.demo@fitkit.test' THEN ARRAY['strength','hypertrophy'] ELSE ARRAY['running','endurance'] END,
       FALSE,'Everyone'
FROM users WHERE email IN ('coach.demo@fitkit.test','runner.demo@fitkit.test')
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO SocialPost (user_id,body,visibility)
SELECT user_id,'Demo post: week one is about controlled technique and repeatable effort.','Public'
FROM users WHERE email='coach.demo@fitkit.test'
  AND NOT EXISTS (SELECT 1 FROM SocialPost p WHERE p.user_id=users.user_id AND p.body LIKE 'Demo post: week one%');
INSERT INTO SocialPost (user_id,body,visibility)
SELECT user_id,'Demo post: an easy run still counts toward a stronger endurance base.','Public'
FROM users WHERE email='runner.demo@fitkit.test'
  AND NOT EXISTS (SELECT 1 FROM SocialPost p WHERE p.user_id=users.user_id AND p.body LIKE 'Demo post: an easy run%');
INSERT INTO FollowRelationship (follower_id,followed_id,status)
SELECT runner.user_id,coach.user_id,'Accepted'
FROM users runner CROSS JOIN users coach
WHERE runner.email='runner.demo@fitkit.test' AND coach.email='coach.demo@fitkit.test'
ON CONFLICT DO NOTHING;
INSERT INTO FriendRequest (requester_id,recipient_id,status)
SELECT coach.user_id,runner.user_id,'Accepted'
FROM users coach CROSS JOIN users runner
WHERE coach.email='coach.demo@fitkit.test' AND runner.email='runner.demo@fitkit.test'
ON CONFLICT DO NOTHING;

-- A two-week, three-day programme with explicit per-week progression.
INSERT INTO TrainingProgramme (admin_id,name,description,goal,difficulty,duration_weeks,days_per_week,session_minutes,environment,equipment,audience,target_muscles,tags)
SELECT a.user_id,'Foundation Strength: Two-Week Progression',
       'A fictional demo programme with three full-body sessions each week and a modest second-week progression.',
       'strength','Beginner',2,3,40,'home','Exercise mat; optional dumbbells','New lifters',ARRAY['Chest','Legs','Core'],ARRAY['demo','full-body']
FROM users a WHERE a.email='admin@fitkit.com'
  AND NOT EXISTS (SELECT 1 FROM TrainingProgramme tp WHERE tp.admin_id=a.user_id AND tp.name='Foundation Strength: Two-Week Progression');
INSERT INTO ProgrammeVersion (programme_id,version_number,status,published_at,details_snapshot)
SELECT tp.programme_id,1,'Published',CURRENT_TIMESTAMP,to_jsonb(tp)
FROM TrainingProgramme tp WHERE tp.name='Foundation Strength: Two-Week Progression'
ON CONFLICT (programme_id,version_number) DO NOTHING;
INSERT INTO ProgrammeWeek (version_id,week_number,title,progression_notes)
SELECT pv.version_id,n.week_number,'Week '||n.week_number,
       CASE WHEN n.week_number=1 THEN 'Learn the movement patterns.' ELSE 'Add two reps to each working set where technique allows.' END
FROM ProgrammeVersion pv JOIN TrainingProgramme tp ON tp.programme_id=pv.programme_id
CROSS JOIN (VALUES (1),(2)) n(week_number)
WHERE tp.name='Foundation Strength: Two-Week Progression' AND pv.version_number=1
ON CONFLICT (version_id,week_number) DO NOTHING;
INSERT INTO ProgrammeDay (week_id,day_number,day_type,title)
SELECT pw.week_id,n.day_number,CASE WHEN n.day_number IN (1,3,5) THEN 'Training' ELSE 'Rest' END,
       CASE WHEN n.day_number IN (1,3,5) THEN 'Full Body '||n.day_number ELSE 'Recovery' END
FROM ProgrammeWeek pw JOIN ProgrammeVersion pv ON pv.version_id=pw.version_id
JOIN TrainingProgramme tp ON tp.programme_id=pv.programme_id
CROSS JOIN generate_series(1,7) n(day_number)
WHERE tp.name='Foundation Strength: Two-Week Progression' AND pv.version_number=1
ON CONFLICT (week_id,day_number) DO NOTHING;
INSERT INTO WorkoutSession (day_id,title,estimated_minutes)
SELECT pd.day_id,'Full Body Session '||pd.day_number,40
FROM ProgrammeDay pd JOIN ProgrammeWeek pw ON pw.week_id=pd.week_id
JOIN ProgrammeVersion pv ON pv.version_id=pw.version_id JOIN TrainingProgramme tp ON tp.programme_id=pv.programme_id
WHERE tp.name='Foundation Strength: Two-Week Progression' AND pd.day_type='Training'
ON CONFLICT (day_id) DO NOTHING;
INSERT INTO ExercisePrescription (session_id,exercise_id,position,sets,tracking_type,rep_min,rep_max,rest_seconds,notes)
SELECT ws.session_id,e.exercise_id,exercise.position,3,'reps',
       CASE WHEN pw.week_number=1 THEN exercise.reps ELSE exercise.reps+2 END,
       CASE WHEN pw.week_number=1 THEN exercise.reps+2 ELSE exercise.reps+4 END,
       75,exercise.note
FROM WorkoutSession ws JOIN ProgrammeDay pd ON pd.day_id=ws.day_id
JOIN ProgrammeWeek pw ON pw.week_id=pd.week_id JOIN ProgrammeVersion pv ON pv.version_id=pw.version_id
JOIN TrainingProgramme tp ON tp.programme_id=pv.programme_id
CROSS JOIN (VALUES (1,'Push-Up','Push-ups',8,'Maintain a straight body line.'),(2,'Bodyweight Squat','Squats',10,'Control the descent and drive through the feet.')) exercise(position,fresh_name,legacy_name,reps,note)
JOIN Exercise e ON e.name=exercise.fresh_name OR (e.name=exercise.legacy_name AND NOT EXISTS (SELECT 1 FROM Exercise newer WHERE newer.name=exercise.fresh_name))
WHERE tp.name='Foundation Strength: Two-Week Progression' AND pd.day_type='Training'
ON CONFLICT (session_id,position) DO NOTHING;
