import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTimelineEvidence, importTimeline } from './timelineEvidence.ts';

test('preserves original facts, Buddhist dates, Thai digits and missing times without inventing harm', () => {
  const text = '๒/๑๐/๒๕๖๙ ๐๘.๓๐ ตรวจอุปกรณ์ ไม่พบผลกระทบ\nยังไม่ได้ใช้อุปกรณ์';
  const rows = extractTimelineEvidence(text);
  assert.equal(rows[0].event_date, '2026-10-02');
  assert.equal(rows[0].event_time, '08:30');
  assert.equal(rows[0].event_description, text.split('\n')[0]);
  assert.equal(rows[0].source_text, text.split('\n')[0]);
  assert.equal(rows[1].event_time, '');
  assert.equal(rows[1].event_date, '');
  assert.equal(rows[1].is_critical_point, false);
});
test('uses only explicit date headers and cites them; invalid/multiple dates do not propagate', () => {
  const rows = extractTimelineEvidence('วันที่ 2/10/2569\n08:00 เริ่ม\n31/2/2569 09:00 ตรวจ\n10:00 จบ');
  assert.equal(rows[0].event_date, '2026-10-02');
  assert.match(rows[0].source_text, /^วันที่ 2\/10\/2569\n/);
  assert.equal(rows[1].event_date, '');
  assert.equal(rows[2].event_date, '');
  assert.ok(rows[1].issues.includes('วันที่ไม่ถูกต้อง'));
});
test('flags ambiguous times, invalid times, conflicting timestamps and backwards order', () => {
  const rows = extractTimelineEvidence('2/10/2569 09:00 พบ A\n2/10/2569 09:00 พบ B\n2/10/2569 08:00 เริ่ม\n25:70 ผิด\n08:00 ถึง 10:00 ตรวจ');
  assert.match(rows[0].issues.join(), /ข้อความต่างกัน/);
  assert.match(rows[2].issues.join(), /ย้อน/);
  assert.equal(rows[3].event_time, '');
  assert.match(rows[4].issues.join(), /หลายเวลา/);
  assert.equal(rows[4].event_time, '');
});
test('Excel evidence retains exact multiline cells and original date notation', () => {
  const rows = extractTimelineEvidence('วันที่\tเวลา\tเหตุการณ์\n2/10/2569\t08:30\t"ตรวจ\nกล่าวว่า ""หยุด"""');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].event_description, 'ตรวจ\nกล่าวว่า "หยุด"');
  assert.equal(rows[0].source_text, '2/10/2569\t08:30\t"ตรวจ\nกล่าวว่า ""หยุด"""');
  assert.equal(rows[0].source_line, 2);
});
test('append preserves existing IDs and CAPA-linked rows; replace is explicit and strips evidence metadata', () => {
  const old = [{ id: 13, event_date: '2026-10-01', event_time: '08:00', event_description: 'เดิม' }];
  const rows = extractTimelineEvidence('2/10/2569 09:00 ใหม่');
  const appended = importTimeline(old, rows, 'append');
  assert.equal(appended.length, 2); assert.equal(appended[0], old[0]);
  assert.equal('source_text' in appended[1], false);
  assert.equal(importTimeline(old, rows, 'replace').length, 1);
  assert.equal(old.length, 1);
});
test('oversized and invalid input fails visibly without silent truncation', () => {
  for (const value of ['', 'x'.repeat(30001), Array.from({length: 201}, () => 'เหตุการณ์').join('\n'), '31/2/2569\t08:00\tผิด']) assert.throws(() => extractTimelineEvidence(value));
});
