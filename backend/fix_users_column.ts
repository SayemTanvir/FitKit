import bcrypt from 'bcrypt';
import { query } from './db';

async function repairUsersTable() {
  try {
    console.log('Stripping restrictive profile constraints from users table...');

    // 1. Rename 'password' to 'password_hash' if it exists under the old name
    await query(`
      DO $$ 
      BEGIN 
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password'
        ) THEN 
          ALTER TABLE users RENAME COLUMN password TO password_hash;
        END IF;
      END $$;
    `);

    // 2. Ensure core auth columns exist
    await query(`
      ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS name VARCHAR(100) DEFAULT 'FitKit User',
        ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE,
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'Member';
    `);

    // 3. Dynamically drop NOT NULL on all columns except primary key (user_id)
    await query(`
      DO $$
      DECLARE
        col RECORD;
      BEGIN
        FOR col IN 
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
            AND is_nullable = 'NO' 
            AND column_name NOT IN ('user_id')
        LOOP
          EXECUTE format('ALTER TABLE users ALTER COLUMN %I DROP NOT NULL', col.column_name);
        END LOOP;
      END $$;
    `);

    // 4. Hash passwords and seed default accounts
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('Password@123', saltRounds);
    const memberHash = await bcrypt.hash('Password@123', saltRounds);

    await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES 
        ('FitKit Admin', 'admin@fitkit.com', '${adminHash}', 'Admin'),
        ('Regular Member', 'member@fitkit.com', '${memberHash}', 'Member')
      ON CONFLICT (email) DO UPDATE 
      SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role;
    `);

    console.log('Users table constraints successfully relaxed and accounts seeded!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

repairUsersTable();