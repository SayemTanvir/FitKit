import { query } from './db';

async function checkColumns() {
  const res = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name ILIKE 'activityfeed'
    ORDER BY ordinal_position;
  `);

  console.log('Columns in ActivityFeed:');
  console.table(res.rows);
  process.exit(0);
}

checkColumns();