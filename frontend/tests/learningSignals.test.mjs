import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStandardDepartments } from '../src/utils/standardSignals.ts';
import { getImprovementProgress } from '../src/utils/incidentProgress.ts';

const department = (id, count, severe = 0) => ({ id, name: `Test ${id}`, count, severe });
test('unrelated NRLS codes reported once in one department do not become repeats', () => {
  const result = summarizeStandardDepartments([
    { departments: [department('1', 1)] },
    { departments: [department('1', 1)] },
  ]);
  assert.equal(result.repeatedDepartments, 0);
  assert.equal(result.departments[0].count, 2);
});
test('each department with same-code repeats is counted once across codes', () => {
  const result = summarizeStandardDepartments([
    { departments: [department('1', 2), department('2', 1)] },
    { departments: [department('1', 3), department('2', 2, 1)] },
  ]);
  assert.equal(result.repeatedDepartments, 2);
  assert.equal(result.departments[0].id, '2');
  assert.equal(result.departments.find(d => d.id === '1').count, 5);
});
test('reports in separate departments are not within-department repeats', () => {
  assert.equal(summarizeStandardDepartments([{ departments: [department('1', 1), department('2', 1)] }]).repeatedDepartments, 0);
});
test('no signals leave empty totals', () => {
  assert.deepEqual(summarizeStandardDepartments([]), { departments: [], repeatedDepartments: 0 });
});
test('operational closure alone never establishes effectiveness', () => {
  assert.equal(getImprovementProgress('MONITORING').label, 'กำลังติดตามมาตรการ');
  assert.equal(getImprovementProgress('CLOSED').label, 'ปิดการติดตามมาตรการแล้ว');
  assert.ok(!getImprovementProgress('CLOSED').label.includes('ได้ผล'));
  assert.ok(getImprovementProgress(undefined).label.includes('ยังไม่มีข้อมูล'));
  assert.ok(getImprovementProgress('NOT_REQUIRED').label.includes('ไม่มีมาตรการที่อยู่ระหว่างติดตาม'));
});
