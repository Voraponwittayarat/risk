require('dotenv').config();
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const connection = await mariadb.createConnection({
    host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: url.pathname.slice(1),
  });
  try {
    const [riskregister, targetIncidents, localMappings, nrlsMaster] = await Promise.all([
      connection.query('SELECT * FROM riskregister ORDER BY id, id_risk'),
      connection.query('SELECT * FROM riskregister WHERE id BETWEEN 13554 AND 13558 ORDER BY id'),
      connection.query('SELECT riskstore_id,riskstore_name,nrls_code,program_id,type_id FROM riskstore WHERE nrls_code IS NOT NULL ORDER BY riskstore_id'),
      connection.query('SELECT * FROM NRLS_riskstore ORDER BY nrls_code'),
    ]);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const output = path.join(__dirname, '..', 'backups', `nrls-phase1-${stamp}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ created_at: new Date().toISOString(), riskregister, targetIncidents, localMappings, nrlsMaster }, null, 2));
    console.log(output);
  } finally { await connection.end(); }
}
main().catch((error) => { console.error(error.message); process.exit(1); });
