const mysql = require('mysql2/promise');
async function run() {
  try {
    const pool = mysql.createPool({
      uri: 'mysql://2DAFoXqsN9Masm9.root:Jxjyr5laRZauDXZk@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test',
      ssl: { rejectUnauthorized: true }
    });
    const [rows] = await pool.query('select `id`, `openId`, `name`, `email`, `loginMethod`, `role`, `twoFactorEnabled`, `twoFactorSecret`, `passwordHash`, `resetToken`, `resetTokenExpires`, `emailOtp`, `emailOtpExpires`, `failedLoginAttempts`, `lockoutUntil`, `isActive`, `lastSignedIn`, `createdAt`, `updatedAt` from `users` limit 1');
    console.log('success!', rows);
    process.exit(0);
  } catch(x) {
    console.error('SQL ERROR:', x.message);
    process.exit(1);
  }
}
run();
