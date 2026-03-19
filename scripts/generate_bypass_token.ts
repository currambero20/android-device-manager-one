import { SignJWT } from "jose";
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function decrypt(text: string): string {
  const secret = 'adm-secure-barranquilla-2017';
  const key = deriveKey(secret);
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, ENCODING);
  const encryptedText = Buffer.from(encryptedHex, ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

async function run() {
  // Decrypt the JWT Secret
  const rawSecret = "49375ed35668ab6429c6fe9a00f95540:f5193c255f8d8ff7ec140f1d5342ef4c19e122ba2bb4fb2c80b875434a5ca0fb3292fe54f456eb4ea4cd7db10f6c89dc";
  const jwtSecretStr = decrypt(rawSecret);
  const JWT_SECRET = new TextEncoder().encode(jwtSecretStr);

  // Generate Token for costabot2018@gmail.com
  // Using ID 1 (since it's the only one in DB)
  const token = await new SignJWT({
    sub: "1",
    openId: "1",
    name: "elkin",
    email: "costabot2018@gmail.com",
    role: "admin",
    loginMethod: "local",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  console.log('TOKEN_BYPASS:', token);
}

run().catch(console.error);
