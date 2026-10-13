import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const KEY_FILE = path.join(DATA_DIR, '.vault_key');

// Get or initialize the 256-bit master encryption key
export function getMasterKey(): Buffer {
  if (process.env.STORAGE_ENCRYPTION_KEY) {
    const envKey = Buffer.from(process.env.STORAGE_ENCRYPTION_KEY, 'hex');
    if (envKey.length === 32) return envKey;
  }

  if (fs.existsSync(KEY_FILE)) {
    const keyHex = fs.readFileSync(KEY_FILE, 'utf-8').trim();
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (keyBuf.length === 32) return keyBuf;
  }

  // Generate new 32-byte key
  const newKey = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, newKey.toString('hex'), { mode: 0o600 });
  return newKey;
}

// Scrypt password hashing
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    });
    const keyBuf = Buffer.from(derivedKey.toString('hex'), 'hex');
    const hashBuf = Buffer.from(hash, 'hex');
    if (keyBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, hashBuf);
  } catch {
    return false;
  }
}

// Session tokens
export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Random IDs and Tokens
export function generateId(): string {
  return crypto.randomUUID();
}

export function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// AES-256-GCM Encryption for file buffers or streams
export function encryptBuffer(buffer: Buffer): {
  encrypted: Buffer;
  iv: string;
  authTag: string;
  checksum: string;
} {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    checksum,
  };
}

// AES-256-GCM Decryption for file buffers
export function decryptBuffer(
  encrypted: Buffer,
  ivHex: string,
  authTagHex: string
): Buffer {
  const masterKey = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// Streaming Cipher Factory
export function createEncryptionCipher(): {
  cipher: crypto.CipherGCM;
  ivHex: string;
} {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv) as crypto.CipherGCM;
  return {
    cipher,
    ivHex: iv.toString('hex'),
  };
}

// Streaming Decipher Factory
export function createDecryptionDecipher(
  ivHex: string,
  authTagHex: string
): crypto.DecipherGCM {
  const masterKey = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(authTag);
  return decipher;
}
