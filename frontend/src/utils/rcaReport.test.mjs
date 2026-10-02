import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRcaReportSections, buildRcaReportHtml, buildRcaWordDocument } from './rcaReport.ts';
const draft = () => ({ caseId: 'TEST', rmNo: '', topic: 'ทดสอบ', severity: 'E', incidentDate: '', team: '', department: '', whatHappened: '', actualImpact: '', potentialImpact: '', timelines: [], cmps: [], processes: [], capas: [], sessions: [], participants: [], interviews: [], factors: [], legacyFactors: [], barriers: [] });
test('omits unused tools, blank rows and columns, preserves filled clinical facts and selected sections', () => {
  const d = draft();
  d.timelines = [{ event_time: '', event_description: '' }, { event_time: '08:00', event_description: 'เหตุการณ์' }];
  d.cmps = [{ observation: '', hypothesis: '', comment: '' }];
  d.capas = [{ action: 'ตรวจซ้ำ', responsible: 'หน่วยงานทดสอบ' }];
  const sections = getRcaReportSections(d);
  assert.deepEqual(sections.map(s => s.id), ['facts', 'timeline', 'actions']);
  assert.ok(!sections[1].html.includes('<th>วันที่</th>'));
  const html = buildRcaReportHtml(sections, ['facts', 'actions']);
  assert.ok(html.includes('ตรวจซ้ำ')); assert.ok(!html.includes('08:00')); assert.ok(!html.includes('<details'));
});
test('escapes markup and preserves multiline interviews without executing event attributes', () => {
  const d = draft(); d.topic = '<img src=x onerror=alert(1)>';
  d.interviews = [{ key_points: 'บรรทัดแรก\n<script>alert(1)</script>' }];
  const sections = getRcaReportSections(d);
  const html = buildRcaReportHtml(sections, sections.map(s => s.id));
  assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('บรรทัดแรก<br>&lt;script&gt;'));
});
test('keeps factors linked to an otherwise blank process and does not duplicate them', () => {
  const d = draft(); d.processes = [{ process_key: 'การประเมิน', problem: '' }];
  d.factors = [{ code: 'F0001', process_key: 'การประเมิน', detail: 'พักผ่อนไม่เพียงพอ' }];
  const sections = getRcaReportSections(d);
  assert.ok(sections.find(s => s.id === 'processes').html.includes('พักผ่อนไม่เพียงพอ'));
  assert.ok(!sections.some(s => s.id === 'factors'));
});
test('does not export an unused CAPA with only automatically populated dates', () => {
  const d = draft(); d.capas = [{ action: '', due_date: '2026-11-01', effectiveness_due_date: '2026-12-01' }];
  assert.deepEqual(getRcaReportSections(d).map(s => s.id), ['facts']);
});
test('merges consecutive timeline dates while preserving order and unknown-date boundaries', () => {
  const d = draft(); d.timelines = ['2026-10-02', '2026-10-02', '', '2026-10-02', '2026-10-03'].map((event_date, i) => ({ event_date, event_time: `${i}`, event_description: `เหตุการณ์ ${i}` }));
  const html = getRcaReportSections(d).find(s => s.id === 'timeline').html;
  assert.ok(html.includes('rowspan="2"'));
  assert.equal((html.match(/2 ต.ค. 2569/g) || []).length, 2);
  for (let i = 0; i < 5; i++) assert.ok(html.includes(`เหตุการณ์ ${i}`));
});
test('embeds official logo in Word package and uses Sarabun 14pt in report', () => {
  const html = buildRcaReportHtml([], [], 'RCA TEST', { logo: 'data:image/png;base64,aGVsbG8=', regular: 'data:font/ttf;base64,eA==', bold: 'data:font/ttf;base64,eA==' });
  assert.ok(html.includes("font-family:'TH SarabunPSK'")); assert.ok(html.includes('font-size:14pt'));
  const doc = buildRcaWordDocument(html);
  assert.ok(doc.includes('multipart/related')); assert.ok(doc.includes('Content-Type: image/png'));
  const encoded = doc.split('Content-Location: file:///C:/RCA-report.html\r\n\r\n')[1].split('\r\n------RiskHRMSRcaReport')[0];
  const body = Buffer.from(encoded.replace(/\s/g, ''), 'base64').toString('utf8');
  assert.ok(body.includes('src="file:///C:/RCA-report-assets/logo.png"'));
  assert.ok(body.includes('โรงพยาบาลวังเจ้า'));
});
