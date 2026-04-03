
const os = require('os');
const networkInterfaces = os.networkInterfaces();
const results = [];

for (const interfaceName in networkInterfaces) {
  const interfaces = networkInterfaces[interfaceName];
  for (const interfaceInfo of interfaces) {
    if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
      results.push({
        name: interfaceName,
        address: interfaceInfo.address
      });
    }
  }
}

console.log(JSON.stringify(results, null, 2));
