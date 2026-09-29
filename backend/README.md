# Backend Code README

## server.ts
- app.get('/api/health') — checks whether the API and database are reachable.
- app.use('/api/auth', authRoutes) — mounts authentication endpoints.
- app.use('/api/plans', planRoutes) — mounts workout plan endpoints.
- app.use('/api/exercises', exerciseRoutes) — mounts exercise catalog endpoints.
- app.use('/api/logs', logRoutes) — mounts daily activity and workout log endpoints.
- app.use('/api/social', socialRoutes) — mounts social feed and leaderboard endpoints.
- app.use('/api/programmes', programmeRoutes) — mounts training programme endpoints.
- app.use('/api/community', communityRoutes) — mounts social/community features.
- app.use('/api/admin', adminRoutes) — mounts admin-only routes.
- app.use('/api', ...) — returns JSON 404 for unknown API routes.
- app.get('/{*splat}', ...) — serves the frontend in production.
- app.listen(...) — starts the backend server.

## db/index.ts
- requiredDatabaseSetting() — validates required environment database values.
- pool — creates the PostgreSQL connection pool.
- query() — executes SQL queries against the database.
- default export pool — exposes the database pool instance.

## controllers/exercise.controller.ts
- getExercises() — fetches the exercise catalog with active and admin-visible items.

## middleware/auth.middleware.ts
- clearAccountStateCache() — clears cached auth/role state for a user.
- verifyToken() — validates JWT tokens and attaches the user to the request.
- requireRole() — enforces Admin or Member access rules.
- AuthRequest — extended Express request with authenticated user data.

## services/auth.service.ts
- registerMemberService() — creates a new member, hashes the password, and returns a JWT session.
- loginUserService() — validates login credentials and returns the authenticated user payload.
- getUserProfileService() — loads a user profile with achievements and account details.
- updateUserProfileService() — updates profile data and member goal settings.

## services/reactions.ts
- reactionCounts() — counts Fire/Flex/Clap reactions and the current user’s reaction.
- toggleReaction() — toggles a reaction on a feed or post item.

## routes/admin.routes.ts
- GET /overview — returns admin dashboard statistics.
- requireAdminManager() — checks whether the current admin can manage other admins.
- GET /role-assignments — lists user roles and admin access status.
- POST /admins/:id — promotes a member to admin.
- DELETE /admins/:id — removes admin access from a user.

## routes/auth.routes.ts
- normalizedEmail() — normalizes email addresses for login and registration.
- isValidBirthDate() — validates age and date format.
- savePhoto() — updates the user photo or removes it.
- GET /countries — returns the list of countries.
- POST /register — registers a new member and returns a JWT.
- POST /login — logs in a user and issues a session token.
- GET /me — loads the authenticated user profile.
- PUT /me/photo — sets or updates the profile photo.
- DELETE /me/photo — removes the profile photo.
- GET /profile/:id — fetches a public or allowed private profile.
- PUT /me — updates profile details and goals.

