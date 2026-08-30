require('dotenv').config();
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const connection = await mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  try {
    const tables = ['riskregister', 'capa_action', 'riskreview', 'rca_case', 'standard_rca_case'];
    const snapshot = {};
    for (const table of tables) {
      snapshot[table] = await connection.query(`SELECT * FROM ${table}`);
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const output = path.join(__dirname, '..', 'backups', `p2-closed-loop-${stamp}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ created_at: new Date().toISOString(), tables: snapshot }, null, 2));
    console.log(output);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
