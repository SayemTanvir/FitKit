import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'backend/.env', quiet: true });

const requiredDatabaseSetting = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required database setting: ${name}`);
  }
  return value;
};

const pool = new pg.Pool({
  host: requiredDatabaseSetting('DB_HOST'),
  port: Number(process.env.DB_PORT || 5432),
  database: requiredDatabaseSetting('DB_NAME'),
  user: requiredDatabaseSetting('DB_USER'),
  password: requiredDatabaseSetting('DB_PASSWORD'),
  options: `-c timezone=${process.env.APP_TIME_ZONE || 'Asia/Dhaka'}`,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  const sql = await readFile(new URL('../database/migrate_existing.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  const platform = await readFile(new URL('../database/platform.sql', import.meta.url), 'utf8');
  await pool.query(platform);
  const procedures = await readFile(new URL('../database/procedures.sql', import.meta.url), 'utf8');
  await pool.query(procedures);
  console.log('FitKit compatibility migration complete.');
} finally {
  await pool.end();
}
