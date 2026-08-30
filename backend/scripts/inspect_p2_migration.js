require('dotenv').config();
const mariadb = require('mariadb');

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
    for (const [table, column] of [
      ['riskreview', 'contributing_factors'],
      ['riskregister', 'operational_closed_at'],
      ['capa_action', 'effectiveness_status'],
    ]) {
      const rows = await connection.query(
        'SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, column],
      );
      console.log(`${table}.${column}: ${Number(rows[0].count) ? 'present' : 'absent'}`);
    }
    const migrations = await connection.query(
      "SELECT migration_name, finished_at, rolled_back_at, logs IS NOT NULL AS has_logs FROM _prisma_migrations WHERE migration_name LIKE '20260828%' ORDER BY started_at",
    );
    console.log(migrations);
    const lifecycle = await connection.query(
      `SELECT
         SUM(CASE WHEN status_risk IN ('จำหน่าย', 'ไม่ใช่ความเสี่ยง') THEN 1 ELSE 0 END) AS terminal_incidents,
         SUM(CASE WHEN status_risk IN ('จำหน่าย', 'ไม่ใช่ความเสี่ยง') AND operational_closed_at IS NULL THEN 1 ELSE 0 END) AS terminal_without_operational_close,
         SUM(CASE WHEN improvement_status = 'MONITORING' THEN 1 ELSE 0 END) AS monitoring,
         SUM(CASE WHEN improvement_status = 'CLOSED' THEN 1 ELSE 0 END) AS effectiveness_closed
       FROM riskregister`,
    );
    const p2Counts = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM incident_review_entry) AS structured_reviews,
         (SELECT COUNT(*) FROM capa_effectiveness_review) AS effectiveness_reviews,
         (SELECT COUNT(*) FROM sla_instance WHERE status = 'ACTIVE') AS active_slas,
         (SELECT COUNT(*) FROM escalation_event) AS escalations`,
    );
    console.log({ lifecycle: lifecycle[0], p2: p2Counts[0] });
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
