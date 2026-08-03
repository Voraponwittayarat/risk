const mariadb = require('mariadb');

async function fixDb() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      multipleStatements: true
    });
    
    console.log('Connected successfully. Repairing tables...');
    
    // Repair corrupted mysql tables
    await conn.query('REPAIR TABLE mysql.db;');
    await conn.query('REPAIR TABLE mysql.user;');
    await conn.query('REPAIR TABLE mysql.tables_priv;');
    await conn.query('REPAIR TABLE mysql.columns_priv;');
    await conn.query('REPAIR TABLE mysql.procs_priv;');
    
    console.log('Tables repaired. Creating new user "risk"...');
    
    // Create new user safely
    await conn.query(`
      CREATE USER IF NOT EXISTS 'risk'@'localhost' IDENTIFIED BY 'risk1234';
      GRANT ALL PRIVILEGES ON *.* TO 'risk'@'localhost' WITH GRANT OPTION;
      FLUSH PRIVILEGES;
    `);
    
    console.log('User created successfully!');
    
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    if (conn) conn.end();
  }
}

fixDb();
