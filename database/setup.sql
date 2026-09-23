-- Run this file from psql while connected to an empty FitKit database:
-- psql -U postgres -d FitKitDB -f database/setup.sql

\ir schema.sql
\ir functions.sql
\ir triggers.sql
\ir views.sql
\ir insert.sql

SELECT 'FitKit database setup complete.' AS status;
