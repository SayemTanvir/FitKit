# FitKit Backend and Database Viva Guide

This guide explains the backend and database as implemented in this repository. It deliberately ignores frontend presentation. Line numbers refer to the current files and may shift after edits.

## 1. The shortest correct explanation of the system

FitKit is a three-tier application. The React client sends HTTP requests to an Express 5 API. The API authenticates users with signed JSON Web Tokens (JWTs), validates input, applies authorization rules, and executes parameterized PostgreSQL queries through a connection pool. PostgreSQL is responsible for durable data, relational integrity, calculated values, and some automatic side effects through constraints, procedures, functions, views, and triggers.

The backend is not an ORM application. SQL is written explicitly inside route/service files. This makes the joins, transactions, access filters, and database features visible and explainable.

Request flow:

```text
HTTP request
  -> CORS and JSON middleware
  -> mounted Express router
  -> verifyToken middleware
  -> optional requireRole middleware
  -> route validation
  -> parameterized SQL through pg Pool
  -> PostgreSQL constraints/functions/triggers
  -> JSON HTTP response
```

The principal layers are:

- `backend/server.ts`: application composition and route mounting.
- `backend/db/index.ts`: environment loading and PostgreSQL connection pool.
- `backend/middleware/auth.middleware.ts`: authentication, current account-state verification, and role authorization.
- `backend/services`: reusable authentication and reaction business logic.
- `backend/controllers`: the exercise read controller.
- `backend/routes`: HTTP contracts, validation, authorization, transactions, and SQL.
- `database/schema.sql`: original normalized relational schema.
- `database/platform.sql`: additive programme/community platform extension and legacy-data conversion.
- `database/functions.sql`, `procedures.sql`, `triggers.sql`, `views.sql`: database-side programming.

## 2. Technology choices and how to defend them

| Choice | Where | Why it is used | Trade-off |
|---|---|---|---|
| Express 5 | `backend/server.ts` | Small routing layer, middleware composition, native async-handler rejection support | Route files can grow large without stricter layering |
| PostgreSQL | all SQL files | Strong constraints, joins, transactions, JSONB, arrays, window functions, lateral joins, triggers | PostgreSQL-specific SQL reduces database portability |
| `pg` Pool | `backend/db/index.ts` | Reuses connections instead of opening one per request | Transactions must use one checked-out client, not the global helper |
| JWT | auth middleware/service | Stateless signed session identity containing user ID and role | Revocation is not immediate unless database state is checked; this project checks it with a 15-second cache |
| bcrypt, cost 10 | auth service | Salted, adaptive one-way password hashing | Increasing cost improves resistance but increases login/registration CPU time |
| Raw SQL | route/service files | Exact control over joins, CTEs, locking, constraints, and PostgreSQL features | More repetition and greater need for careful review |
| Database triggers | activity tables | Guarantees derived calories/feed events regardless of which API inserts the row | Hidden side effects must be documented and tested |
| Versioned programmes | platform schema | Published content remains stable while a new draft is edited | More tables and more complex queries |

## 3. Startup and request lifecycle, line by line

### `backend/server.ts`

- Lines 1-11 import Express, CORS, every router, and the database query helper. Imports do not start requests; they make modules available when Node loads the server.
- Line 13 creates the Express application.
- Lines 15-17 fail fast if `JWT_SECRET` is absent or still has the example prefix. This avoids starting an insecure server.
- Line 19 reads comma-separated allowed origins, trims them, and configures CORS. CORS is a browser rule; it is not authentication.
- Line 20 installs the JSON body parser. The community image route later installs a route-specific raw parser for image MIME types; `express.json()` does not consume those image bodies.
- Lines 22-29 implement `GET /api/health`. `SELECT 1` proves the API can reach the database. HTTP 200 means connected; 503 means the dependency is unavailable.
- Lines 31-47 mount routers. A path inside a router is appended to its mount prefix; for example `/login` in `auth.routes.ts` becomes `/api/auth/login`.
- Lines 49-53 are the final 404 middleware. It must be after all routers or it would intercept valid requests.
- Lines 55-58 choose port 5000 unless overridden and begin listening.

Important viva distinction: a 404 means no route matched (or a route intentionally hides a private resource); a 401 means authentication is missing/invalid; a 403 means identity is known but permission is insufficient; a 409 means the request conflicts with current data/state; a 500 means an unexpected server failure.

