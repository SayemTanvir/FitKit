# FitKit Presentation Flow

## 1. Introduce FitKit
- Fitness platform for members and administrators.
- Main areas: training, activity tracking, analytics and community.

## 2. Show the architecture
- React frontend sends requests to the Express API; the API reads and writes PostgreSQL data.
- Point out the main entities and relationships in the database schema.

## 3. Demonstrate authentication
- Registration and login use FitKit's own password and JWT handling.
- Protected API requests verify the token and current account role; public login and registration are exceptions.
- Show the difference between Member and Admin access.

## 4. Prepare training content as Admin
- Add or manage exercises in the exercise library.
- Build a multiweek programme, publish a version, and show archive or version history.
- Briefly show workout plan management as the legacy plan workflow.

## 5. Follow a Member workout
- Register a member or sign in with a demo member account; show profile and fitness goals.
- Browse programmes, enroll, start a session, record sets, and finish the workout.
- Also show a workout plan and member activity logging for workouts, steps and hydration.
- Registration uses a database procedure for related account records and an explicit transaction in the backend.

## 6. Show database automation
- Workout and step triggers calculate calories when entries are saved.
- A public workout can create a feed item; reaching the step goal can create a feed item and notification.
- Explain how the trigger keeps related database effects consistent with the activity entry.

## 7. Show analytics and SQL features
- Dashboard: daily activity totals, goals and progress history.
- Complex query examples: daily totals across activity tables; an opt-in ranked leaderboard aggregated from public logs; the exercise catalogue joined to its exercise subtypes.
- Database functions: calculated water goal and membership rank.
- Point to the SQL views, functions and query examples used for these results.

## 8. Show community and administration
- Member discovery, profiles, follows, friendships, posts, comments, reactions and messages.
- Show privacy controls, blocking, reports and notifications.
- Finish with the Admin moderation queue, account suspension and overview.

## 9. Close with checklist coverage
- Custom authentication: login and registration.
- Authentication checks: protected API requests and role-restricted actions.
- Explicit transactions and procedure: multi-record member registration; show commit and rollback handling.
- Triggers: calculated activity data and automatic feed/notification updates.
- Functions: water goal and membership rank calculations.
- Complex queries: show at least three examples from the analytics and catalogue section.
- Appropriate database features: connect each trigger, function, procedure and query to the task it supports.
- Code understanding: be ready to trace one frontend action through its API route to the database and response.

## Transaction Note
Explicit `BEGIN`, `COMMIT` and `ROLLBACK` handling is present in registration and selected multi-step write workflows. Some single-statement writes use direct database queries, so verify all DML paths before claiming that every write is explicitly wrapped in a transaction.
