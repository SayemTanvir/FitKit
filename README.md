# FitKit

FitKit is a DBMS course project for recording workouts, steps, hydration, workout plans, and public fitness activity. It uses React and TypeScript for the frontend, Express for the API, and PostgreSQL for persistent data.

## Core features

- Member registration and JWT login
- Admin and Member roles represented by subtype tables
- Exercise catalogue with Strength, Cardio, and Flexibility subtypes
- Admin workout-plan CRUD
- Member workout logging with ownership checks
- Step and hydration logging
- Daily goals, seven-day analytics, and editable health profile
- Workout-plan activation and progress tracking
- Community feed with persistent reactions and member profiles
- Daily aggregate dashboard and per-user notifications
- Database-triggered calorie calculation and public activity feed
- Membership ranks and achievements

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

## Demo accounts

Both seeded accounts use the password `Password@123`.

| Role | Email |
| --- | --- |
| Admin | `admin@fitkit.com` |
| Member | `member@fitkit.com` |

## Database files

Run SQL through `database/setup.sql`. It applies files in this order:

1. `schema.sql` — tables, keys, constraints, and indexes
2. `functions.sql` — stored functions and trigger functions
3. `triggers.sql` — age validation, calorie calculation, and feed automation
4. `views.sql` — daily summary, leaderboard, and exercise catalogue views
5. `insert.sql` — repeatable sample data

`queries.sql` contains demonstration queries for the DBMS presentation.

If the project was previously run with the old repair scripts, apply the non-destructive compatibility migration once after the normal schema objects exist:

```bash
psql -U postgres -d FitKitDB -f database/migrate_existing.sql
```

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
| POST | `/api/plans/:id/start` | Member |
| GET, POST, DELETE | `/api/logs/workout` | Member |
| GET, POST, DELETE | `/api/logs/steps` | Member |
| GET, POST, DELETE | `/api/logs/hydration` | Member |
| GET | `/api/logs/summary` | Authenticated |
| GET | `/api/logs/analytics?days=7` | Member |
| GET | `/api/social/feed` | Authenticated |
| POST | `/api/social/feed/:id/reaction` | Member |
| GET | `/api/health` | Public |

## Verification

```bash
npm run typecheck
npm run lint
npm run build
node scripts/smoke.mjs
```

Run the smoke test while the API is running with the seeded demo accounts. It
creates and removes disposable plan/log/member records, and checks the main
authenticated API flows and role restrictions.

## Project structure

```text
backend/       Express routes, authentication, and PostgreSQL access
database/      Canonical schema, functions, triggers, views, and seed data
src/           React frontend
```
