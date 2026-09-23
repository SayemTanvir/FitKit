# FitKit API

The API is started from the project root with `npm run dev:api`.

All database objects are created by `database/setup.sql`. API request handlers never create or alter tables. Protected routes read the user ID and role from the verified JWT, and Member-owned records are filtered by that user ID.
