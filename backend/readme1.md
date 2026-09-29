# Backend File Guide

- `server.ts` — API server, route setup, production frontend hosting.
- `controllers/exercise.controller.ts` — exercise catalog requests.
- `db/index.ts` — PostgreSQL connection and queries.
- `middleware/auth.middleware.ts` — JWT authentication, account and role access.
- `routes/admin.routes.ts` — admin dashboard and role management.
- `routes/auth.routes.ts` — registration, login, profile and account access.
- `routes/community.routes.ts` — members, posts, messaging, media and moderation.
- `routes/exercise.routes.ts` — exercise catalog management.
- `routes/log.routes.ts` — workout, steps, hydration and progress records.
- `routes/plan.routes.ts` — workout plan management and enrollment.
- `routes/programme.routes.ts` — training programmes, sessions and enrollment.
- `routes/social.routes.ts` — activity feed, reactions and leaderboard.
- `services/auth.service.ts` — password checks, account creation and profile data.
- `services/reactions.ts` — social reaction data and updates.