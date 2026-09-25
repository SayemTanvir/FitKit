import { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Reconstruct __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Checks both backend/ and the root project directory for .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const requiredDatabaseSetting = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required database setting: ${name}`);
  }
  return value;
};

const databaseTimeZone = /^[A-Za-z_]+\/[A-Za-z_]+$/.test(process.env.APP_TIME_ZONE || '')
  ? process.env.APP_TIME_ZONE!
  : 'Asia/Dhaka';

const pool = new Pool({
  host: requiredDatabaseSetting('DB_HOST'),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: requiredDatabaseSetting('DB_NAME'),
  user: requiredDatabaseSetting('DB_USER'),
  password: requiredDatabaseSetting('DB_PASSWORD'),
  options: `-c timezone=${databaseTimeZone}`,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export default pool;