## routes/community.routes.ts
- validImage() — validates uploaded image format and headers.
- integer() — parses a positive integer route parameter.
- rate() — throttles repeated actions like posting and commenting.
- blocked() — checks whether two users are blocked.
- notify() — inserts a system notification for a user.
- relation() — loads friendship/follow privacy relationship metadata.
- postVisible() — checks whether a post is visible to the current viewer.
- POST /media/:purpose — uploads community images for avatars, posts, programmes, or exercises.
- GET /media/:id — serves a protected media asset.
- GET /members — searches members by name or username.
- GET /members/:id — fetches a member profile and relationship state.
- PUT /me — updates member profile metadata and privacy.
- DELETE /me/photo — removes the member profile image.
- POST /members/:id/follow — sends or accepts a follow request.
- DELETE /members/:id/follow — unfollows a user.
- PATCH /members/:id/follow — accepts or rejects a follow request.
- POST /members/:id/friend — sends a friendship request.
- PATCH /members/:id/friend — accepts, rejects, cancels, or unfriends.
- GET /requests — loads incoming follow and friend requests.
- GET /friends — lists accepted friends.
- POST /members/:id/block — blocks a member.
- DELETE /members/:id/block — unblocks a member.
- GET /blocks — lists blocked members.
- GET /posts — gets the social posts feed for a selected scope.
- GET /posts/:id — fetches one post by ID.
- POST /posts — creates a new social post.
- PUT /posts/:id — updates a social post.
- DELETE /posts/:id — deletes a user’s own post.
- POST /posts/:id/like — toggles a like on a post.
- POST /posts/:id/reaction — toggles a social reaction.
- GET /posts/:id/comments — loads all comments for a post.
- POST /posts/:id/comments — adds a comment to a post.
- DELETE /comments/:id — removes a user’s own comment.
- GET /conversations — lists active DM conversations.
- GET /messages/:id — returns messages in a conversation.
- POST /messages/:id — sends a direct message.
- GET /notifications — lists notifications for the current user.
- PATCH /notifications/:id — marks one notification as read.
- DELETE /notifications/:id — deletes one notification.
- DELETE /notifications — clears all notifications.
- POST /reports — submits a content moderation report.
- GET /moderation/reports — lists open admin moderation reports.
- GET /moderation/reports/:id/details — loads a report with target details.
- PATCH /moderation/reports/:id — resolves or dismisses a moderation report.
- PATCH /moderation/members/:id/suspension — suspends or restores a member.

## routes/exercise.routes.ts
- validate() — validates exercise form data before saving.
- saveExercise() — creates or updates an exercise record and category details.
- GET / — lists exercises for the current user.
- POST / — creates an exercise as an admin.
- PUT /:id — updates an exercise as an admin.
- DELETE /:id — permanently removes an exercise when unused.

## routes/log.routes.ts
- GET /summary — returns today’s activity totals and goals.
- GET /analytics — returns recent progress analytics for 7–30 days.
- GET /steps — lists recent step entries.
- DELETE /steps/:id — deletes one step log.
- GET /hydration — lists recent hydration entries.
- DELETE /hydration/:id — deletes one hydration record.
- POST /steps — logs a new step entry.
- POST /hydration — logs a new hydration entry.
- GET /workout — lists workout entries.
- POST /workout — creates a workout log entry.
- DELETE /workout/:id — deletes one workout entry.

## routes/plan.routes.ts
- validatePlan() — validates workout plan inputs.
- GET / — lists available workout plans and active plan state.
- POST / — creates a workout plan as an admin.
- POST /:id/exercises — adds an exercise to a plan.
- DELETE /:id/exercises/:exerciseId/:day — removes an exercise from a plan day.
- POST /:id/start — starts a plan for the current member.
- PUT /:id — updates workout plan details.
- DELETE /:id — deletes a workout plan.

## routes/programme.routes.ts
- details() — validates programme metadata and cover image.
- loadProgramme() — loads a full programme version with weeks, sessions, and exercises.
- validateWeeks() — validates programme structure across all weeks and days.
- GET / — lists public or admin programme versions.
- POST / — creates a new programme draft.
- GET /enrollments — lists the current member’s programme enrollments.
- GET /:id — loads a specific programme for viewing.
- PUT /:id — updates programme metadata on the current draft.
- DELETE /:id/draft — deletes the latest draft version.
- DELETE /:id — permanently deletes a programme and its enrollments.
- PUT /:id/structure — saves the week/day/session training structure.
- POST /:id/publish — publishes the draft version.
- PATCH /:id/archive — archives or restores a programme.
- POST /:id/new-version — creates a new draft version from the latest version.
- POST /:id/enroll — enrolls a member in a published programme.
- PATCH /enrollments/:id — pauses or resumes an enrollment.
- DELETE /enrollments/:id — removes an enrollment from the active list.
- POST /enrollments/:id/sessions/:sessionId — marks a session as started for an enrollment.
- GET /enrollments/:id/logs — loads workout logs for an enrollment.
- PUT /logs/:id/sets/:prescriptionId/:setNumber — saves performance for a set.
- POST /logs/:id/finish — marks a workout session log as completed.

## routes/social.routes.ts
- GET /leaderboard — returns filtered leaderboard rankings.
- GET ['/', '/feed'] — fetches the social activity feed with pagination.
- POST /feed/:id/reaction — toggles a reaction on a feed item.

