const mariadb = require('mariadb');
require('dotenv').config({ quiet: true });

const dbUrl = String(process.env.DATABASE_URL || '').replace(/^mysql:/, 'mariadb:');
const json = (value) => JSON.stringify(value, (_, item) => (
  typeof item === 'bigint' ? Number(item) : item
), 2);

async function main() {
  if (!dbUrl || !/localhost|127\.0\.0\.1/i.test(dbUrl)) {
    throw new Error('ปฏิเสธการทำงาน: DATABASE_URL ต้องเป็น localhost เท่านั้น');
  }

  const connection = await mariadb.createConnection(dbUrl);
  try {
    const missingCondition = "r.nrls_code IS NULL OR TRIM(r.nrls_code) = ''";
    const [incidentSummary] = await connection.query(`
      SELECT
        COUNT(*) total,
        SUM(CASE WHEN r.riskstore_id IS NULL THEN 1 ELSE 0 END) no_local_risk,
        SUM(CASE WHEN r.riskstore_id IS NOT NULL AND s.riskstore_id IS NULL THEN 1 ELSE 0 END) missing_local_master,
        SUM(CASE WHEN s.riskstore_id IS NOT NULL AND s.status = '0' THEN 1 ELSE 0 END) cancelled_local_risk,
        SUM(CASE WHEN s.riskstore_id IS NOT NULL AND (s.status IS NULL OR s.status <> '0') THEN 1 ELSE 0 END) active_local_risk
      FROM riskregister r
      LEFT JOIN riskstore s ON s.riskstore_id = r.riskstore_id
      WHERE ${missingCondition}
    `);

    const [localRiskSummary] = await connection.query(`
      SELECT
        COUNT(*) total_without_nrls,
        SUM(CASE WHEN status = '0' THEN 1 ELSE 0 END) cancelled,
        SUM(CASE WHEN status IS NULL OR status <> '0' THEN 1 ELSE 0 END) active
      FROM riskstore
      WHERE nrls_code IS NULL OR TRIM(nrls_code) = ''
    `);

    const missingByStatus = await connection.query(`
      SELECT COALESCE(NULLIF(TRIM(r.status_risk), ''), 'ไม่ระบุ') status, COUNT(*) count
      FROM riskregister r
      WHERE ${missingCondition}
      GROUP BY COALESCE(NULLIF(TRIM(r.status_risk), ''), 'ไม่ระบุ')
      ORDER BY count DESC, status
    `);

    const missingByYear = await connection.query(`
      SELECT YEAR(r.date_report) report_year, COUNT(*) count
      FROM riskregister r
      WHERE ${missingCondition}
      GROUP BY YEAR(r.date_report)
      ORDER BY report_year
    `);

    const missingByClassificationStatus = await connection.query(`
      SELECT COALESCE(NULLIF(TRIM(r.classification_status), ''), 'NULL') classification_status, COUNT(*) count
      FROM riskregister r
      WHERE ${missingCondition}
      GROUP BY COALESCE(NULLIF(TRIM(r.classification_status), ''), 'NULL')
      ORDER BY count DESC, classification_status
    `);

    const topUnmappedLocalRisks = await connection.query(`
      SELECT
        r.riskstore_id,
        COALESCE(s.riskstore_name, 'ไม่พบข้อมูลชื่อความเสี่ยงเดิม') local_risk_name,
        COALESCE(s.status, 'NULL') local_risk_status,
        COUNT(*) incident_count
      FROM riskregister r
      LEFT JOIN riskstore s ON s.riskstore_id = r.riskstore_id
      WHERE ${missingCondition}
      GROUP BY r.riskstore_id, s.riskstore_name, s.status
      ORDER BY incident_count DESC, r.riskstore_id
      LIMIT 20
    `);

    const standardPrefixes = await connection.query(`
      SELECT UPPER(LEFT(TRIM(nrls_code), 1)) prefix, COUNT(*) count
      FROM NRLS_riskstore
      WHERE nrls_code IS NOT NULL AND TRIM(nrls_code) <> ''
      GROUP BY UPPER(LEFT(TRIM(nrls_code), 1))
      ORDER BY prefix
    `);

    const mappedIncidentPrefixes = await connection.query(`
      SELECT UPPER(LEFT(TRIM(nrls_code), 1)) prefix, COUNT(*) count
      FROM riskregister
      WHERE nrls_code IS NOT NULL AND TRIM(nrls_code) <> ''
      GROUP BY UPPER(LEFT(TRIM(nrls_code), 1))
      ORDER BY prefix
    `);

    const incompatibleSeverityCondition = `
      (UPPER(LEFT(TRIM(r.nrls_code), 1)) = 'C'
        AND NOT (COALESCE(UPPER(TRIM(r.level_id)), '') REGEXP '^[A-I]$'))
      OR
      (UPPER(LEFT(TRIM(r.nrls_code), 1)) = 'G'
        AND NOT (COALESCE(TRIM(r.level_id), '') REGEXP '^[1-5]$'))
    `;
    const incompatibleSeverityByValue = await connection.query(`
      SELECT
        UPPER(LEFT(TRIM(r.nrls_code), 1)) prefix,
        COALESCE(NULLIF(TRIM(r.level_id), ''), 'NULL') severity,
        COUNT(*) count
      FROM riskregister r
      WHERE r.nrls_code IS NOT NULL
        AND TRIM(r.nrls_code) <> ''
        AND (${incompatibleSeverityCondition})
      GROUP BY
        UPPER(LEFT(TRIM(r.nrls_code), 1)),
        COALESCE(NULLIF(TRIM(r.level_id), ''), 'NULL')
      ORDER BY count DESC, prefix, severity
    `);
    const incompatibleSeverityByStatus = await connection.query(`
      SELECT
        COALESCE(NULLIF(TRIM(r.status_risk), ''), 'ไม่ระบุ') status,
        COUNT(*) count
      FROM riskregister r
      WHERE r.nrls_code IS NOT NULL
        AND TRIM(r.nrls_code) <> ''
        AND (${incompatibleSeverityCondition})
      GROUP BY COALESCE(NULLIF(TRIM(r.status_risk), ''), 'ไม่ระบุ')
      ORDER BY count DESC, status
    `);

    console.log(json({
      generated_at: new Date().toISOString(),
      missing_incidents: incidentSummary,
      local_risk_master: localRiskSummary,
      missing_by_workflow_status: missingByStatus,
      missing_by_classification_status: missingByClassificationStatus,
      missing_by_report_year: missingByYear,
      top_unmapped_local_risks: topUnmappedLocalRisks,
      nrls_standard_code_prefixes: standardPrefixes,
      mapped_incident_code_prefixes: mappedIncidentPrefixes,
      incompatible_severity_by_value: incompatibleSeverityByValue,
      incompatible_severity_by_workflow_status: incompatibleSeverityByStatus,
    }));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
