import crypto from 'crypto';

function decrypt(text: string): string {
  const secret = 'adm-secure-barranquilla-2017';
  const key = crypto.createHash('sha256').update(secret).digest();
  const [ivHex, encryptedHex] = text.split(':');
  if (!ivHex || !encryptedHex) return text;
  
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

const password = 'Celeste2026';
const oldSaltEncrypted = '0f54de789b0083c0e7bfcc12b3ad593c:879ee2fd7bcf12b8f537c51c5d07d050';
const oldSaltDecrypted = decrypt(oldSaltEncrypted);

const dbHash = '87bdb4b96085c23cac15f158adb6f5ad864ecfdb7992e937f64b7faa41a0e578';
const localHash = crypto.createHash('sha256').update(password + oldSaltDecrypted).digest('hex');

console.log("Old Salt Decrypted:", oldSaltDecrypted);
console.log("Old Salt Hash     :", localHash);
console.log("DB Hash           :", dbHash);
console.log("Match?            :", localHash === dbHash);
