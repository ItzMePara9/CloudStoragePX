import assert from 'node:assert';
import { db, initDatabase } from '../server/db.js';
import {
  hashPassword,
  verifyPassword,
  encryptBuffer,
  decryptBuffer,
  generateSessionToken,
  hashSessionToken,
  generateId,
} from '../server/crypto.js';
import {
  checkUserQuota,
  directUpload,
  getDecryptedFile,
  permanentlyDeleteFile,
  initChunkedUpload,
  saveChunk,
  completeChunkedUpload,
} from '../server/storage.js';

console.log('🧪 Starting CloudStoragePX Test Suite...\n');

async function runTests() {
  initDatabase();

  // Test 1: Password hashing and scrypt verification
  console.log('1. Testing Password Security (scrypt)...');
  const testPassword = 'SuperSecretPassword123!';
  const { hash, salt } = hashPassword(testPassword);
  assert(verifyPassword(testPassword, hash, salt), 'Password verification failed for correct password');
  assert(!verifyPassword('WrongPassword', hash, salt), 'Password verification should fail for wrong password');
  console.log('   ✓ Password hashing and verification passed');

  // Test 2: AES-256-GCM Encryption and Decryption
  console.log('2. Testing AES-256-GCM Authenticated Encryption...');
  const originalData = Buffer.from('CloudStoragePX Top-Secret File Content: 1234567890');
  const { encrypted, iv, authTag, checksum } = encryptBuffer(originalData);
  assert(encrypted.length > 0, 'Encrypted buffer should not be empty');
  assert(iv.length === 24, 'IV should be 12 bytes (24 hex characters)');
  assert(authTag.length === 32, 'Auth tag should be 16 bytes (32 hex characters)');

  const decrypted = decryptBuffer(encrypted, iv, authTag);
  assert(decrypted.toString() === originalData.toString(), 'Decrypted data does not match original payload');
  console.log('   ✓ AES-256-GCM encryption, decryption, and integrity verified');

  // Test 3: Session Tokens
  console.log('3. Testing Session Management...');
  const { rawToken, tokenHash } = generateSessionToken();
  assert(rawToken.length === 64, 'Raw session token should be 32 bytes (64 hex characters)');
  assert(hashSessionToken(rawToken) === tokenHash, 'Session token hashing mismatch');
  console.log('   ✓ Session token generation and SHA-256 hashing passed');

  // Test 4: Quota & Upload Operations
  console.log('4. Testing User Quota and Storage Operations...');
  const testUserId = generateId();
  const initialQuota = 10000; // 10 KB
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at)
    VALUES (?, 'testuser', 'test@example.com', 'h', 's', 'member', 'active', ?, 0, ?)
  `).run(testUserId, initialQuota, Date.now());

  assert(checkUserQuota(testUserId, 5000), '5000 bytes should be within 10000 bytes quota');
  assert(!checkUserQuota(testUserId, 15000), '15000 bytes should exceed 10000 bytes quota');

  // Direct file upload
  const fileContent = Buffer.from('Sample document text for test');
  const uploadedFile = directUpload(testUserId, 'sample.txt', 'text/plain', fileContent, null);
  assert(uploadedFile.id, 'File should be assigned an ID');
  assert(uploadedFile.size === fileContent.length, 'File size matches payload');

  // Verify storage used was updated
  const updatedUser = db.prepare('SELECT storage_used FROM users WHERE id = ?').get(testUserId) as any;
  assert(updatedUser.storage_used === fileContent.length, 'User used storage did not increment properly');

  // Read decrypted file
  const retrieved = getDecryptedFile(uploadedFile.id);
  assert(retrieved.buffer.toString() === fileContent.toString(), 'Decrypted file content matches original');

  // Delete file
  permanentlyDeleteFile(uploadedFile.id, testUserId);
  const afterDeleteUser = db.prepare('SELECT storage_used FROM users WHERE id = ?').get(testUserId) as any;
  assert(afterDeleteUser.storage_used === 0, 'User used storage did not decrement after permanent delete');

  // Clean test user
  db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  console.log('   ✓ Storage upload, encryption-at-rest, decryption, and quota enforcement verified');

  // Test 5: Chunked Upload Simulation
  console.log('5. Testing Chunked Uploads & Assembly...');
  const chunkUserId = generateId();
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at)
    VALUES (?, 'chunkuser', 'chunk@example.com', 'h', 's', 'member', 'active', 50000, 0, ?)
  `).run(chunkUserId, Date.now());

  const fullData = Buffer.from('CHUNK-PART-1-ABCDEF' + 'CHUNK-PART-2-GHIJKL');
  const part1 = Buffer.from('CHUNK-PART-1-ABCDEF');
  const part2 = Buffer.from('CHUNK-PART-2-GHIJKL');

  const { uploadId } = initChunkedUpload(chunkUserId, 'chunked.bin', fullData.length, 'application/octet-stream', null, 2);
  saveChunk(uploadId, 0, part1);
  saveChunk(uploadId, 1, part2);

  const completed = completeChunkedUpload(uploadId);
  assert(completed.size === fullData.length, 'Completed chunked file size must match');

  const readBack = getDecryptedFile(completed.id);
  assert(readBack.buffer.toString() === fullData.toString(), 'Chunk-assembled file decrypted correctly');

  permanentlyDeleteFile(completed.id, chunkUserId);
  db.prepare('DELETE FROM users WHERE id = ?').run(chunkUserId);
  console.log('   ✓ Chunked upload verification passed');

  // Test 6: OAuth Account Schema and Linking
  console.log('6. Testing OAuth Account Linking & Uniqueness...');
  const oauthUserId = generateId();
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at)
    VALUES (?, 'oauth_user', 'oauth_user@example.com', 'h', 's', 'member', 'active', 50000, 0, ?)
  `).run(oauthUserId, Date.now());

  const oauthLinkId = generateId();
  db.prepare(`
    INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, display_name, created_at)
    VALUES (?, ?, 'google', 'google-uid-12345', 'oauth_user@example.com', 'OAuth User', ?)
  `).run(oauthLinkId, oauthUserId, Date.now());

  const link = db.prepare("SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = ?").get('google-uid-12345') as any;
  assert(link && link.user_id === oauthUserId, 'OAuth account linking lookup failed');

  // Verify unique provider user constraint
  assert.throws(() => {
    db.prepare(`
      INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, display_name, created_at)
      VALUES (?, ?, 'google', 'google-uid-12345', 'other@example.com', 'Other', ?)
    `).run(generateId(), generateId(), Date.now());
  }, /UNIQUE constraint failed/, 'Should enforce unique provider + provider_user_id');

  // Clean up
  db.prepare('DELETE FROM users WHERE id = ?').run(oauthUserId);
  console.log('   ✓ OAuth schema, account resolution, and uniqueness verified');

  console.log('\n🎉 ALL 6 TEST SUITES PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
