require('dotenv').config({ quiet: true });

const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { IncidentRcaPolicyService } = require('../dist/src/modules/rca/incident-rca-policy.service');
const { IncidentsService } = require('../dist/src/modules/incidents/incidents.service');
const { RcaService } = require('../dist/src/modules/rca/rca.service');
const { RiskAnalysisService } = require('../dist/src/modules/risk-analysis/risk-analysis.service');
const { CapaService } = require('../dist/src/modules/capa/capa.service');

async function main() {
  if (!/localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL || '') || !/_rollback_test_/i.test(process.env.DATABASE_URL || '')) {
    throw new Error('Smoke test ปฏิเสธการทำงาน: ต้องใช้ฐานสำเนา localhost ที่ชื่อมี _rollback_test_ เท่านั้น');
  }
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const policy = new IncidentRcaPolicyService(prisma);
    const incidents = new IncidentsService(prisma, policy);
    incidents.sendTelegramAlert = async () => undefined;
    const rca = new RcaService(prisma, policy);
    const monitoring = new RiskAnalysisService(prisma);
    const capaService = new CapaService(prisma);
    const admin = { id: 1, userId: 1, role: 'admin', departmentId: 1, cid: 'SMOKE' };
    const nrls = await prisma.nRLS_riskstore.findFirst({ where: { nrls_code: { startsWith: 'C' } } });
    if (!nrls) throw new Error('ไม่พบ Clinical NRLS master สำหรับ smoke test');
    const now = new Date();
    const incident = await incidents.create({
      nrls_code: nrls.nrls_code, riskstore_id: null, level_id: 'G', department_id: '1',
      date_report: now.toISOString(), time_report: now.toISOString(), user_ir_type: 'ทดสอบระบบ',
      detail: 'SMOKE TEST ไม่มีข้อมูลผู้ป่วย', inform_id: 0,
    }, admin);
    await incidents.confirmClassification(incident.id, 'SMOKE confirm classification', admin);
    await incidents.updateStatus(incident.id, 'ตรวจสอบ', admin, 'SMOKE confirm');
    await incidents.updateStatus(incident.id, 'ทบทวน', admin, 'SMOKE review');
    const profile = await monitoring.create({
      nrls_code: nrls.nrls_code, risk_code: nrls.nrls_code, risk_title: nrls.name,
      scope_level: 'department', scope_identifier: `SMOKE-${incident.id}`, department_id: '1',
      initial_likelihood: 1, initial_consequence: 4, status: 'open',
    }, admin);
    const standard = await rca.createStandard({
      incident_id: incident.id, topic: 'ignored-client-topic', status: 'IN_PROGRESS', created_by: 1,
      capas: [{ action: 'SMOKE corrective action', type: 'CORRECTIVE', responsible: 'SMOKE owner', due_date: now.toISOString(), status: 'PENDING', evidence: '' }],
    }, admin);
    const capas = await capaService.findAll(admin, { nrls_code: nrls.nrls_code });
    const capa = capas.find((item) => item.source_id === standard.id);
    if (!capa || capa.incident_id !== incident.id || capa.risk_analysis_id !== profile.id) throw new Error('CAPA linkage smoke check failed');
    const periodStart = new Date(now.getTime() - 30 * 86400000);
    const review = await monitoring.addReview(profile.id, {
      review_date: now.toISOString(), period_start: periodStart.toISOString(), period_end: now.toISOString(),
      result_of_review: 'SMOKE monitoring review', current_likelihood: 1, current_consequence: 4,
    }, admin);
    await capaService.update(capa.id, { status: 'COMPLETED', evidence: 'SMOKE evidence' }, admin);
    await rca.updateStandard(standard.id, { status: 'COMPLETED' }, admin);
    const closed = await incidents.updateStatus(incident.id, 'จำหน่าย', admin, 'SMOKE close after RCA completion');
    console.log(JSON.stringify({
      database: 'rollback-test-copy', incident_id: incident.id, nrls_code: nrls.nrls_code,
      rca_id: standard.id, capa_id: capa.id, risk_analysis_id: profile.id, review_id: review.id,
      final_incident_status: closed.status_risk, result: 'PASS',
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

const keepAlive = setInterval(() => {}, 1000);
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; }).finally(() => clearInterval(keepAlive));
