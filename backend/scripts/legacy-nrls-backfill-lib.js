const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const reportDir = path.resolve(__dirname, '..', 'reports', 'nrls-backfill');
const dbUrl = String(process.env.DATABASE_URL || '').replace(/^mysql:/, 'mariadb:');
const json = (value) => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? Number(v) : v, 2);
const scalar = async (conn, sql, params = []) => Number(Object.values((await conn.query(sql, params))[0])[0]);
const safeRunId = (value) => {
  const id = value || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(id)) throw new Error('run-id ไม่ถูกต้อง');
  return id;
};

async function connect() {
  if (!dbUrl || !/localhost|127\.0\.0\.1/i.test(dbUrl)) throw new Error('ปฏิเสธการทำงาน: DATABASE_URL ต้องเป็น localhost เท่านั้น');
  return mariadb.createConnection(dbUrl);
}

async function audit(conn) {
  const summary = {
    total_incidents: await scalar(conn, 'SELECT COUNT(*) FROM riskregister'),
    with_nrls: await scalar(conn, "SELECT COUNT(*) FROM riskregister WHERE nrls_code IS NOT NULL AND nrls_code <> ''"),
    without_nrls: await scalar(conn, "SELECT COUNT(*) FROM riskregister WHERE nrls_code IS NULL OR nrls_code = ''"),
    valid_nrls: await scalar(conn, "SELECT COUNT(*) FROM riskregister r JOIN NRLS_riskstore n ON n.nrls_code=r.nrls_code WHERE r.nrls_code IS NOT NULL AND r.nrls_code<>''"),
    invalid_nrls: await scalar(conn, "SELECT COUNT(*) FROM riskregister r LEFT JOIN NRLS_riskstore n ON n.nrls_code=r.nrls_code WHERE r.nrls_code IS NOT NULL AND r.nrls_code<>'' AND n.nrls_code IS NULL"),
    auto_mappable: await scalar(conn, "SELECT COUNT(*) FROM riskregister r JOIN riskstore s ON s.riskstore_id=r.riskstore_id JOIN NRLS_riskstore n ON n.nrls_code=s.nrls_code WHERE (r.nrls_code IS NULL OR r.nrls_code='') AND s.nrls_code IS NOT NULL AND s.nrls_code<>''"),
    unmapped_local_risk: await scalar(conn, "SELECT COUNT(*) FROM riskregister r LEFT JOIN riskstore s ON s.riskstore_id=r.riskstore_id WHERE (r.nrls_code IS NULL OR r.nrls_code='') AND (r.riskstore_id IS NULL OR s.nrls_code IS NULL OR s.nrls_code='')"),
    program_matches: await scalar(conn, 'SELECT COUNT(*) FROM riskregister r JOIN NRLS_riskstore n ON n.nrls_code=COALESCE(NULLIF(r.nrls_code,\'\'),(SELECT s.nrls_code FROM riskstore s WHERE s.riskstore_id=r.riskstore_id LIMIT 1)) WHERE r.program_id <=> n.program_id'),
    program_mismatches: await scalar(conn, 'SELECT COUNT(*) FROM riskregister r JOIN NRLS_riskstore n ON n.nrls_code=COALESCE(NULLIF(r.nrls_code,\'\'),(SELECT s.nrls_code FROM riskstore s WHERE s.riskstore_id=r.riskstore_id LIMIT 1)) WHERE NOT (r.program_id <=> n.program_id)'),
    severity_compatible: await scalar(conn, "SELECT COUNT(*) FROM riskregister r JOIN NRLS_riskstore n ON n.nrls_code=COALESCE(NULLIF(r.nrls_code,''),(SELECT s.nrls_code FROM riskstore s WHERE s.riskstore_id=r.riskstore_id LIMIT 1)) WHERE (n.nrls_code LIKE 'C%' AND UPPER(r.level_id) REGEXP '^[A-I]$') OR (n.nrls_code LIKE 'G%' AND r.level_id REGEXP '^[1-5]$')"),
    severity_incompatible: await scalar(conn, "SELECT COUNT(*) FROM riskregister r JOIN NRLS_riskstore n ON n.nrls_code=COALESCE(NULLIF(r.nrls_code,''),(SELECT s.nrls_code FROM riskstore s WHERE s.riskstore_id=r.riskstore_id LIMIT 1)) WHERE NOT ((n.nrls_code LIKE 'C%' AND UPPER(r.level_id) REGEXP '^[A-I]$') OR (n.nrls_code LIKE 'G%' AND r.level_id REGEXP '^[1-5]$'))"),
    local_mapping_conflicts: await scalar(conn, "SELECT COUNT(*) FROM riskregister r JOIN riskstore s ON s.riskstore_id=r.riskstore_id WHERE r.nrls_code IS NOT NULL AND r.nrls_code<>'' AND s.nrls_code IS NOT NULL AND s.nrls_code<>r.nrls_code"),
    duplicate_id_values: await scalar(conn, 'SELECT COUNT(*) FROM (SELECT id FROM riskregister GROUP BY id HAVING COUNT(*)>1) x'),
    duplicate_composite_keys: await scalar(conn, 'SELECT COUNT(*) FROM (SELECT id,id_risk FROM riskregister GROUP BY id,id_risk HAVING COUNT(*)>1) x'),
  };
  const classification = await conn.query("SELECT COALESCE(classification_status,'NULL') status, COUNT(*) count FROM riskregister GROUP BY classification_status ORDER BY status");
  const programMismatches = await conn.query(`SELECT r.id incident_id,r.id_risk,r.riskstore_id,s.riskstore_name local_risk_name,
    COALESCE(NULLIF(r.nrls_code,''),s.nrls_code) nrls_code,n.name nrls_name,r.program_id old_program_id,p1.program_name old_program_name,
    n.program_id nrls_program_id,p2.program_name nrls_program_name,r.level_id severity,r.date_report,r.department_id,
    'NEEDS_REVIEW: ยืนยัน program ผ่าน Classification endpoint' recommended_action
    FROM riskregister r LEFT JOIN riskstore s ON s.riskstore_id=r.riskstore_id
    JOIN NRLS_riskstore n ON n.nrls_code=COALESCE(NULLIF(r.nrls_code,''),s.nrls_code)
    LEFT JOIN program p1 ON p1.program_id=r.program_id LEFT JOIN program p2 ON p2.program_id=n.program_id
    WHERE NOT (r.program_id <=> n.program_id) ORDER BY r.id`);
  const candidates = await conn.query(`SELECT r.id incident_id,r.id_risk,r.riskstore_id,s.nrls_code,n.name nrls_name,
    r.program_id old_program_id,n.program_id nrls_program_id,r.level_id severity,r.department_id,
    CASE WHEN NOT (r.program_id <=> n.program_id) THEN 'PROGRAM_MISMATCH' ELSE 'DETERMINISTIC' END reason
    FROM riskregister r JOIN riskstore s ON s.riskstore_id=r.riskstore_id JOIN NRLS_riskstore n ON n.nrls_code=s.nrls_code
    WHERE r.nrls_code IS NULL OR r.nrls_code='' ORDER BY r.id`);
  return { generated_at: new Date().toISOString(), database: 'localhost', summary, classification_status: classification, candidates, program_mismatches: programMismatches };
}

