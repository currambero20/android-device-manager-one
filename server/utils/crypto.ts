import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a consistent 32-byte key from the environment variable.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a string using AES-256-CBC.
 * Output format: IV in hex + ':' + Encrypted data in hex.
 */
export function encrypt(text: string): string {
  const secret = 'adm-secure-barranquilla-2017';
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);
  
  return `${iv.toString(ENCODING)}:${encrypted}`;
}

/**
 * Decrypts a string using AES-256-CBC.
 */
export function decrypt(text: string): string {
  try {
    const secret = 'adm-secure-barranquilla-2017';
    const key = deriveKey(secret);
    const [ivHex, encryptedHex] = text.split(':');
    
    if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted format');
    
    const iv = Buffer.from(ivHex, ENCODING);
    const encryptedText = Buffer.from(encryptedHex, ENCODING);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return text; // Fallback to raw text if decryption fails (for transition period)
  }
}
