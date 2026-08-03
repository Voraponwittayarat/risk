const mysql = require('mysql2/promise');

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: '172.20.250.202',
      user: 'wangchao',
      password: 'wangchao27443',
      database: 'riskhospital',
      port: 3306
    });

    console.log('Connected to remote DB!');
    
    const [users] = await connection.execute('SELECT * FROM user WHERE username = "panupong"');
    console.log('Panupong user:', users);

    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

main();
