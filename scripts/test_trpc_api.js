const http = require('http');

function makeRequest(path, cookies = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://192.168.200.6:5173'
      }
    };
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n=== ${path} ===`);
        console.log('Status:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        console.log('Body:', data.substring(0, 500));
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('Testing tRPC endpoints...');
  
  // Test 1: auth.me without cookie
  await makeRequest('/api/trpc/auth.me');
  
  // Test 2: dashboard.getStats (protected endpoint)
  await makeRequest('/api/trpc/dashboard.getStats');
  
  console.log('\n\nAll tests completed!');
}

test().catch(console.error);
