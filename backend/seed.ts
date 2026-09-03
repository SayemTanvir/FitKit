import bcrypt from 'bcrypt';
import pool from './db';

async function syncPasswords() {
  try {
    const saltRounds = 10;
    const realHash = await bcrypt.hash('Password@123', saltRounds);

    // Update both test accounts with the valid hash
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1 
       WHERE email IN ('admin@fitkit.com', 'member@fitkit.com')
       RETURNING user_id, email;`,
      [realHash]
    );

    if (result.rowCount === 0) {
      console.log('No users found to update. Make sure you ran database/insert.sql first!');
    } else {
      console.log('Successfully updated password hash for:');
      result.rows.forEach((u) => console.log(` - ${u.email} (ID: ${u.user_id})`));
    }
  } catch (err) {
    console.error('Error updating passwords:', err);
  } finally {
    await pool.end();
  }
}

syncPasswords();