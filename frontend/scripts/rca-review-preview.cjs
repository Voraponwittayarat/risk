// Local UI fixture only. Never connects to a database or production API.
// Run after npm run build: node scripts/rca-review-preview.cjs
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const departments = [{ id: 15, depart_name: 'หน่วยงานทดสอบระบบ' }];
const incident = { id: 90001, id_risk: 99001, rm_no: '99001', nrls_code: 'TEST001',
  department_id: '15', incident_topic: 'ข้อมูลสมมติสำหรับทดสอบการค้นหา',
  incident_description: 'ทดสอบการทำงานของโปรแกรม ไม่มีข้อมูลผู้ป่วย', level_id: 'C', date_report: '2026-09-22', classification_status: 'CONFIRMED' };
const records = [{ id: 'RCA-TEST-CLOSED', incident_id: 90002, incident_id_risk: 99002, rm_no: '99002', department_id: '15',
  nrls_code: 'TEST002', topic: 'ข้อมูลสมมติที่ทบทวนแล้ว', what_happened: 'รายการสำหรับทดสอบการค้นหาประวัติ', status: 'COMPLETED',
  completed_at: '2026-09-22', version: 0, timelines: [], capas: [], participants: [], voice_of_staff_entries: [] }];
let patches = 0;
let profile = null;
function json(res, value, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4180');
  const route = url.pathname;
  let body = '';
  for await (const chunk of req) body += chunk;
  let data;
  try { data = body ? JSON.parse(body) : {}; } catch { return json(res, { message: 'Invalid JSON' }, 400); }
  if (route === '/auth/login') {
    const user = { id: 7, sub: 7, name: 'ผู้ใช้ทดสอบ', role: 'rm_committee', rmScope: 'department', departmentId: 15, department_id: 15, exp: Math.floor(Date.now()/1000)+7200 };
    const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(user)).toString('base64url')}.fixture`;
    return json(res, { access_token: token, user });
  }
  if (route === '/__fixture/status') return json(res, { patches, records: records.length });
  if (route === '/rca/collaboration-options') return json(res, { departments, teams: [{ id: 1, team_name: 'ทีมทดสอบ' }] });
  if (route === '/departments') return json(res, departments);
  if (route === '/rca/standard-candidates') return json(res, [incident]);
  if (route === '/incidents/90001') return json(res, incident);
  if (route === '/rca/overview-stats') return json(res, { pending_capas: 0, overdue_capas: 0 });
  if (route === '/rca/cases' || route === '/rca/incident-reviews' || route === '/capa') return json(res, []);
  if (route === '/risk-analysis') return json(res, profile ? [profile] : []);
  if (route === '/rca/standard') {
    if (req.method === 'POST') { const record = { ...data, id: 'RCA-TEST-DRAFT', version: 0, status: 'IN_PROGRESS', department_id: '15', can_edit: true, can_complete: true, can_view_voice: true, can_manage_team: true, draft_register: JSON.stringify(data.draft_register) }; records.push(record); return json(res, record); }
    return json(res, records);
  }
  if (route.startsWith('/rca/standard/')) {
    const id = route.split('/')[3];
    const record = records.find(r => r.id === id);
    if (!record) return json(res, { message: 'ไม่พบรายการทดสอบ' }, 404);
    if (req.method === 'PATCH') {
      if (data.expected_version !== record.version) return json(res, { message: 'ข้อมูลเปลี่ยนแล้ว' }, 409);
      patches++;
      Object.assign(record, data, { version: record.version + 1, draft_register: JSON.stringify(data.draft_register) });
    }
    return json(res, record);
  }
  if (route.startsWith('/assets/')) {
    const file = path.resolve(root, '.' + route);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return json(res, {}, 404);
    res.writeHead(200, { 'Content-Type': file.endsWith('.css') ? 'text/css' : 'application/javascript' });
    return fs.createReadStream(file).pipe(res);
  }
  if (req.headers.accept?.includes('text/html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(root, 'index.html')).pipe(res);
  }
  return json(res, []);
}).listen(4180, '127.0.0.1', () => console.log('Synthetic RCA UI fixture: http://127.0.0.1:4180 — no database or production access'));
