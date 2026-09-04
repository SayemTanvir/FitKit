import { query } from './db';

async function assignPlan() {
  try {
    console.log('Updating user plan status...');
    
    // 1. Ensure status or active_plan column exists
    await query(`
      ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active Member',
        ADD COLUMN IF NOT EXISTS active_plan VARCHAR(100) DEFAULT 'Full Body Hypertrophy';
    `);

    // 2. Set default active plan for regular member
    await query(`
      UPDATE users 
      SET 
        status = 'Active Member',
        active_plan = 'Full Body Hypertrophy'
      WHERE email = 'member@fitkit.com';
    `);

    console.log('Member account plan status successfully updated!');
    process.exit(0);
  } catch (err) {
    console.error('Update error:', err);
    process.exit(1);
  }
}

assignPlan();