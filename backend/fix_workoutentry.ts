import { query } from './db';

async function fixWorkoutEntrySchema() {
  try {
    console.log('Updating workoutentry schema...');
    
    await query(`
      ALTER TABLE workoutentry 
      ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT NOW();
    `);

    console.log('Successfully added "timestamp" column to workoutentry table!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update schema:', err);
    process.exit(1);
  }
}

fixWorkoutEntrySchema();