# FitKit

FitKit is a React/TypeScript, Express, and PostgreSQL fitness platform. The original DBMS-project plans and logs remain available; the newer programme and community workflows use persistent, permission-checked API data.

## Core features

- Member registration and JWT login
- Admin and Member roles represented by subtype tables
- Exercise catalogue with Strength, Cardio, and Flexibility subtypes
- Admin plan creation followed by exercise scheduling; members can start multiple plans
- Member workout logging with ownership checks
- Step and hydration logging
- Daily goals, seven-day analytics, and editable health profile
- Workout-plan activation and progress tracking
- Community feed with persistent reactions and member profiles
- Public-activity leaderboard filtered by metric, time period, and fitness level
- Daily aggregate dashboard and per-user notifications
- Database-triggered calorie calculation and public activity feed
- Membership ranks and achievements
- Admin exercise library, multiweek programme builder, publication/versioning, and archive/restore
- Member programme enrollment, set-by-set workout logging, pause/resume, and progress history
- Member discovery, public/private profiles, separate follows and friendships, posts, comments, direct messages, and notifications
- Blocking, reporting, moderation queue, account suspension, and a database-backed admin overview

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer
- `psql` available on the command line, or a PostgreSQL client such as pgAdmin

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database named `FitKitDB`.

3. Copy `.env.example` to `backend/.env` and set your PostgreSQL password and JWT secret.

4. Run the canonical database setup from the project root:

   ```bash
   psql -U postgres -d FitKitDB -f database/setup.sql
   ```

5. Start the API and frontend together:

   ```bash
   npm run dev
   ```

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:5000`.
The frontend proxies `/api` requests to the API during development. If needed,
`npm run dev:api` and `npm run dev:web` start the services separately.
Open `/api/health` to check whether the API can reach PostgreSQL. If the API
reports a database error, verify `backend/.env` and that PostgreSQL is running.
The API requires `JWT_SECRET`; set a long, unique value. `WEB_ORIGIN` controls the browser origin allowed by CORS.

## Demo accounts

Both seeded accounts use the password `Password@123`.

| Role | Email |
| --- | --- |
| Admin | `admin@fitkit.com` |
| Member | `member@fitkit.com` |

The platform migration also adds clearly fictional demo members and a two-week training programme. The fictional accounts use the seeded demo password; change or remove them before any non-demo deployment. The seed is repeatable and does not overwrite an existing user with the same email.

## Database files

Run SQL through `database/setup.sql`. It applies files in this order:

1. `schema.sql` — tables, keys, constraints, and indexes
2. `functions.sql` — stored functions and trigger functions
3. `triggers.sql` — age validation, calorie calculation, and feed automation
4. `views.sql` — daily summary, leaderboard, and exercise catalogue views
5. `insert.sql` — repeatable sample data

6. `platform.sql` — additive programme/social schema, legacy-plan conversion, privacy repair, and fictional demo data

`queries.sql` contains demonstration queries for the DBMS presentation.

If you already have a local FitKit database from an older version, do not run
`setup.sql` again. Apply the repeatable compatibility migration after pulling
these changes; it also categorizes the older exercise names for plan curation:

```bash
npm run migrate:existing
```

`npm run migrate:existing` reads `backend/.env` and applies both compatibility and platform migrations. Do not use the old `psql -f database/migrate_existing.sql` command by itself: it does not apply `platform.sql`.

Legacy plans are converted into published programme versions where possible. Existing plan rows and workout logs are retained. New enrollments point to a specific published version; a later draft or publication cannot rewrite recorded sets.

## Main API routes

| Method | Route | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| PUT | `/api/auth/me` | Authenticated |
| GET | `/api/auth/profile/:id` | Authenticated |
| GET | `/api/exercises` | Authenticated |
| GET | `/api/plans` | Authenticated |
| POST, PUT, DELETE | `/api/plans` | Admin |
| POST | `/api/plans/:id/exercises` | Admin |
| DELETE | `/api/plans/:id/exercises/:exerciseId/:day` | Admin |
| POST | `/api/plans/:id/start` | Member |
| GET, POST, DELETE | `/api/logs/workout` | Member |
| GET, POST, DELETE | `/api/logs/steps` | Member |
| GET, POST, DELETE | `/api/logs/hydration` | Member |
| GET | `/api/logs/summary` | Authenticated |
| GET | `/api/logs/analytics?days=7` | Member |
| GET | `/api/social/feed` | Authenticated |
| GET | `/api/social/leaderboard` | Authenticated |
| POST | `/api/social/feed/:id/reaction` | Member |
| GET | `/api/health` | Public |

Newer API groups:

| Prefix | Key actions | Access |
| --- | --- | --- |
| `/api/programmes` | Browse, create/edit draft, save weekly structure, publish, version, archive, enroll, log sets and finish sessions | Member / Admin by action |
| `/api/exercises` | Create/edit/archive exercise-library entries | Admin writes |
| `/api/community/members` | Discovery, profiles, follows, friendships, blocks | Member writes |
| `/api/community/posts` | Feed, posts, likes and comments | Privacy checked |
| `/api/community/messages` | Persistent one-to-one messages and read state | Member |
| `/api/community/notifications` | Notification centre and read state | Authenticated |
| `/api/community/reports`, `/api/community/moderation` | Reports and moderation actions | Member / Admin |
| `/api/admin/overview` | Database-backed platform counts | Admin |

The member UI is under **Explore Programmes**, **My Programmes**, **Community**, **Messages**, and **Notifications**. Admins have **Programme Studio**, **Exercise Library**, **Moderation**, and the overview dashboard. The older plan interface remains reachable for compatibility, but the new builder is the primary authoring flow.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
node scripts/smoke.mjs
node scripts/programme-smoke.mjs
node scripts/community-smoke.mjs
npx tsx --tsconfig tsconfig.app.json scripts/avatar-smoke.tsx
```

Run the smoke test while the API is running with the seeded demo accounts. It
creates and removes disposable plan/log/member records, and checks the main
authenticated API flows and role restrictions.
The additional smoke suites create disposable accounts/records to exercise multiweek publication, historical version integrity, workout results, privacy, relationships, messaging and moderation. They require the running API, migrated database and seeded admin account.

## Current boundaries

- Messaging is persistent and uses short polling, not WebSockets. Typing indicators and attachments are not implemented.
- Profile, post, programme-cover and exercise images can be uploaded as JPEG, PNG, WebP or GIF (maximum 3 MB) into PostgreSQL `MediaAsset`; HTTPS URLs remain supported for existing content. Uploaded media is served through authenticated, access-checked API routes. Use only media you own or are licensed to display. There is no server-side resizing or compression service; unlinked abandoned uploads currently require maintenance cleanup.
- The builder supports explicit save, repeated week copying, deload marking and per-week prescriptions. It does not yet offer reusable workout-template management, scheduled publication, programme assignment, or advanced supersets/circuits.
- Set logging, completion and history are database-backed. There is no automatic calendar-based skipped-day rescheduling or comprehensive programme analytics yet.
- Basic in-process spam limits protect sensitive endpoints, but multi-instance production deployments need a shared rate-limit store. Deployment also requires HTTPS, managed secret storage, backups, observability and an operational moderation policy.

## Project structure

```text
backend/       Express routes, authentication, and PostgreSQL access
database/      Canonical schema, functions, triggers, views, and seed data
src/           React frontend
```
