import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'backend/.env', quiet: true });
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'FitKitDB',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
});

try {
  const sql = await readFile(new URL('../database/migrate_existing.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  const platform = await readFile(new URL('../database/platform.sql', import.meta.url), 'utf8');
  await pool.query(platform);
  console.log('FitKit compatibility migration complete.');
} finally {
  await pool.end();
}
