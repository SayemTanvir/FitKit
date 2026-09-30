<div align="center">
  <img src="./src/assets/fitkit-logo.png" alt="FitKit logo" width="120" />

  # FitKit

  **A full-stack fitness, workout planning, and community platform**

  Plan training programmes, track daily activity, measure progress, and connect
  with a fitness community—all in one place.

  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-22.12+-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
</div>

---

## Overview

FitKit is a database-driven fitness application built with React, Express, and
PostgreSQL. It combines personal activity tracking and structured workout
programmes with social features such as profiles, posts, leaderboards, direct
messages, and moderation.

The application supports two roles:

- **Members** discover programmes, log workouts and daily activity, monitor
  progress, and interact with the community.
- **Admins** manage exercises and versioned programmes, moderate reported
  content, and view platform statistics.

## Features

### Training and progress

- Multi-week programme catalogue with enrollment, pause, and resume workflows
- Set-by-set workout logging with session history
- Workout, step, and hydration tracking
- Daily goals and seven-day progress analytics
- Exercise library for strength, cardio, and flexibility activities
- Achievements, membership ranks, and fitness-level leaderboards

### Community

- Public or private member profiles and activity visibility controls
- Member discovery, follows, friendships, and blocking
- Posts, comments, likes, and activity-feed reactions
- Persistent one-to-one messaging and notifications
- Reporting, account suspension, and an admin moderation queue

### Administration and data

- Exercise catalogue management
- Programme drafting, publication, versioning, archiving, and restoration
- Database-backed admin overview
- PostgreSQL views, functions, procedures, and triggers
- Automatic calorie calculations and activity-feed generation
- Seeded demonstration data for development and presentations

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript, JWT, bcrypt |
| Database | PostgreSQL, `pg` connection pooling |
| UI utilities | Lucide React, React Hot Toast, React Virtuoso |
| Quality | TypeScript project references, Oxlint, smoke tests |
| Deployment | Render-compatible single-service configuration |

## Architecture

```text
Browser
  │
  ├── React + Vite frontend
  │      └── /api requests
  │
  └── Express REST API
         ├── JWT authentication and role checks
         ├── Route-level validation and privacy checks
         └── PostgreSQL
                ├── relational schema and indexes
                ├── views and stored procedures
                └── functions and triggers
```