async function ensureBackupTable(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS legacy_nrls_backfill_backup (
    run_id VARCHAR(50) NOT NULL, incident_id INT NOT NULL, id_risk INT NOT NULL,
    old_nrls_code VARCHAR(50) NULL, old_nrls_name_snapshot TEXT NULL, old_classification_status VARCHAR(20) NULL,
    old_program_id INT NULL, backed_up_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id,incident_id,id_risk)) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS legacy_nrls_backfill_run (
    run_id VARCHAR(50) NOT NULL,total_rows_before INT NOT NULL,composite_rows_before INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(run_id)) ENGINE=InnoDB`);
}

async function backup(conn, runId, candidates) {
  await ensureBackupTable(conn);
  await conn.query(`INSERT IGNORE INTO legacy_nrls_backfill_run (run_id,total_rows_before,composite_rows_before)
    SELECT ?,COUNT(*),COUNT(DISTINCT CONCAT(id,':',id_risk)) FROM riskregister`, [runId]);
  await conn.query(`INSERT IGNORE INTO legacy_nrls_backfill_backup
    (run_id,incident_id,id_risk,old_nrls_code,old_nrls_name_snapshot,old_classification_status,old_program_id)
    SELECT ?,r.id,r.id_risk,r.nrls_code,r.nrls_name_snapshot,r.classification_status,r.program_id
    FROM riskregister r JOIN riskstore s ON s.riskstore_id=r.riskstore_id
    JOIN NRLS_riskstore n ON n.nrls_code=s.nrls_code
    WHERE r.nrls_code IS NULL OR r.nrls_code=''`, [runId]);
}

async function apply(conn, runId, report, batchSize) {
  await backup(conn, runId, report.candidates);
  let updated = 0;
  for (let offset = 0; offset < report.candidates.length; offset += batchSize) {
    const batch = report.candidates.slice(offset, offset + batchSize);
    await conn.beginTransaction();
    try {
      for (const c of batch) {
        const status = c.reason === 'DETERMINISTIC' ? 'AUTO_MAPPED' : 'NEEDS_REVIEW';
        const result = await conn.query(`UPDATE riskregister SET nrls_code=?,nrls_name_snapshot=?,classification_status=?,classified_at=NOW()
          WHERE id=? AND id_risk=? AND (nrls_code IS NULL OR nrls_code='')`, [c.nrls_code, c.nrls_name, status, c.incident_id, c.id_risk]);
        if (result.affectedRows) {
          updated += result.affectedRows;
          await conn.query(`INSERT INTO incident_classification_audit
            (incident_id,id_risk,old_nrls_code,new_nrls_code,old_riskstore_id,new_riskstore_id,reason,changed_at)
            VALUES (?,?,NULL,?,?,?,?,NOW())`, [c.incident_id,c.id_risk,c.nrls_code,c.riskstore_id,c.riskstore_id,'auto-backfill จาก local risk mapping; ไม่แก้ program เดิม']);
        }
      }
      await conn.commit();
    } catch (error) { await conn.rollback(); throw error; }
  }
  return updated;
}

async function verify(conn, runId) {
  const runRows = await conn.query('SELECT total_rows_before,composite_rows_before FROM legacy_nrls_backfill_run WHERE run_id=?', [runId]);
  if (!runRows.length) throw new Error('ไม่พบ metadata ของ run-id นี้');
  const totalRowsAfter = await scalar(conn, 'SELECT COUNT(*) FROM riskregister');
  const compositeRowsAfter = await scalar(conn, "SELECT COUNT(DISTINCT CONCAT(id,':',id_risk)) FROM riskregister");
  const backedUp = await scalar(conn, 'SELECT COUNT(*) FROM legacy_nrls_backfill_backup WHERE run_id=?', [runId]);
  const migrated = await scalar(conn, `SELECT COUNT(*) FROM legacy_nrls_backfill_backup b JOIN riskregister r ON r.id=b.incident_id AND r.id_risk=b.id_risk
    JOIN NRLS_riskstore n ON n.nrls_code=r.nrls_code WHERE b.run_id=?`, [runId]);
  const invalid = await scalar(conn, `SELECT COUNT(*) FROM legacy_nrls_backfill_backup b JOIN riskregister r ON r.id=b.incident_id AND r.id_risk=b.id_risk
    LEFT JOIN NRLS_riskstore n ON n.nrls_code=r.nrls_code WHERE b.run_id=? AND n.nrls_code IS NULL`, [runId]);
  const snapshotMismatch = await scalar(conn, `SELECT COUNT(*) FROM legacy_nrls_backfill_backup b JOIN riskregister r ON r.id=b.incident_id AND r.id_risk=b.id_risk
    JOIN NRLS_riskstore n ON n.nrls_code=r.nrls_code WHERE b.run_id=? AND NOT (r.nrls_name_snapshot <=> n.name)`, [runId]);
  const auditCount = await scalar(conn, `SELECT COUNT(*) FROM incident_classification_audit a JOIN legacy_nrls_backfill_backup b
    ON b.incident_id=a.incident_id AND b.id_risk=a.id_risk WHERE b.run_id=? AND a.reason LIKE 'auto-backfill%'`, [runId]);
  return { run_id: runId, total_rows_before: Number(runRows[0].total_rows_before), total_rows_after: totalRowsAfter,
    composite_rows_before: Number(runRows[0].composite_rows_before), composite_rows_after: compositeRowsAfter,
    row_count_unchanged: Number(runRows[0].total_rows_before) === totalRowsAfter,
    composite_count_unchanged: Number(runRows[0].composite_rows_before) === compositeRowsAfter,
    backed_up: backedUp, migrated_valid: migrated, invalid_nrls: invalid, snapshot_mismatch: snapshotMismatch, audit_count: auditCount };
}

async function rollback(conn, runId) {
  await conn.beginTransaction();
  try {
    const result = await conn.query(`UPDATE riskregister r JOIN legacy_nrls_backfill_backup b ON b.incident_id=r.id AND b.id_risk=r.id_risk
      SET r.nrls_code=b.old_nrls_code,r.nrls_name_snapshot=b.old_nrls_name_snapshot,
      r.classification_status=b.old_classification_status,r.program_id=b.old_program_id WHERE b.run_id=?`, [runId]);
    await conn.query(`INSERT INTO incident_classification_audit (incident_id,id_risk,old_nrls_code,new_nrls_code,reason,changed_at)
      SELECT r.id,r.id_risk,r.nrls_code,b.old_nrls_code,'rollback legacy NRLS backfill',NOW()
      FROM riskregister r JOIN legacy_nrls_backfill_backup b ON b.incident_id=r.id AND b.id_risk=r.id_risk WHERE b.run_id=?`, [runId]);
    await conn.commit(); return result.affectedRows;
  } catch (error) { await conn.rollback(); throw error; }
}

async function run(defaultMode = 'audit') {
  const args = process.argv.slice(2);
  const mode = args.includes('--apply') ? 'apply' : args.includes('--verify') ? 'verify' : args.includes('--rollback') ? 'rollback' : args.includes('--backup') ? 'backup' : defaultMode;
  const runIdArg = args.find((a) => a.startsWith('--run-id='))?.split('=')[1];
  const runId = safeRunId(runIdArg);
  const batchSize = Math.max(1, Math.min(1000, Number(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || 200)));
  fs.mkdirSync(reportDir, { recursive: true });
  const conn = await connect();
  try {
    if (mode === 'rollback') {
      if (!runIdArg) throw new Error('rollback ต้องระบุ --run-id');
      const restored = await rollback(conn, runId); console.log(json({ mode, run_id: runId, restored })); return;
    }
    if (mode === 'verify') {
      if (!runIdArg) throw new Error('verify ต้องระบุ --run-id');
      const result = await verify(conn, runId); fs.writeFileSync(path.join(reportDir, `verify-${runId}.json`), json(result)); console.log(json(result)); return;
    }
    const report = await audit(conn);
    const auditPath = path.join(reportDir, `audit-${runId}.json`);
    fs.writeFileSync(auditPath, json(report));
    if (mode === 'backup') { await backup(conn, runId, report.candidates); console.log(json({ mode, run_id: runId, rows: report.candidates.length, audit_report: auditPath })); return; }
    if (mode === 'apply') {
      const updated = await apply(conn, runId, report, batchSize);
      const verification = await verify(conn, runId);
      fs.writeFileSync(path.join(reportDir, `verify-${runId}.json`), json(verification));
      console.log(json({ mode, run_id: runId, updated, audit_report: auditPath, verification })); return;
    }
    console.log(json({ mode: 'dry-run', run_id: runId, audit_report: auditPath, summary: report.summary }));
  } finally { await conn.end(); }
}

module.exports = { run };