### `backend/db/index.ts`

- Lines 1-4 import `pg`, dotenv, and ESM path utilities.
- Lines 6-8 recreate `__filename` and `__dirname`, which CommonJS provides automatically but ES modules do not.
- Lines 10-13 try multiple `.env` locations. Existing variables are not overridden by default, so the first loaded definition normally wins.
- Lines 15-21 make host/name/user/password mandatory and fail early with a clear error.
- Lines 23-24 set Node's process timezone to UTC.
- Lines 26-36 configure the pool. Port defaults to 5432. `options: -c timezone=UTC` also configures each PostgreSQL connection. SSL is enabled only when `DB_SSL=true`; `rejectUnauthorized:false` is convenient for the hosted database but weakens certificate verification.
- Lines 38-41 treat an unexpected error on an idle pooled connection as fatal. Exiting lets a process manager restart a potentially unhealthy instance.
- Lines 43-48 expose a typed convenience wrapper for one-statement queries.
- Line 50 exports the pool for checked-out transaction clients.

Critical rule: use `query(...)` for independent statements. Use `const client = await pool.connect()` plus `BEGIN/COMMIT/ROLLBACK` when several statements must be atomic, because all transaction statements must run on the same connection.

Timezone viva answer: the current runtime standardizes the API and DB sessions on UTC, even though `APP_TIME_ZONE` exists in `.env.example`. `scripts/migrate.mjs` instead uses `APP_TIME_ZONE` (default Asia/Dhaka), so the configuration is inconsistent and should be unified.

## 4. Authentication and authorization

### Registration (`auth.routes.ts` lines 18-85; `auth.service.ts` lines 37-87)

1. The route normalizes email with trim + lowercase and checks a basic email pattern.
2. It validates a real ISO date and calculates whether the user is at least 16.
3. It restricts gender and fitness level to accepted domain values and requires positive height/weight.
4. The service hashes the password with bcrypt and cost factor 10. The plaintext password is never inserted.
5. It checks out one database client and starts a transaction.
6. `CALL register_member(...)` inserts the supertype `users`, subtype `Member`, and one-to-one `MemberProfile` rows.
7. The procedure returns the new ID through its `INOUT p_user_id` parameter.
8. The service selects the user, commits, releases the client, signs a one-day JWT, and returns user + token.
9. On any failure it rolls back. SQLSTATE `23505` is translated to HTTP 409 for duplicate email.

Why both API and DB validation? API validation gives friendly, early errors. Database constraints/triggers protect integrity even if another program writes directly or an API bug bypasses validation. This is defense in depth.

### Login (`auth.service.ts` lines 89-154)

- The query resolves role using `CASE`: active `Admin` wins, otherwise `Member`.
- `LEFT JOIN` is required because a user may not have both subtype rows.
- `COALESCE(mp.photo_url,u.profile_photo_url)` selects the preferred profile image.
- A correlated subquery returns the most recently started active legacy plan.
- `LOWER(email)=LOWER($1)` makes lookup case-insensitive.
- `bcrypt.compare` hashes/checks the submitted password against the stored hash.
- The JWT payload is only `{userId, role}` and expires after 24 hours. Password hashes and private profile data are never placed in the token.
- Returning the same 401 message for unknown email and wrong password reduces account enumeration.

### Token verification (`auth.middleware.ts` lines 5-57)

- `AuthRequest` extends Express `Request` with an optional typed `user` field.
- The middleware expects `Authorization: Bearer <token>` and takes the second space-separated component.
- `jwt.verify` verifies signature and expiry. Decoding alone would not prove authenticity.
- The payload must include user ID and role.
- The database is queried for current active role and suspension state. This prevents a structurally valid old token from continuing indefinitely after role/account changes.
- Results are cached by user ID for 15 seconds to reduce one database read per request.
- Role mismatch returns 401; suspension returns 403; success attaches `req.user` then calls `next()`.
- Admin promotion/removal and suspension call `clearAccountStateCache`, so changes made by this process become effective immediately.

The remaining limitation is multi-instance cache invalidation: another server process would retain its cached state for at most 15 seconds.

### Role authorization (`auth.middleware.ts` lines 59-69)

