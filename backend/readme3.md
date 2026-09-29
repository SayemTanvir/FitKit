# FitKit CSE216 Checklist Implementation Guide

This guide explains how FitKit implements checklist items 1 through 8. It is intended for project evaluation and viva preparation: each section identifies the relevant files, explains the execution flow, and gives a concrete example. Checklist item 9 is intentionally omitted.

## Coverage Summary

| Item | Requirement | Status | Main implementation |
|---:|---|---|---|
| 1 | User Authentication | Implemented | Express authentication routes, bcrypt password hashing, JWT creation |
| 2 | Authentication Validation on Every Page | Implemented | React route guards and Express JWT middleware |
| 3 | Explicit Transaction Control | Partially implemented | Correct in multi-step workflows, but not yet present around every DML path |
| 4 | Use of Triggers | Implemented | Five PostgreSQL triggers for validation, calculation, feed publishing, and notification |
| 5 | Use of Functions | Implemented with integration duplication | Rank, water-goal, validation, and trigger functions |
| 6 | Use of Procedures | Implemented | `register_member` performs multi-table registration |
| 7 | Use of Complex Queries | Implemented | Leaderboard, analytics, social feed, programme catalogue, and admin statistics |
| 8 | Appropriate Use of Database Features | Mostly satisfied | Database features are matched to relevant data and workflow responsibilities |

## 1 User Authentication

FitKit implements its own JWT-based authentication. It does not use an external authentication service such as Firebase Auth or Auth0. Libraries such as `bcrypt` and `jsonwebtoken` are used by FitKit's own backend code.

### Registration flow

The registration request begins at `POST /api/auth/register` in [`routes/auth.routes.ts`](routes/auth.routes.ts). The route validates:

- name and email;
- password length;
- birth date and minimum age;
- gender and fitness level; and
- positive height and weight values.

The route calls `registerMemberService()` in [`services/auth.service.ts`](services/auth.service.ts). The service hashes the password before sending it to PostgreSQL:

```ts
const saltRounds = 10;
const passwordHash = await bcrypt.hash(data.password, saltRounds);
```

Only the bcrypt hash is stored in `users.password_hash`, which is defined in [`../database/schema.sql`](../database/schema.sql). The plain-text password is not written to the database.

After registration succeeds, the backend creates a signed JWT:

```ts
const token = jwt.sign(
  { userId: newUser.user_id, role: 'Member' },
  jwtSecret(),
  { expiresIn: '1d' }
);
```

### Login flow

`POST /api/auth/login` normalizes the email and calls `loginUserService()`. The service retrieves the stored password hash and resolves the user's role by joining the `Admin` and `Member` tables.

The submitted password is verified with:

```ts
const isMatch = await bcrypt.compare(password, user.password_hash);
```

If the password matches, FitKit signs a token containing the database user ID and current role:

```ts
const token = jwt.sign(
  { userId: user.user_id, role: user.role },
  jwtSecret(),
  { expiresIn: '24h' }
);
```

`JWT_SECRET` is loaded from the environment. [`server.ts`](server.ts) refuses to start when the secret is missing or still contains the placeholder value from `.env.example`.

### Frontend handling

[`../src/pages/Login.tsx`](../src/pages/Login.tsx) calls the login or registration API, saves the returned token and user information, and redirects to the dashboard:

```ts
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
navigate('/dashboard', { replace: true });
```

JWT data is encoded and signed, not encrypted. Therefore, the payload contains only the user ID and role, never a password or sensitive profile data.

## 2 Authentication Validation on Every Page

FitKit protects authenticated functionality at both the frontend and backend. The backend check is authoritative because a browser-side route guard can be bypassed by sending an HTTP request directly.

### Frontend page guard

[`../src/App.tsx`](../src/App.tsx) defines `RequireAuth`:

```tsx
function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
```

Dashboard, activity, workout, social, programme, community, profile, settings, messaging, notification, and administration pages are nested under this guard. Public landing, login, and signup pages are intentional exceptions.

