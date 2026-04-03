const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'assets', 'apk-template', 'smali', 'com', 'etechd', 'l3mon', 'IOSocket.smali');

const serverUrl = 'http://192.168.200.6:3001';

console.log(`[APK Setup] Modificando URL del servidor a: ${serverUrl}/l3mon`);

let content = fs.readFileSync(templatePath, 'utf8');

content = content.replace(
  /const-string v3, "http:\/\/x:22222\/l3mon\?model="/g,
  `const-string v3, "${serverUrl}/l3mon?model="`
);

fs.writeFileSync(templatePath, content);

console.log('[APK Setup] URL del servidor actualizada en IOSocket.smali');
console.log('[APK Setup] El APK compilado desde el panel web ahora usará esta URL');