`requireRole('Admin')` accepts only admins. `requireRole('Member')` accepts members **and admins**. That is intentional because platform setup also creates a `Member` subtype row for active admins, allowing an admin to demonstrate member workflows. Authentication answers “who are you?” Authorization answers “may this identity perform this operation?”

## 5. Relational model and cardinalities

### Original/core schema

| Relationship | Cardinality and implementation | Delete behavior |
|---|---|---|
| Region -> Country | one-to-many; `Country.region_id` FK | deleting region cascades countries |
| Country -> Address | one-to-many | cascade |
| Country -> users | one-to-many, optional user country | set user country to null |
| Address -> users | one-to-many, optional | set user address to null |
| users -> Admin | one-to-zero/one subtype; shared PK/FK | cascade |
| users -> Member | one-to-zero/one subtype; shared PK/FK | cascade |
| Admin -> WorkoutPlan | one-to-many | restrict; curator cannot disappear while plans reference it |
| WorkoutPlan <-> Exercise | many-to-many through `WorkoutPlanExercise` | plan/exercise deletion cascades join rows |
| Member <-> WorkoutPlan | many-to-many through `MemberWorkoutPlan` | cascades with either parent |
| Member -> Workout/Step/HydrationEntry | one-to-many | cascade when member is deleted |
| Exercise -> WorkoutEntry | one-to-many | restrict to preserve historical meaning |
| Member <-> Achievement | many-to-many through `MemberAchievement` | cascade |
| Member -> ActivityFeed | one-to-many | cascade |
| Member <-> ActivityFeed | reactions through `FeedReaction` | cascade |
| Member <-> Member | self-referencing relationship | old `Friendship` bridge table |

### Programme extension

```text
TrainingProgramme 1--N ProgrammeVersion 1--N ProgrammeWeek 1--N ProgrammeDay
ProgrammeDay 1--0..1 WorkoutSession 1--N ExercisePrescription N--1 Exercise
Member 1--N ProgrammeEnrollment N--1 ProgrammeVersion
ProgrammeEnrollment 1--N WorkoutSessionLog 1--N WorkoutSetLog
WorkoutSetLog N--1 ExercisePrescription
```

Why so many tables? They remove repeating groups and give each concept one responsibility. Weeks, days, sessions, prescriptions, enrollments, session attempts, and actual sets have different keys and lifecycles. Packing them into one table would create duplication, update anomalies, many nullable columns, and poor constraints.

Versioning reason: an enrollment references a specific `ProgrammeVersion`, not merely `TrainingProgramme`. Existing members therefore keep the exact prescription they enrolled in even after an admin publishes a new version. `ON DELETE RESTRICT` on version/session references further protects history.

### Community extension

- `MemberProfile` is a one-to-one extension of `Member` for public/community fields.
- `UserBlock(blocker_id, blocked_id)` is directional and forbids self-blocking.
- `FollowRelationship(follower_id, followed_id)` is directional, with Requested/Accepted state.
- `FriendRequest` is logically undirected after acceptance. A functional unique index on `LEAST(id), GREATEST(id)` prevents both A->B and B->A rows.
- `SocialPost` supports soft deletion through `deleted_at` so moderation/history can retain the row.
- `PostComment` also uses soft deletion.
- `DirectMessage` records sender, recipient, body, sent time, and read time.
- `ContentReport` is a polymorphic association (`target_type`, `target_id`). PostgreSQL cannot enforce one normal FK to four different target tables, so the application must validate it.
- `ModerationAction` is an audit trail of admin decisions.
- `MediaAsset` stores image bytes in `BYTEA`; ownership, purpose, MIME type, and access are checked by API logic.

## 6. Keys, constraints, and normalization

### Key types

- Surrogate keys: generated IDs such as `user_id`, `exercise_id`, and `programme_id`. They are stable and compact for joins.
- Natural keys: `Country.country_id` uses a two-character code; email and exercise name are unique alternate keys.
- Composite keys: bridge tables use the participating foreign keys, for example `(user_id, achievement_id)`.
- Functional uniqueness: unordered friendships use `LEAST`/`GREATEST`.

### Integrity constraints

- `NOT NULL` requires a value.
- `CHECK` enforces domains and ranges close to the data.
- `UNIQUE` prevents duplicate business identities or ordering positions.
- `FOREIGN KEY` prevents orphan references.
- `ON DELETE CASCADE` removes dependent rows whose meaning cannot survive their owner.
- `ON DELETE RESTRICT` protects historical/business records.
- `ON DELETE SET NULL` preserves the row while removing an optional association.