`RequireRole` adds client-side Member or Admin restrictions for pages such as programme building and administration.

### Token sent with requests

[`../src/services/api.ts`](../src/services/api.ts) reads the stored token and builds the request header:

```ts
Authorization: `Bearer ${token}`
```

For example:

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Backend verification

[`middleware/auth.middleware.ts`](middleware/auth.middleware.ts) provides `verifyToken`. Before a protected request reaches its handler, the middleware:

1. requires a Bearer token;
2. verifies its signature and expiration using `JWT_SECRET`;
3. requires `userId` and `role` in the payload;
4. checks that the account and role still exist in the database;
5. rejects suspended accounts; and
6. stores the authenticated identity in `req.user`.

Typical failure responses are:

```json
{ "error": "Access token required." }
```

```json
{ "error": "Invalid or expired session token." }
```

```json
{ "error": "Account suspended." }
```

Some routers attach `verifyToken` to each endpoint. The community and programme routers call `router.use(verifyToken)`, which protects every route declared after it. Administrative endpoints additionally call `requireRole('Admin')`.

When the shared frontend request helper receives `401`, it clears the saved token and user and redirects to `/login`.

## 3 Explicit Transaction Control

FitKit correctly uses explicit transactions in important multi-step operations, but it does not yet use `BEGIN`, `COMMIT`, and `ROLLBACK` around every DML path. Under the checklist's strict wording, this item is only partially complete.

### Correct registration transaction

[`services/auth.service.ts`](services/auth.service.ts) acquires one connection and runs registration as a transaction:

