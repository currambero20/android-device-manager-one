const fs = require('fs');
const content = fs.readFileSync('../android-device-manager/true-build.log', 'utf16le');
fs.writeFileSync('../android-device-manager/true-build-utf8.txt', content, 'utf8');
