import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRcaReportSections, buildRcaReportHtml } from './rcaReport.ts';
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