In development, Vite serves the frontend and proxies `/api` to Express. In
production, Express serves the compiled frontend and API from one origin.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) **22.12 or newer**
- npm
- [PostgreSQL](https://www.postgresql.org/) **14 or newer**, locally or through
  a hosted provider such as Supabase
- `psql` on your command line, or another PostgreSQL client capable of running
  SQL files

### 1. Clone and install

```bash
git clone https://github.com/SayemTanvir/FitKit.git
cd FitKit
npm install
```

### 2. Configure the environment

Copy the example file to `backend/.env`:

```bash
# macOS/Linux
cp .env.example backend/.env
```

```powershell
# Windows PowerShell
Copy-Item .env.example backend/.env
```

Then update the values for your PostgreSQL instance:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=FitKitDB
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_SSL=false
APP_TIME_ZONE=Asia/Dhaka
JWT_SECRET=replace_with_a_long_random_secret
WEB_ORIGIN=http://localhost:5173
```

> The committed `.env.example` is pre-shaped for a hosted Supabase connection.
> For local PostgreSQL, use values similar to the example above and set
> `DB_SSL=false`. Never commit `backend/.env`.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port; defaults to `5000` |
| `DB_HOST` | PostgreSQL hostname |
| `DB_PORT` | PostgreSQL port; normally `5432` |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_SSL` | Enables SSL when set to `true` |
| `APP_TIME_ZONE` | Application time zone used by migration tooling |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `WEB_ORIGIN` | Allowed browser origin; accepts comma-separated origins |

### 3. Create and seed the database

Create an empty database, then run the canonical setup script from the project
root:

```bash
createdb -U postgres FitKitDB
psql -U postgres -d FitKitDB -f database/setup.sql
```

If the database already exists, omit the `createdb` command. The setup script
creates the schema, database logic, views, catalogue, procedures, and demo data.

### 4. Start the application

```bash
npm run dev
```

Open the following addresses:

| Service | URL |
| --- | --- |
| Web application | <http://localhost:5173> |
| API health check | <http://localhost:5000/api/health> |

A successful health check returns:

```json
{ "status": "ok", "database": "connected" }
```

## Demo accounts

The seed data includes ready-to-use accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fitkit.com` | `Password@123` |
| Member | `member@fitkit.com` | `Password@123` |
| Demo members | `aisha1@fitkit.com` and other seeded users | `12345678` |

The dataset contains 100 fictional members across 10 countries, historical
activity, social relationships, achievements, exercises, and published
programmes. Change or remove all demo credentials before deploying a real
instance.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the frontend and API together in watch mode |
| `npm run dev:web` | Start only the Vite frontend |
| `npm run dev:api` | Start only the Express API |
| `npm run build` | Type-check and create the production frontend build |
| `npm run start:api` | Start the API without watch mode |
| `npm run typecheck` | Type-check frontend and backend projects |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production frontend build |
| `npm run migrate:existing` | Upgrade an older FitKit database |

## Database workflow

For a **new, empty database**, run only `database/setup.sql`. It applies the
database files in this order:

1. `schema.sql` — tables, relationships, constraints, and indexes
2. `functions.sql` — stored and trigger functions
3. `triggers.sql` — validation, calorie calculation, and feed automation
4. `views.sql` — summaries, leaderboards, and catalogue views
5. `insert.sql` — core seed data
6. `platform.sql` — programme and community schema additions
7. `catalog_seed.sql` — expanded exercise and programme catalogue
8. `demo_users.sql` — fictional member and activity data
9. `procedures.sql` — stored procedures

For a database created by an older FitKit version, do **not** rerun
`database/setup.sql`. Configure `backend/.env`, then use:

```bash
npm run migrate:existing
```

This repeatable migration preserves existing plans and workout logs, converts
legacy plans into versioned programmes where possible, and applies the current
platform, catalogue, demo-data, and procedure updates.

## API overview

All protected endpoints expect a JWT bearer token. Role and ownership checks
are enforced by the API rather than only by the user interface.

| Prefix | Main responsibility | Typical access |
| --- | --- | --- |
| `/api/auth` | Registration, login, profiles, and account settings | Public / authenticated |
| `/api/exercises` | Exercise catalogue and administration | Authenticated / admin writes |
| `/api/plans` | Legacy workout-plan compatibility workflow | Member / admin by action |
| `/api/logs` | Workout, step, hydration, summary, and analytics data | Member |
| `/api/programmes` | Programme creation, publication, enrollment, and set logs | Member / admin by action |
| `/api/social` | Activity feed, reactions, and leaderboard | Authenticated |
| `/api/community` | Profiles, relationships, posts, messages, notifications, and reports | Authenticated |
| `/api/admin` | Platform overview and role administration | Admin |
| `/api/health` | API and database availability | Public |

## Project structure

```text
FitKit/
├── backend/
│   ├── controllers/       # Request controllers
│   ├── db/                # PostgreSQL connection pool
│   ├── middleware/        # Authentication and role authorization
│   ├── routes/            # REST API routes
│   ├── services/          # Shared backend business logic
│   └── server.ts          # Express entry point
├── database/              # Schema, migrations, database logic, and seeds
├── public/                # Static browser assets
├── scripts/               # Development, migration, and smoke-test scripts
├── src/
│   ├── assets/            # Frontend images
│   ├── components/        # Reusable React components
│   ├── pages/             # Route-level application views
│   ├── services/          # API clients and frontend services
│   └── App.tsx            # Application routing
├── .env.example           # Environment configuration template
├── render.yaml            # Render deployment blueprint
└── vite.config.ts         # Vite and development proxy configuration
```

## Verification

Run the static checks and production build before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run build
```

With the API running against the seeded database, the integration smoke suites
can also be run:

```bash
node scripts/smoke.mjs
node scripts/programme-smoke.mjs
node scripts/community-smoke.mjs
npx tsx --tsconfig tsconfig.app.json scripts/avatar-smoke.tsx
```

These tests create and remove disposable records while checking authentication,
role restrictions, programme versioning, logging, privacy, relationships,
messaging, and moderation workflows.

## Current limitations

- Direct messages use short polling rather than WebSockets; typing indicators
  and attachments are not available.
- Uploaded JPEG, PNG, WebP, and GIF images are limited to 3 MB and stored in
  PostgreSQL without server-side resizing or compression.
- The programme builder does not yet support reusable workout templates,
  scheduled publication, assignments, supersets, or circuits.
- Programme history is persistent, but calendar-based rescheduling and advanced
  programme analytics are not yet implemented.
- Rate limiting is process-local. Multi-instance production deployments need a
  shared rate-limit store, managed secrets, backups, monitoring, and HTTPS.

## Deployment

`render.yaml` defines a Render web service that builds the React application and
runs the Express API. For another production environment:

1. Run `npm run build`.
2. Set `NODE_ENV=production` and all required database/JWT variables.
3. Run `npm run start:api`.

Express will serve both the files in `dist/` and the `/api` routes.

---

<div align="center">
  Built as a full-stack DBMS project with React, Express, and PostgreSQL.
</div>