```ts
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await client.query('CALL register_member(...)', values);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

If any part of member registration fails, none of its related table changes are retained.

### Other explicit transaction examples

Explicit transaction handling is also present in:

- admin promotion in [`routes/admin.routes.ts`](routes/admin.routes.ts);
- member blocking, content reports, moderation, and suspension in [`routes/community.routes.ts`](routes/community.routes.ts);
- exercise creation, update, and deletion in [`routes/exercise.routes.ts`](routes/exercise.routes.ts);
- step and hydration logging in [`routes/log.routes.ts`](routes/log.routes.ts); and
- programme creation, versioning, structure editing, and deletion in [`routes/programme.routes.ts`](routes/programme.routes.ts).

### Example of missing explicit control

`updateUserProfileService()` in [`services/auth.service.ts`](services/auth.service.ts) performs separate updates to `users` and `Member` through the shared `query()` helper:

```ts
await query('UPDATE users SET ...');
await query('UPDATE Member SET ...');
```

If the first statement succeeds and the second fails, the first statement has already been committed by PostgreSQL's autocommit behavior. This workflow should acquire one client and wrap both statements in an explicit transaction.

Other representative uncovered writes include profile-photo changes, reactions, follows, posts, comments, notifications, workout-plan writes, programme enrollment, set logging, activity deletion, and admin demotion.

PostgreSQL makes each standalone statement atomic, but that is implicit autocommit rather than the explicit transaction control requested by the checklist. Do not claim that every DML operation is explicitly controlled until these paths have been updated.

## 4 Use of Triggers

FitKit defines five meaningful triggers in [`../database/triggers.sql`](../database/triggers.sql). They are loaded by [`../database/setup.sql`](../database/setup.sql).

### User age validation

```sql
CREATE TRIGGER trg_validate_user_age
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_user_age();
```

The trigger rejects a user younger than 16 even if application-level validation is bypassed.

### Workout calorie calculation

`trg_calc_workout_calories` runs before a `WorkoutEntry` is inserted. It loads the user's weight and the exercise's calorie factor, then calculates:

```text
quantity x calorie factor x (weight / 70)
```

For a 70 kg member performing a quantity of 30 with a factor of `0.35`, the trigger stores `10.50` calories.

### Step calorie calculation

`trg_calc_step_calories` runs before a `StepEntry` is inserted and calculates:

```text
steps x 0.04 x (weight / 70)
```

A 70 kg member logging 1,000 steps receives a calculated value of 40 calories.

### Public workout feed entry

`trg_publish_workout_feed` runs after a workout is inserted. When `is_public` is true, it adds an `ActivityFeed` record describing the exercise, quantity, and calculated calories.

Because this trigger runs after the calculation trigger, it can use the final `NEW.calories_burned` value.

### Step-goal milestone

`trg_check_step_goal` totals the member's steps for the entry date. It acts only when the new entry crosses the configured daily target.

For example, if the previous total was 8,500, the goal was 10,000, and the new entry added 2,000 steps, the trigger detects the new total of 10,500. It creates a private notification and, when the entry is public, a public activity-feed milestone.

[`../database/platform.sql`](../database/platform.sql) contains the final privacy-aware definition of this function.

## 5 Use of Functions

FitKit defines scalar functions in [`../database/functions.sql`](../database/functions.sql), in addition to functions used by triggers.

### Membership rank

`get_membership_rank(p_user_id)` calculates account tenure and returns the highest matching rank from `MembershipRank`.

The configured thresholds are:

| Rank | Minimum account age |
|---|---:|
| Bronze | 0 years |
| Silver | 1 year |
| Gold | 3 years |
| Platinum | 5 years |
| Diamond | 10 years |

Example:

```sql
SELECT get_membership_rank(12);
```

A four-year-old account returns `Gold`.

### Dynamic water goal

`calculate_water_goal(p_user_id)` loads the member's age, height, and weight and returns:

```text
(weight x 35) + ((height - 170) x 5) - ((age - 30) x 5)
```

It enforces a minimum of 1,000 mL. For a 25-year-old member who weighs 70 kg and is 175 cm tall, the result is 2,500 mL.

[`../database/queries.sql`](../database/queries.sql) demonstrates both scalar functions across real user records.

### Trigger functions

The database also uses functions that return `TRIGGER`, including:

- `validate_user_age`;
- `trg_fn_calc_workout_calories`;
- `trg_fn_calc_step_calories`;
- `trg_fn_publish_workout_feed`; and
- `trg_fn_check_step_goal`.

### Integration caveat

The live backend duplicates the membership-rank calculation in [`services/auth.service.ts`](services/auth.service.ts) and the water formula in [`routes/log.routes.ts`](routes/log.routes.ts). Calling the stored functions directly from those queries would provide a stronger demonstration and one source of truth.

## 6 Use of Procedures

[`../database/procedures.sql`](../database/procedures.sql) defines `register_member`, a stored procedure for the multi-table registration workflow.

Its inputs include the member's account fields, profile measurements, fitness settings, hashed password, and daily step goal. Its `INOUT p_user_id` parameter returns the generated identifier.

The procedure performs:

```sql
INSERT INTO users (...)
RETURNING user_id INTO p_user_id;

INSERT INTO Member (user_id, daily_step_goal)
VALUES (p_user_id, p_daily_step_goal);

