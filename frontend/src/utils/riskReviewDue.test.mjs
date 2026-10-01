import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewDue } from './riskReviewDue.ts';

const now = new Date('2026-10-01T18:00:00Z'); // October 2 in Bangkok
test('uses Bangkok calendar day, not elapsed 24-hour periods', () => {
  assert.equal(reviewDue('2026-10-01', now).label, 'เกินกำหนด 1 วัน');
  assert.equal(reviewDue('2026-10-02', now).label, 'ครบกำหนดวันนี้');
  assert.equal(reviewDue('2026-10-01T17:00:00Z', now).label, 'ครบกำหนดวันนี้');
});
test('distinguishes the 30-day boundary and future dates', () => {
  assert.equal(reviewDue('2026-11-01', now).label, 'ใกล้ถึงกำหนด อีก 30 วัน');
  assert.equal(reviewDue('2026-11-02', now).label, 'อีก 31 วัน');
  assert.notEqual(reviewDue('2026-10-01', now).className, reviewDue('2026-10-03', now).className);
});
test('handles unset and invalid dates without misleading deadlines', () => {
  for (const value of [undefined, null, '', 'invalid']) {
    assert.equal(reviewDue(value, now).label, 'ยังไม่กำหนดวันทบทวน');
  }
});