### Normal forms

The core is broadly in third normal form:

- 1NF: scalar columns, no repeating exercise columns; arrays are intentionally used only for small multi-valued metadata such as tags/secondary muscles.
- 2NF: bridge-table attributes depend on their full composite key. For example a plan exercise's quantity depends on plan + exercise + day.
- 3NF: region, country, address, member role, exercise subtype, and programme structure are separated so non-key facts do not generally depend on other non-key facts.

Defensible denormalizations:

- `ProgrammeVersion.details_snapshot JSONB` freezes programme header details at publish time.
- `ActivityFeed.message` stores a ready-to-display historical sentence.
- arrays for tags/interests/muscles simplify metadata filtering and avoid excessive bridge tables for this project scale.

## 7. Database-side programming

### Functions (`database/functions.sql`)

`validate_user_age()` is a trigger function. It uses `NEW.birth_date`, raises an exception for age below 16, and returns `NEW` so the row operation can continue.

`get_membership_rank(user_id)` joins account tenure to all qualifying ranks, orders highest minimum tenure first, and takes one. `SELECT ... INTO` assigns a local PL/pgSQL variable. It raises an exception if no rank/user resolves.

`calculate_water_goal(user_id)` selects age/height/weight into variables, applies the documented formula, clamps the result to at least 1000 mL with procedural logic, rounds it, and returns an integer.

Function vs procedure: a function returns a value and can appear in `SELECT`; a procedure is invoked with `CALL` and is used here for a multi-table operation.

### Registration procedure (`database/procedures.sql`)

`register_member` accepts profile inputs plus an `INOUT` ID. It inserts `users`, captures the generated ID with `RETURNING ... INTO`, then inserts matching `Member` and `MemberProfile` subtype rows. The API wraps the call in a transaction, so partial registration cannot persist.

### Triggers (`database/triggers.sql`)

- Age trigger: `BEFORE INSERT OR UPDATE` on each user row, because invalid data must be rejected before storage.
- Workout calories: `BEFORE INSERT`; it reads current user weight and exercise factor, writes `NEW.calories_burned`, then the final row is inserted.
- Step calories: also `BEFORE INSERT`, scaled from 0.04 kcal/step at 70 kg.
- Public workout feed: `AFTER INSERT`; it needs the final calculated calories from the earlier BEFORE trigger and inserts a feed event only for public logs.
- Step-goal trigger: `AFTER INSERT`; the new step is already included in `SUM`. The crossing test `total >= goal AND total - new_steps < goal` fires once when crossing, not on every later step entry. `platform.sql` replaces this function so the feed event requires `is_public`, while the private notification is always created.

Trigger order insight: workout calorie calculation must happen before insertion, while feed publication must happen after it, otherwise the feed message may see null/unfinalized calories.

### Views (`database/views.sql`)

- `view_daily_member_summary`: builds the set of activity dates per user, then uses lateral aggregate subqueries for steps, workouts, and hydration. `COALESCE` converts missing aggregates from null to zero.
- `view_global_leaderboard`: aggregates public steps and uses the window function `RANK()` without collapsing the result further.
- `view_exercise_catalog`: reconstructs the supertype/subtype hierarchy and derives category using subtype existence.

A view stores a query definition, not ordinary copied data. These are regular views, not materialized views, so results are current but computation happens when queried.

## 8. SQL features used in the backend

- Parameter placeholders `$1`, `$2`, etc. keep values separate from SQL text and prevent SQL injection.
- `COALESCE(a,b)` returns the first non-null value.
- `CASE` implements conditional projection/filter logic.
- `FILTER (WHERE ...)` computes several conditional aggregates in one scan.
- `RETURNING` avoids a second query after INSERT/UPDATE/DELETE.
- `ON CONFLICT ... DO UPDATE` implements upsert behavior.
- CTEs (`WITH`) express multi-stage, sometimes data-modifying operations.
- `JOIN LATERAL` lets a subquery reference the current row on its left.
- `generate_series` creates missing calendar days or prescribed set numbers.
- JSON functions aggregate flat relational rows into API-friendly nested objects.
- `jsonb_array_elements` turns submitted programme JSON into relational rows.
- `WITH ORDINALITY` supplies exercise position while expanding a JSON array.
- Window functions `RANK`/`DENSE_RANK` calculate rankings without reducing rows.
- `FOR UPDATE` locks selected rows until transaction end to serialize conflicting state changes.
- Partial index `... WHERE deleted_at IS NULL` indexes only live posts.
- Expression index on `LEAST/GREATEST` enforces unordered-pair uniqueness.