INSERT INTO MemberProfile (user_id, username)
VALUES (p_user_id, 'member' || p_user_id);
```

For a generated `user_id` of 42, the procedure creates the base user, the member-role row, and the default `member42` community profile.

[`services/auth.service.ts`](services/auth.service.ts) calls it as:

```sql
CALL register_member($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL)
```

The procedure is appropriate because these dependent inserts form one logical workflow. The backend surrounds the call with an explicit transaction so a failure rolls back every record.

## 7 Use of Complex Queries

FitKit uses more than the required three complex queries in live application features.

### Filterable leaderboard

[`routes/social.routes.ts`](routes/social.routes.ts) implements the leaderboard using:

- joins between `Member`, `users`, `MemberProfile`, and `Country`;
- lateral aggregates over `StepEntry` and `WorkoutEntry`;
- `SUM()` and `COUNT()`;
- common table expressions;
- `CASE` for the selected metric;
- `EXISTS` for friend-scope filtering; and
- `DENSE_RANK()` for positions.

The query supports steps, calories, or workouts over today, week, month, or all time. It also supports fitness-level, country, and friend filters. [`../src/pages/LeaderboardPage.tsx`](../src/pages/LeaderboardPage.tsx) displays the result.

### Weekly progress analytics

[`routes/log.routes.ts`](routes/log.routes.ts) uses `generate_series()` to create one row for each requested date. Lateral aggregate queries then combine:

- step totals and calories;
- hydration totals;
- manual workout totals; and
- completed programme-session totals.

`COALESCE()` converts missing activity into zero, so inactive dates still appear in the chart. The dashboard requests this query through [`../src/pages/Dashboard.tsx`](../src/pages/Dashboard.tsx).

### Social activity feed

The feed query in [`routes/social.routes.ts`](routes/social.routes.ts) joins `ActivityFeed`, `users`, `MemberProfile`, and `FeedReaction`. It also checks `UserBlock` and `FriendRequest` through subqueries.

Filtered aggregates produce independent Fire, Flex, and Clap totals:

```sql
COUNT(fr.user_id) FILTER (WHERE fr.reaction_type = 'Fire')
```

It also finds the requesting member's reaction and uses a timestamp-and-ID cursor for stable pagination.

### Other qualifying queries

Additional examples include:

- daily dashboard aggregation in [`routes/log.routes.ts`](routes/log.routes.ts);
- programme version selection and enrollment counts in [`routes/programme.routes.ts`](routes/programme.routes.ts);
- administrator overview counts in [`routes/admin.routes.ts`](routes/admin.routes.ts); and
- role resolution and stored-function demonstrations in [`../database/queries.sql`](../database/queries.sql).

## 8 Appropriate Use of Database Features

FitKit generally assigns database features to suitable responsibilities.

### Why each feature is appropriate

| Feature | FitKit use | Why it belongs there |
|---|---|---|
| Trigger | Minimum-age validation | Protects the invariant regardless of which client writes the user row |
| Trigger | Calorie calculations | Keeps derived values consistent for every inserted activity |
| Trigger | Feed and milestone events | Automatically couples an activity change to its dependent database effects |
| Function | Rank and water calculations | Returns reusable values computed from database records |
| Procedure | Member registration | Coordinates one multi-table workflow with a returned generated ID |
| View | Daily summary, leaderboard, exercise catalogue | Provides reusable read-only representations of relational data |
| Complex API query | Filterable analytics and leaderboard | Supports parameters and filters that vary with each HTTP request |

The step-goal trigger in [`../database/platform.sql`](../database/platform.sql) is also privacy-aware: it creates a public feed item only when the step entry is public, while still sending the member a private goal notification.

### Duplication to clean up

There are three notable sources of duplication:

1. The backend reimplements membership-rank logic instead of calling `get_membership_rank()`.
2. The backend reimplements the water-goal formula instead of calling `calculate_water_goal()`.
3. `trg_fn_check_step_goal()` is first defined in `triggers.sql` and later replaced in `platform.sql`.

The setup order in [`../database/setup.sql`](../database/setup.sql) means that the privacy-aware `platform.sql` function body is the final active version. This works, but maintaining one definition in `triggers.sql` would be clearer.

The basic `view_global_leaderboard` and advanced API leaderboard also overlap, but this distinction is defensible: the view demonstrates a reusable global ranking, while the API query supports dynamic filters that a fixed view cannot accept.

## Evaluation Summary

FitKit has strong implementations for custom authentication, request validation, triggers, stored functions, a registration procedure, and complex runtime queries. Its database features correspond to genuine application requirements rather than artificial examples.

The main checklist risk is explicit transaction control: several multi-step workflows are protected correctly, but not every DML path currently issues explicit `BEGIN`, `COMMIT`, and `ROLLBACK`. The secondary improvement is consolidating duplicated stored-function logic so the live backend calls the database functions directly.
