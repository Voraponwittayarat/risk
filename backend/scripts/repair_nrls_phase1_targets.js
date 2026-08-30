require('dotenv').config();
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
  const selectSql = `SELECT rr.id,rr.id_risk,rr.nrls_code,rr.riskstore_id,rs.nrls_code local_nrls,rr.program_id,n.program_id nrls_program,rr.level_id,rr.classification_status,rr.nrls_name_snapshot,n.name nrls_name FROM riskregister rr LEFT JOIN riskstore rs ON rs.riskstore_id=rr.riskstore_id LEFT JOIN NRLS_riskstore n ON n.nrls_code=rr.nrls_code WHERE rr.id BETWEEN 13554 AND 13558 ORDER BY rr.id`;
  try {
    const before = await db.query(selectSql);
    await db.beginTransaction();
    for (const row of before) {
      let code = row.nrls_code;
      let localId = row.riskstore_id;
      if (code === 'PT/02' && row.local_nrls === 'CPP405') code = 'CPP405';
      const [master] = await db.query('SELECT nrls_code,name,program_id FROM NRLS_riskstore WHERE nrls_code=? LIMIT 1', [code]);
      if (!master) throw new Error(`Incident ${row.id}: ไม่พบ NRLS master สำหรับ ${code}`);
      const [local] = localId ? await db.query('SELECT nrls_code FROM riskstore WHERE riskstore_id=? LIMIT 1', [localId]) : [];
      if (localId && (!local || local.nrls_code !== code)) localId = null;
      await db.query('UPDATE riskregister SET nrls_code=?,nrls_name_snapshot=?,program_id=?,riskstore_id=?,classification_status=? WHERE id=? AND id_risk=?', [code, master.name, master.program_id, localId, 'NEEDS_REVIEW', row.id, row.id_risk]);
      if (code !== row.nrls_code || localId !== row.riskstore_id) {
        await db.query('INSERT INTO incident_classification_audit (incident_id,id_risk,old_nrls_code,new_nrls_code,old_riskstore_id,new_riskstore_id,reason) VALUES (?,?,?,?,?,?,?)', [row.id,row.id_risk,row.nrls_code,code,row.riskstore_id,localId,'ปรับข้อมูลเป้าหมายระยะที่ 1 ตาม NRLS master; คง severity เดิมเพื่อรอตรวจสอบ']);
      }
    }
    await db.commit();
    const after = await db.query(selectSql);
    const output = path.join(__dirname, '..', 'backups', `nrls-phase1-targets-before-after-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(output, JSON.stringify({ created_at: new Date().toISOString(), before, after }, null, 2));
    console.log(output);
  } catch (error) { await db.rollback(); throw error; } finally { await db.end(); }
}
main().catch((error) => { console.error(error.message); process.exit(1); });