`RANK` versus `DENSE_RANK`: for scores 100, 100, 90, `RANK` gives 1,1,3 while `DENSE_RANK` gives 1,1,2. The static view uses `RANK`; the filterable API leaderboard uses `DENSE_RANK`.

## 9. Route-by-route backend map

### Auth routes

- `GET /api/auth/countries`: authenticated country lookup.
- `POST /api/auth/register`: validates, hashes, transactionally creates user/member/profile, returns JWT.
- `POST /api/auth/login`: resolves active role, compares bcrypt hash, returns JWT.
- `GET /api/auth/me`: complete own profile and achievement catalogue.
- `PUT/DELETE /api/auth/me/photo`: verifies uploaded-media ownership, synchronizes duplicate photo fields, deletes replaced owned bytes.
- `GET /api/auth/profile/:id`: privacy/block/follow/friend-aware reduced public profile.
- `PUT /api/auth/me`: validates profile/goals/country and updates base + Member records.

### Exercise routes

- Read joins all three subtype tables; inactive exercises are visible only to admins.
- Create/update is transactional because base and subtype rows must change together.
- Updating deletes all old subtype rows then inserts exactly one selected subtype.
- Duplicate names are checked case-insensitively in the API, with SQLSTATE 23505 as a race-safe fallback.
- Permanent deletion first counts dependencies. It refuses deletion when plans, programme prescriptions, or history refer to the exercise. It then deletes an owned media asset in the same transaction.

### Legacy plan routes

- List builds a nested exercise array with `json_agg/json_build_object` and marks the current user's active assignment.
- Create can insert plan + first exercise atomically with data-modifying CTEs.
- Add exercise calculates next order with `MAX(order_seq)+1`, validates day within programme length, and matches exercise subtype to plan goal.
- Remove/update/delete require the plan's `admin_id` to equal the current admin.
- Start uses upsert. Restarting an inactive plan resets start date; selecting an already active plan preserves it.

### Activity log routes

- Summary uses scalar subqueries for today's workouts, steps, hydration, and goals.
- Analytics uses `generate_series` to return zero-filled days, so charts do not omit inactive dates.
- History endpoints always filter by JWT user ID.
- Delete statements include both entry ID and current user ID, preventing insecure direct-object access.
- Step/hydration creation uses a transaction because the log and “logged” notification should succeed or fail together.
- Workout creation relies on database triggers for calories and optional feed publication.

### Social routes

- Leaderboard aggregates only public entries, supports time/level/country/friend filters, chooses a metric with `CASE`, and ranks with `DENSE_RANK`.
- Activity feed uses keyset pagination on `(created_at, feed_id)` instead of offset. The encoded cursor is opaque to the client, and the ID tie-breaker prevents equal timestamps from skipping/duplicating rows.
- Reaction aggregation uses filtered counts. A member has at most one reaction per target; sending the same reaction toggles it off, another type changes it.

### Programme routes

- `router.use(verifyToken)` protects the entire router once.
- Programme detail is read as flat joined rows then assembled into nested weeks/days/exercises in TypeScript.
- New programme creation inserts a draft version and all weeks + seven default rest days transactionally.
- Structure save validates JSON first, locks the draft, deletes the old draft tree (cascade), and bulk-rebuilds it with CTEs and JSONB expansion.
- Publish requires exact duration, seven days per week, exact training-day count, active exercises, and complete prescriptions. It freezes details into `details_snapshot`.
- New-version clones the latest version into a new draft. Published versions are not edited in place.
- Enrollment references the latest published version.
- Session start verifies that the session belongs to the member's active enrollment.
- Set upsert verifies ownership, in-progress state, prescription membership, and set number limit in the SQL itself.
- Finish expands every prescription into required set numbers and refuses completion while any set lacks a completed log.

### Community routes

