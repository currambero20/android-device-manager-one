import { decrypt } from "./server/utils/crypto.js";

const adminUsername = decrypt("73fdd631874d5b3895cef37a71207ea9:df67909e91246bb21aecaaf500df85fe");
const adminPassword = decrypt("7e6aabdeb55fc2afa3e2f6376d9b1b61:94aed050b4d96284ffeb8084ded814084af43164ff0ad11ef2442857cc945b72");
const masterSecret = 'adm-secure-barranquilla-2017';
const rawEncryptedSalt = '0f54de789b0083c0e7bfcc12b3ad593c:879ee2fd7bcf12b8f537c51c5d07d050';
const decryptedSalt = decrypt(rawEncryptedSalt);

console.log("Admin Username:", adminUsername);
console.log("Admin Password:", adminPassword);
console.log("Decrypted Salt:", decryptedSalt);
