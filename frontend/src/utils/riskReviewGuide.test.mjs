import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewSummary, reviewEvidence, reviewPeriodStart } from './riskReviewGuide.ts';

test('preserves review narratives under separate headings in existing API field', () => {
  const summary = reviewSummary(' ตรวจ 8/10 ', 'พบซ้ำ 2 ครั้ง\nข้อจำกัด: ข้อมูลไม่ครบ', 'RCA-1: ปรับขั้นตอน');
  assert.ok(summary.includes('Process):\nตรวจ 8/10'));
  assert.ok(summary.includes('Results):\nพบซ้ำ 2 ครั้ง\nข้อจำกัด: ข้อมูลไม่ครบ'));
  assert.ok(summary.endsWith('RCA-1: ปรับขั้นตอน'));
});
test('legacy or malformed snapshots do not break review history', () => {
  for (const snapshot of [null, undefined, '', '{invalid', '{}', '{"effectiveness_evidence":42}']) assert.equal(reviewEvidence(snapshot), '');
  assert.equal(reviewEvidence('{"effectiveness_evidence":"audit 9/10"}'), 'audit 9/10');
});
test('uses last review or one year baseline with leap-day clamping', () => {
  assert.equal(reviewPeriodStart('2026-07-01T00:00:00Z', '2026-10-01'), '2026-07-01');
  assert.equal(reviewPeriodStart(null, '2026-10-01'), '2025-10-01');
  assert.equal(reviewPeriodStart(null, '2024-02-29'), '2023-02-28');
});