- The entire router requires a token; member-only middleware is added to mutation/community-member operations.
- Image uploads use a 3 MB raw-body limit, an allowlisted MIME type, magic-byte checks, purpose rules, and ownership.
- Media reads re-check whether the referenced avatar/post/programme/exercise is currently visible.
- Relationship queries account for both directions of friendship and directional following.
- Blocking is transactional and also deletes follows/friendship between the two users.
- Post visibility combines soft deletion, block state, post visibility, follow/friend relations, and profile privacy.
- Post/message lists use ID keyset pagination.
- Soft deletion retains post/comment rows while excluding them from normal reads.
- Direct messages enforce block state and recipient DM policy.
- Notification modifications filter by current user ID.
- Report resolution and moderation action insertion are one transaction.
- Suspension cannot target the current admin or an active admin and immediately clears local authentication cache.

### Admin routes

- Overview uses independent scalar counts to produce a dashboard in one round trip.
- Main-admin authority is stored as `can_manage_admins`; it is re-queried rather than trusted from the token.
- Promotion locks the user row with `FOR UPDATE`, requires a nonsuspended Member, then inserts/reactivates Admin.
- Demotion deactivates rather than deletes Admin history. The Member row remains, so the account falls back to Member on next login.

## 10. Transactions and concurrency examples

Transactions provide atomicity: all included statements commit or none do.

- Registration: user + Member + profile cannot partially exist.
- Exercise save: base row and exactly one subtype stay consistent.
- Programme creation/structure/versioning: a partially generated schedule is never exposed.
- Blocking: block insertion and relationship cleanup happen together.
- Admin promotion: a row lock prevents two concurrent decisions from reading stale state.

Isolation caveat: PostgreSQL's default isolation is Read Committed. Each statement sees committed data at its start. Explicit unique constraints, `FOR UPDATE`, and conflict handling are still needed for races. The reaction toggle performs SELECT then INSERT/DELETE without a transaction, so concurrent identical requests can race; the unique indexes preserve uniqueness, but one request may fail or produce surprising toggle semantics.

## 11. Index strategy

Indexes support frequent access patterns:

- FK indexes speed joins and parent-side checks.
- `(user_id, logged_at DESC)` supports recent per-user history.
- `(status, created_at DESC)` supports moderation queues.
- post/date and message participant/date indexes support feeds/conversations.
- unique indexes enforce business rules as well as improve lookup.

Why not index every column? Each index consumes storage and makes inserts/updates/deletes more expensive. Index columns used in joins, selective filters, ordering, and uniqueness. Verify with `EXPLAIN (ANALYZE, BUFFERS)` rather than guessing.

Note: PostgreSQL does not automatically create indexes on referencing FK columns, so the schema explicitly creates many of them.

## 12. Security model

Strengths:

- bcrypt password hashing; passwords are never stored in plaintext.
- JWT signature/expiry verification plus current DB role/suspension checks.
- Parameterized values throughout normal queries.
- ownership filters are placed in SQL for update/delete/read operations.
- role middleware and a stronger main-admin check.
- image size/type/magic checks and `nosniff`.
- explicit privacy/block/follow/friend logic.
- generic login failure message.
- constraints remain a final defense.

Important nuance: dynamic SQL exists in `reactions.ts` for the column name and exercise subtype deletion for the table name. Those identifiers are not user strings: they come from closed internal values (`feed_id|post_id` and a hard-coded table array), so values remain parameterized and the interpolation is controlled.

## 13. Pre-viva defects and honest answers

These are implementation issues, not concepts to bluff about.

### High priority

1. **Programme archive placeholder bug** — `backend/routes/programme.routes.ts` lines 383-387 uses `$3::boolean` but supplies only two parameters. PostgreSQL will reject the request. It should use `$2::boolean` (or supply a third value).
2. **Reports do not validate target existence/visibility/ownership** — `community.routes.ts` lines 315-334 inserts any type + positive ID. Most seriously, a member can report a guessed message ID they did not send/receive, after which moderation detail exposes it to admins. The report route should validate each target and, for Message, require the reporter to be sender or recipient.
3. **Programme admin ownership is inconsistent** — legacy plans restrict update/delete to `admin_id`, but most programme mutations require only any Admin, not the creating admin. This is acceptable only if admins are intentionally global curators; otherwise add `tp.admin_id = req.user.userId` or an explicit global permission.

