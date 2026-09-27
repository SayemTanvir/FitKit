-- Expanded exercise library and ready-to-use published programmes.
-- Safe to apply repeatedly to both fresh and existing databases.

INSERT INTO Exercise (
    name, target_muscle_group, calorie_factor, difficulty_level, instructions,
    description, movement_pattern, secondary_muscles, optional_equipment,
    tracking_type, is_active
) VALUES
    ('Incline Push-Up','Chest',0.28,'Beginner','Place hands on a stable raised surface. Keep the body straight and lower the chest with control.','A scalable push-up variation for building pressing strength.','Horizontal push',ARRAY['Triceps','Shoulders','Core'],'Bench or sturdy box','reps',TRUE),
    ('Bench Press','Chest',0.48,'Intermediate','Keep feet planted and shoulder blades set. Lower the bar to mid-chest and press without bouncing.','A compound barbell press for upper-body strength and muscle.','Horizontal push',ARRAY['Triceps','Shoulders'],'Barbell and bench','reps',TRUE),
    ('Dumbbell Row','Back',0.42,'Beginner','Brace the torso, pull the dumbbell toward the hip, and lower it without rotating.','A unilateral pull that develops the back and improves side-to-side balance.','Horizontal pull',ARRAY['Biceps','Rear Delts','Core'],'Bench','reps',TRUE),
    ('Goblet Squat','Quads',0.46,'Beginner','Hold the weight close to the chest, sit between the hips, and keep the knees tracking over the toes.','An accessible loaded squat for leg strength and movement quality.','Squat',ARRAY['Glutes','Core','Adductors'],'Dumbbell or kettlebell','reps',TRUE),
    ('Romanian Deadlift','Hamstrings',0.50,'Intermediate','Soften the knees, push the hips back, keep the spine neutral, and stand by driving the hips forward.','A hip hinge focused on hamstrings and glutes.','Hinge',ARRAY['Glutes','Back','Core'],'Barbell or dumbbells','reps',TRUE),
    ('Walking Lunge','Quads',0.44,'Intermediate','Step far enough to lower both knees comfortably, drive through the front foot, and alternate sides.','A unilateral leg exercise that challenges strength and balance.','Lunge',ARRAY['Glutes','Hamstrings','Core'],'Dumbbells','reps',TRUE),
    ('Overhead Press','Shoulders',0.45,'Intermediate','Brace the trunk, press overhead without leaning back, and finish with the arms beside the ears.','A vertical press for shoulder and triceps strength.','Vertical push',ARRAY['Triceps','Upper Chest','Core'],'Barbell or dumbbells','reps',TRUE),
    ('Lat Pulldown','Back',0.40,'Beginner','Pull the bar toward the upper chest while keeping the ribs down; return with control.','A vertical pulling exercise that builds the lats and upper back.','Vertical pull',ARRAY['Biceps','Rear Delts'],'Cable machine','reps',TRUE),
    ('Plank','Core',0.20,'Beginner','Keep the body in a straight line, squeeze the glutes, and breathe without letting the hips sag.','An isometric core exercise for trunk stability.','Anti-extension',ARRAY['Shoulders','Glutes'],NULL,'time',TRUE),
    ('Glute Bridge','Glutes',0.25,'Beginner','Drive through the heels, lift the hips, pause with the glutes tight, and avoid overextending the back.','A floor-based hip extension exercise for glute activation and strength.','Hinge',ARRAY['Hamstrings','Core'],'Resistance band','reps',TRUE),
    ('Kettlebell Swing','Glutes',0.68,'Advanced','Hinge to load the hips, snap them forward, and let the bell float without lifting with the arms.','An explosive hinge for power and conditioning.','Hinge',ARRAY['Hamstrings','Core','Back'],'Kettlebell','reps',TRUE),
    ('Dead Bug','Core',0.18,'Beginner','Press the lower back gently into the floor and extend opposite arm and leg without losing position.','A controlled core drill that teaches trunk stability.','Anti-extension',ARRAY['Hip Flexors'],NULL,'reps',TRUE),
    ('Standing Calf Raise','Calves',0.22,'Beginner','Rise onto the balls of the feet, pause at the top, and lower through a full comfortable range.','A simple lower-leg strengthening movement.','Ankle extension',ARRAY['Soleus'],'Step or dumbbells','reps',TRUE),
    ('Biceps Curl','Biceps',0.24,'Beginner','Keep elbows close to the torso, curl without swinging, and lower fully under control.','An isolation exercise for elbow-flexor strength and muscle.','Elbow flexion',ARRAY['Forearms'],'Dumbbells or cable','reps',TRUE),
    ('Brisk Walking','Cardio',0.55,'Beginner','Walk tall at a purposeful pace that raises breathing while allowing short conversation.','Low-impact aerobic conditioning suitable for most fitness levels.','Locomotion',ARRAY['Calves','Glutes'],NULL,'distance',TRUE),
    ('Cycling','Cardio',0.78,'Beginner','Set the seat for a slight knee bend, maintain a smooth cadence, and increase resistance gradually.','Low-impact aerobic training on a stationary or outdoor bicycle.','Cycling',ARRAY['Quads','Glutes','Calves'],'Bicycle or stationary bike','distance',TRUE),
    ('Jump Rope','Cardio',0.90,'Intermediate','Keep jumps low, land softly, and turn the rope mainly with the wrists.','A compact, high-energy conditioning exercise.','Locomotion',ARRAY['Calves','Shoulders','Core'],'Jump rope','time',TRUE),
    ('Rowing','Cardio',0.88,'Intermediate','Drive with the legs, then lean slightly and pull; reverse that order during recovery.','Full-body aerobic work performed on a rowing machine.','Rowing',ARRAY['Back','Quads','Glutes'],'Rowing machine','distance',TRUE),
    ('Mountain Climbers','Cardio',0.82,'Intermediate','Hold a strong plank and alternate driving the knees forward without bouncing the hips.','A bodyweight conditioning drill combining core control and rapid leg action.','Locomotion',ARRAY['Core','Shoulders','Hip Flexors'],NULL,'time',TRUE),
    ('High Knees','Cardio',0.84,'Intermediate','Run in place with quick contacts, lift the knees comfortably, and keep the torso tall.','A running drill for cardiovascular fitness and coordination.','Locomotion',ARRAY['Hip Flexors','Calves','Core'],NULL,'time',TRUE),
    ('Cat-Cow','Spine',0.08,'Beginner','Move slowly between spinal flexion and extension while matching the motion to relaxed breathing.','A gentle mobility drill for the spine and torso.','Spinal mobility',ARRAY['Core'],NULL,'time',TRUE),
    ('Hip Flexor Stretch','Hip Flexors',0.07,'Beginner','Use a half-kneeling stance, tuck the pelvis slightly, and shift forward without arching the back.','A static stretch for the front of the hip.','Hip mobility',ARRAY['Quads'],'Exercise mat','time',TRUE),
    ('Child''s Pose','Back',0.06,'Beginner','Sit the hips toward the heels, reach forward, and breathe into the back and sides of the ribs.','A restorative position for gentle back, hip, and shoulder mobility.','Spinal mobility',ARRAY['Shoulders','Hips'],'Exercise mat','time',TRUE),
    ('Cross-Body Shoulder Stretch','Shoulders',0.06,'Beginner','Draw one arm across the chest and support it above the elbow without twisting the torso.','A simple static stretch for the rear shoulder.','Shoulder mobility',ARRAY['Upper Back'],NULL,'time',TRUE),
    ('World''s Greatest Stretch','Full Body',0.12,'Intermediate','Step into a long lunge, place one hand down, rotate the other arm upward, then switch sides.','A dynamic mobility sequence for hips, upper back, and shoulders.','Full-body mobility',ARRAY['Hip Flexors','Hamstrings','Shoulders'],'Exercise mat','time',TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO StrengthExercise (exercise_id, equipment_needed)
SELECT exercise_id, CASE name
    WHEN 'Incline Push-Up' THEN 'Bench or sturdy box' WHEN 'Bench Press' THEN 'Barbell and bench'
    WHEN 'Dumbbell Row' THEN 'Dumbbell' WHEN 'Goblet Squat' THEN 'Dumbbell or kettlebell'
    WHEN 'Romanian Deadlift' THEN 'Barbell or dumbbells' WHEN 'Walking Lunge' THEN 'Bodyweight or dumbbells'
    WHEN 'Overhead Press' THEN 'Barbell or dumbbells' WHEN 'Lat Pulldown' THEN 'Cable machine'
    WHEN 'Kettlebell Swing' THEN 'Kettlebell' WHEN 'Biceps Curl' THEN 'Dumbbells or cable'
    ELSE 'Bodyweight' END
FROM Exercise
WHERE name IN ('Incline Push-Up','Bench Press','Dumbbell Row','Goblet Squat','Romanian Deadlift','Walking Lunge','Overhead Press','Lat Pulldown','Plank','Glute Bridge','Kettlebell Swing','Dead Bug','Standing Calf Raise','Biceps Curl')
ON CONFLICT (exercise_id) DO NOTHING;

INSERT INTO CardioExercise (exercise_id, mets_score)
SELECT exercise_id, CASE name WHEN 'Brisk Walking' THEN 4.3 WHEN 'Cycling' THEN 7.5
    WHEN 'Jump Rope' THEN 10.0 WHEN 'Rowing' THEN 8.0 WHEN 'Mountain Climbers' THEN 8.5 ELSE 8.0 END
FROM Exercise
WHERE name IN ('Brisk Walking','Cycling','Jump Rope','Rowing','Mountain Climbers','High Knees')
ON CONFLICT (exercise_id) DO NOTHING;

INSERT INTO FlexibilityExercise (exercise_id, hold_type)
SELECT exercise_id, CASE WHEN name IN ('Cat-Cow','World''s Greatest Stretch') THEN 'Dynamic' ELSE 'Static' END
FROM Exercise
WHERE name IN ('Cat-Cow','Hip Flexor Stretch','Child''s Pose','Cross-Body Shoulder Stretch','World''s Greatest Stretch')
ON CONFLICT (exercise_id) DO NOTHING;

INSERT INTO TrainingProgramme (
    admin_id, name, description, goal, difficulty, duration_weeks, days_per_week,
    session_minutes, environment, equipment, audience, prerequisites, restrictions,
    target_muscles, tags, visibility
)
SELECT admin.user_id, seed.name, seed.description, seed.goal, seed.difficulty,
       seed.duration_weeks, seed.days_per_week, seed.session_minutes, seed.environment,
       seed.equipment, seed.audience, seed.prerequisites, seed.restrictions,
       seed.target_muscles, seed.tags, 'public'
FROM (SELECT user_id FROM Admin WHERE is_active=TRUE ORDER BY user_id LIMIT 1) admin
CROSS JOIN (VALUES
    ('Beginner Home Kickstart','Build a sustainable fitness routine with simple full-body sessions requiring minimal equipment.','general fitness','Beginner',4,3,35,'home','Exercise mat; one pair of dumbbells','New or returning exercisers','No prior training experience required.','Use incline push-ups when floor push-ups are not comfortable.',ARRAY['Full Body','Core'],ARRAY['beginner','home','full-body']),
    ('Strength Essentials','Develop confident technique and foundational strength across the main movement patterns.','strength','Intermediate',6,3,50,'gym','Dumbbells, barbell, bench, cable machine','Members ready for structured resistance training','Comfort with basic squats, hinges, pushes, and pulls.','Choose loads that leave two good repetitions in reserve.',ARRAY['Quads','Hamstrings','Chest','Back','Shoulders'],ARRAY['strength','gym','progressive']),
    ('Lean and Condition','Combine resistance circuits and focused cardio intervals to improve work capacity and support fat loss.','fat loss','Intermediate',6,4,40,'hybrid','Kettlebell, jump rope, exercise mat','Members seeking energetic mixed-modality training','Able to exercise continuously for at least 20 minutes.','Replace jumping with brisk walking when low impact is needed.',ARRAY['Full Body','Cardio','Core'],ARRAY['conditioning','fat-loss','circuits']),
    ('Mobility Reset','Restore comfortable movement with short sessions for the hips, spine, shoulders, and trunk.','mobility','Beginner',4,5,25,'home','Exercise mat','Desk workers, beginners, and recovery-focused members','None. Move only through comfortable ranges.','Do not force stretches or work through sharp pain.',ARRAY['Hips','Spine','Shoulders','Core'],ARRAY['mobility','recovery','low-impact']),
    ('Hypertrophy Builder','Accumulate progressive weekly volume across the major muscle groups with repeatable gym sessions.','hypertrophy','Advanced',8,4,60,'gym','Barbell, dumbbells, bench, cable machine','Experienced lifters focused on muscle gain','At least six months of consistent resistance training.','Manage loads carefully and stop sets when technique changes.',ARRAY['Chest','Back','Shoulders','Hamstrings','Arms'],ARRAY['hypertrophy','gym','volume']),
    ('Outdoor Endurance Base','Build an aerobic foundation through measured walking, running, cycling, and rowing efforts.','endurance','Intermediate',6,4,45,'outdoor','Comfortable shoes; bicycle or rowing machine optional','Members preparing for longer cardio efforts','Able to walk briskly for 30 minutes.','Increase distance gradually and account for weather conditions.',ARRAY['Cardio','Quads','Glutes','Calves'],ARRAY['endurance','outdoor','aerobic']),
    ('Athletic Performance Lab','Improve power, coordination, unilateral strength, and repeat-effort conditioning.','athletic conditioning','Advanced',8,4,55,'hybrid','Kettlebell, jump rope, dumbbells','Experienced members seeking athletic conditioning','Strong command of lunges, hinges, and plank positions.','Prioritize crisp movement; extend rest when power drops.',ARRAY['Full Body','Glutes','Core','Cardio'],ARRAY['athletic','power','conditioning'])
) AS seed(name,description,goal,difficulty,duration_weeks,days_per_week,session_minutes,environment,equipment,audience,prerequisites,restrictions,target_muscles,tags)
WHERE NOT EXISTS (SELECT 1 FROM TrainingProgramme existing WHERE existing.name=seed.name)
ORDER BY admin.user_id
ON CONFLICT DO NOTHING;

INSERT INTO ProgrammeVersion (programme_id, version_number, status, published_at, details_snapshot)
SELECT programme_id, 1, 'Published', CURRENT_TIMESTAMP, to_jsonb(programme)
FROM TrainingProgramme programme
WHERE programme.name IN ('Beginner Home Kickstart','Strength Essentials','Lean and Condition','Mobility Reset','Hypertrophy Builder','Outdoor Endurance Base','Athletic Performance Lab')
ON CONFLICT (programme_id,version_number) DO NOTHING;

INSERT INTO ProgrammeWeek (version_id, week_number, title, progression_notes, is_deload)
SELECT version.version_id, week_no, 'Week ' || week_no,
       CASE WHEN week_no=1 THEN 'Learn the sessions and finish every set with confident technique.'
            WHEN week_no=programme.duration_weeks THEN 'Consolidate progress with controlled, high-quality work.'
            ELSE 'Add a small amount of volume, time, distance, or load where form allows.' END,
       programme.duration_weeks >= 8 AND week_no=programme.duration_weeks
FROM ProgrammeVersion version
JOIN TrainingProgramme programme ON programme.programme_id=version.programme_id
CROSS JOIN LATERAL generate_series(1,programme.duration_weeks) week_no
WHERE programme.name IN ('Beginner Home Kickstart','Strength Essentials','Lean and Condition','Mobility Reset','Hypertrophy Builder','Outdoor Endurance Base','Athletic Performance Lab')
  AND version.version_number=1
ON CONFLICT (version_id,week_number) DO NOTHING;

INSERT INTO ProgrammeDay (week_id, day_number, day_type, title, notes)
SELECT week.week_id, day_no,
       CASE WHEN day_no = ANY(CASE programme.days_per_week
            WHEN 3 THEN ARRAY[1,3,5] WHEN 4 THEN ARRAY[1,2,4,6] ELSE ARRAY[1,2,3,5,6] END)
            THEN 'Training' ELSE 'Rest' END,
       CASE WHEN day_no = ANY(CASE programme.days_per_week
            WHEN 3 THEN ARRAY[1,3,5] WHEN 4 THEN ARRAY[1,2,4,6] ELSE ARRAY[1,2,3,5,6] END)
            THEN programme.name || ' - Session ' || day_no ELSE 'Recovery' END,
       CASE WHEN day_no = ANY(CASE programme.days_per_week
            WHEN 3 THEN ARRAY[1,3,5] WHEN 4 THEN ARRAY[1,2,4,6] ELSE ARRAY[1,2,3,5,6] END)
            THEN 'Warm up gradually and record each completed set.' ELSE 'Rest, walk lightly, and prioritize hydration and sleep.' END
FROM ProgrammeWeek week
JOIN ProgrammeVersion version ON version.version_id=week.version_id
JOIN TrainingProgramme programme ON programme.programme_id=version.programme_id
CROSS JOIN generate_series(1,7) day_no
WHERE programme.name IN ('Beginner Home Kickstart','Strength Essentials','Lean and Condition','Mobility Reset','Hypertrophy Builder','Outdoor Endurance Base','Athletic Performance Lab')
  AND version.version_number=1
ON CONFLICT (week_id,day_number) DO NOTHING;

INSERT INTO WorkoutSession (day_id,title,estimated_minutes)
SELECT day.day_id, day.title, programme.session_minutes
FROM ProgrammeDay day
JOIN ProgrammeWeek week ON week.week_id=day.week_id
JOIN ProgrammeVersion version ON version.version_id=week.version_id
JOIN TrainingProgramme programme ON programme.programme_id=version.programme_id
WHERE day.day_type='Training'
  AND programme.name IN ('Beginner Home Kickstart','Strength Essentials','Lean and Condition','Mobility Reset','Hypertrophy Builder','Outdoor Endurance Base','Athletic Performance Lab')
  AND version.version_number=1
ON CONFLICT (day_id) DO NOTHING;

WITH prescription_map(goal,position,exercise_name,tracking_type) AS (VALUES
    ('general fitness',1,'Goblet Squat','reps'),('general fitness',2,'Incline Push-Up','reps'),('general fitness',3,'Dumbbell Row','reps'),('general fitness',4,'Plank','time'),
    ('strength',1,'Goblet Squat','reps'),('strength',2,'Romanian Deadlift','reps'),('strength',3,'Overhead Press','reps'),('strength',4,'Dumbbell Row','reps'),
    ('fat loss',1,'Jump Rope','time'),('fat loss',2,'Mountain Climbers','time'),('fat loss',3,'Kettlebell Swing','reps'),('fat loss',4,'Walking Lunge','reps'),
    ('mobility',1,'Cat-Cow','time'),('mobility',2,'Hip Flexor Stretch','time'),('mobility',3,'Child''s Pose','time'),('mobility',4,'Cross-Body Shoulder Stretch','time'),
    ('hypertrophy',1,'Bench Press','reps'),('hypertrophy',2,'Lat Pulldown','reps'),('hypertrophy',3,'Romanian Deadlift','reps'),('hypertrophy',4,'Biceps Curl','reps'),
    ('endurance',1,'Brisk Walking','distance'),('endurance',2,'Cycling','distance'),('endurance',3,'Rowing','distance'),('endurance',4,'High Knees','time'),
    ('athletic conditioning',1,'Kettlebell Swing','reps'),('athletic conditioning',2,'Jump Rope','time'),('athletic conditioning',3,'Walking Lunge','reps'),('athletic conditioning',4,'Mountain Climbers','time')
)
INSERT INTO ExercisePrescription (
    session_id,exercise_id,position,sets,tracking_type,rep_min,rep_max,
    duration_seconds,distance_meters,rpe,rest_seconds,notes
)
SELECT session.session_id, exercise.exercise_id, mapping.position,
       CASE WHEN programme.goal='mobility' THEN 2 ELSE 3 END,
       mapping.tracking_type,
       CASE WHEN mapping.tracking_type='reps' THEN 8 + LEAST(4,week.week_number) END,
       CASE WHEN mapping.tracking_type='reps' THEN 10 + LEAST(4,week.week_number) END,
       CASE WHEN mapping.tracking_type='time' THEN 25 + week.week_number*5 END,
       CASE WHEN mapping.tracking_type='distance' THEN 750 + week.week_number*250 END,
       CASE WHEN programme.difficulty='Beginner' THEN 6.0 WHEN programme.difficulty='Intermediate' THEN 7.0 ELSE 8.0 END,
       CASE WHEN programme.goal='mobility' THEN 30 WHEN programme.goal IN ('strength','hypertrophy') THEN 90 ELSE 60 END,
       'Use controlled technique and adjust the target when needed to maintain good form.'
FROM WorkoutSession session
JOIN ProgrammeDay day ON day.day_id=session.day_id
JOIN ProgrammeWeek week ON week.week_id=day.week_id
JOIN ProgrammeVersion version ON version.version_id=week.version_id
JOIN TrainingProgramme programme ON programme.programme_id=version.programme_id
JOIN prescription_map mapping ON mapping.goal=programme.goal
JOIN Exercise exercise ON exercise.name=mapping.exercise_name
WHERE programme.name IN ('Beginner Home Kickstart','Strength Essentials','Lean and Condition','Mobility Reset','Hypertrophy Builder','Outdoor Endurance Base','Athletic Performance Lab')
  AND version.version_number=1
ON CONFLICT (session_id,position) DO NOTHING;

