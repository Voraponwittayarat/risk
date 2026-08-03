const mariadb = require('mariadb');
const pool = mariadb.createPool('mariadb://root@localhost:3306/riskhospital');

pool.getConnection()
  .then(conn => {
    console.log('Successfully connected!');
    conn.release();
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
  });