### Medium priority/design gaps

4. No custom final error middleware. Express 5 catches rejected async handlers, but uncaught errors use its default response rather than a consistent JSON envelope.
5. In-memory community rate limiting resets on restart and is per process, so it is not sufficient for multi-instance production deployment. Redis or a database-backed limiter would be shared.
6. Deleting a workout/step log does not retract feed/goal artifacts because `ActivityFeed` does not reference the source entry. Historical messages may become stale.
7. `ContentReport(target_type,target_id)` cannot have a normal cross-table FK. Application validation is therefore mandatory and is currently incomplete.
8. `email` has a case-sensitive database UNIQUE constraint, while login is case-insensitive. API registration lowercases email, but a functional unique index on `LOWER(email)` or PostgreSQL `citext` would enforce this for every writer.
9. The migration runner executes three whole files separately without an explicit transaction around all three. A later failure can leave earlier migration work committed. A migration table and per-migration transaction would be safer.
10. Runtime and migration timezones differ: backend pool forces UTC; migration script defaults to `APP_TIME_ZONE`/Asia-Dhaka.
11. Publishing and several programme changes do not consistently verify affected row count after state-dependent updates, so a rare concurrent change could return misleading success.
12. `PostLike` and typed `FeedReaction` are two reaction systems on a post. This may be a product choice (“like” plus emoji), but be prepared to explain why both exist.

Best viva response when shown a defect: identify it directly, state the consequence, propose a precise fix, and mention the test you would add. Do not claim the code is perfect.

## 14. Likely deep viva questions and model answers

### Architecture/authentication

**Why use a pool?** Opening a PostgreSQL TCP/TLS connection per request is expensive. A bounded pool reuses connections and queues when necessary.

**Why not trust the JWT role until expiry?** A user may be promoted, demoted, suspended, or deleted. The middleware compares the signed claim with current database state, cached briefly for performance.

**Why is a JWT signed, not encrypted?** Signing protects integrity/authenticity. JWT payloads are readable, so only minimal non-secret identity claims are included.

**Why return 401 versus 403?** 401 is missing/invalid identity. 403 is an authenticated identity that is not allowed, such as suspended/member-only failure.

**What stops SQL injection?** User values are passed separately through `$n` placeholders. Controlled identifier interpolation never accepts arbitrary user text.

### Database design

**Why model Admin and Member as separate tables?** It is table-per-subtype inheritance. Shared attributes live once in `users`; subtype-specific attributes and relationships live in subtype tables, enforced by PK-as-FK.

**Can one user be both Admin and Member?** Physically yes, and platform setup intentionally creates Member rows for active admins. Effective authentication role prioritizes active Admin. This is an overlapping specialization, not strictly disjoint.

**Why a junction table for plan exercises?** Plans and exercises are many-to-many, and the relationship itself has day, order, and target quantity.

**Why composite primary keys on bridges?** They encode uniqueness of the relationship without an unnecessary surrogate ID.

**Why `RESTRICT` Exercise deletion from history?** A workout or prescription would lose its meaning. The API additionally performs a friendly dependency check.

**Why soft-delete posts but hard-delete step logs?** Moderation/audit context benefits from retaining content rows, while personal telemetry deletion is intended as actual removal. This is a product/data-retention choice.

### SQL/query reasoning

**Why `LEFT JOIN` subtype tables?** The base Exercise exists independently of a particular subtype. An inner join to all three would require an exercise to be all categories and return none.

**Why lateral joins?** Each subquery needs the current outer user/date/post. LATERAL allows that correlated computation while keeping one result row per outer entity.

**Why `COALESCE` aggregates?** `SUM` over no rows is null, but API totals should be numeric zero.

**Why generate a calendar series?** Aggregate tables contain only active days. A chart requires inactive days explicitly represented with zeros.

**Why keyset rather than offset pagination?** It scales better for deep pages and is more stable when new rows arrive. A deterministic tie-breaker avoids equal-time ambiguity.

**Why transaction plus constraints?** Transactions protect multi-step atomicity; constraints protect invariant correctness. Neither replaces the other.

**What does `FOR UPDATE` do?** It locks selected rows so concurrent transactions cannot update/delete them before the current transaction finishes.

### Triggers/functions/procedures

