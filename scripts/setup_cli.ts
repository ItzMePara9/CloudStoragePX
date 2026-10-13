import readline from 'node:readline';
import { db, initDatabase } from '../server/db.js';
import { hashPassword, generateId } from '../server/crypto.js';

initDatabase();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(promptText: string): Promise<string> {
  return new Promise((resolve) => rl.question(promptText, resolve));
}

async function runCliSetup() {
  console.log('\n======================================================');
  console.log('   CloudStoragePX — Interactive Owner Provisioning');
  console.log('======================================================\n');

  const ownerCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = "owner"').get() as any).c;
  if (ownerCount > 0) {
    console.log('⚠️  Notice: An installation owner account is already provisioned in the database.');
    const proceed = await question('Do you want to create an additional Administrator account? (y/N): ');
    if (proceed.trim().toLowerCase() !== 'y') {
      console.log('Setup aborted.');
      rl.close();
      process.exit(0);
    }
  }

  const username = await question('Enter Owner/Admin Username: ');
  if (!username.trim()) {
    console.error('Username cannot be empty.');
    rl.close();
    process.exit(1);
  }

  const email = await question('Enter Email Address: ');
  if (!email.trim() || !email.includes('@')) {
    console.error('Invalid email address.');
    rl.close();
    process.exit(1);
  }

  const password = await question('Enter Strong Password (min 8 chars): ');
  if (password.length < 8) {
    console.error('Password too short (must be at least 8 characters).');
    rl.close();
    process.exit(1);
  }

  const { hash, salt } = hashPassword(password);
  const userId = generateId();
  const now = Date.now();
  const role = ownerCount === 0 ? 'owner' : 'admin';

  try {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', 107374182400, 0, ?)
    `).run(
      userId,
      username.trim(),
      email.trim().toLowerCase(),
      hash,
      salt,
      role,
      now
    );

    console.log('\n======================================================');
    console.log(`✅ Success: Provisioned ${role.toUpperCase()} account for "${username.trim()}".`);
    console.log('   Storage Quota: 100 GB');
    console.log('   Encryption Mode: AES-256-GCM (Authenticated at rest)');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('Failed to create account:', err.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

runCliSetup();