**Why calories in triggers rather than the frontend?** The database becomes the single authoritative calculation path; clients cannot forge the stored value and every writer gets consistent behavior.

**Why is the feed trigger AFTER INSERT?** It needs a successful WorkoutEntry and the calories assigned by the BEFORE trigger.

**How does the step goal avoid duplicate events?** It checks that the new total reaches/exceeds the goal while the previous total (`total-new entry`) was below it.

**What is hidden-side-effect risk?** An INSERT can also create feed/notification rows. Good naming, documentation, and integration tests are needed so developers know this behavior.

### Programme versioning

**Why snapshot details in JSONB if columns already exist?** Columns are the editable current programme metadata. The JSONB snapshot freezes published header values so older versions do not change when the draft metadata changes.

**Why enrollment points to version?** Reproducibility: workout prescriptions for an enrolled member cannot silently change under them.

**How is structure replacement atomic?** The route locks the draft, deletes its old week subtree (cascading descendants), rebuilds from validated JSON, and commits only after every row succeeds.

**Why validate in TypeScript and SQL CHECK constraints?** TypeScript validates nested completeness and provides contextual messages; CHECK/FK/UNIQUE constraints enforce row-level truth for all writers.

## 15. Five end-to-end flows to rehearse aloud

### A. Register a member

`POST /api/auth/register` -> route validates -> service bcrypt-hashes -> transaction -> procedure inserts users/Member/MemberProfile -> age trigger checks DOB -> commit -> JWT signed -> 201.

### B. Log a public workout

`POST /api/logs/workout` -> token + Member role -> input validation -> insert WorkoutEntry -> BEFORE trigger calculates calories -> row stored -> AFTER trigger inserts ActivityFeed -> inserted workout returned -> 201.

### C. Publish a programme

Admin token -> load latest draft -> reconstruct nested schedule -> validate every week/day/training count/exercise prescription -> update draft to Published and store JSONB snapshot -> members can see/enroll in that immutable version.

### D. Complete a programme session

Member enrolls in published version -> starts a session belonging to active enrollment -> upserts actual set performance -> finish query expands required set numbers and checks none are missing -> session log changes InProgress to Completed.

### E. Read a community post image

Token verified -> MediaAsset loaded -> if not owner, block state checked -> linked live SocialPost found -> `postVisible` applies post/profile relationship rules -> bytes returned with stored MIME, private caching, and `nosniff`.

## 16. Verification status

At the time this guide was created:

- `npm run typecheck` passed for frontend and backend TypeScript.
- `npm run lint` passed.
- `npm run build` reached the Vite/frontend stage and failed because the installed Tailwind native Windows binary could not load (`stream did not contain valid UTF-8`, plus sandbox `spawn EPERM`). This is not a TypeScript backend failure.
- Runtime database integration was not claimed by those checks. The repository has smoke scripts, but meaningful execution requires configured DB credentials and a reachable migrated database.

## 17. Study order

1. Memorize the request flow and the difference between authentication, authorization, validation, and constraints.
2. Draw the users/Admin/Member hierarchy and both many-to-many plan relationships.
3. Draw the versioned programme chain and explain why enrollment targets a version.
4. Rehearse the five end-to-end flows above without looking.
5. Be able to explain one example each of a transaction, trigger, function, procedure, view, CTE, lateral join, window function, JSONB operation, and index.
6. Review the defect list and practice precise fixes; this often impresses examiners more than pretending no limitation exists.

## 18. Source-file coverage checklist

- [x] `backend/server.ts`
- [x] `backend/db/index.ts`
- [x] `backend/middleware/auth.middleware.ts`
- [x] `backend/services/auth.service.ts`
- [x] `backend/services/reactions.ts`
- [x] `backend/controllers/exercise.controller.ts`
- [x] all eight backend route files
- [x] `database/setup.sql`
- [x] `database/schema.sql`
- [x] `database/functions.sql`
- [x] `database/procedures.sql`
- [x] `database/triggers.sql`
- [x] `database/views.sql`
- [x] `database/insert.sql`
- [x] `database/platform.sql`
- [x] `database/migrate_existing.sql`
- [x] `database/queries.sql`
- [x] `scripts/migrate.mjs`

This checklist means every backend/database file and every logical block is covered. It is not a literal paraphrase of blank lines, braces, or repeated formatting; those carry syntax/structure rather than separate business behavior.
