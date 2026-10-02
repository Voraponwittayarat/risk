import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimelinePaste } from './timelinePaste.ts';
test('imports Buddhist dates and quoted multiline Excel cells', () => {
  const rows = parseTimelinePaste('วันที่\tเวลา\tเหตุการณ์\tจุดวิกฤต\r\n2/10/2569\t08:30\t"พบปัญหา\nตรวจซ้ำ"\tใช่\r\n2026-10-03\t09:00\tแก้ไข\t0');
  assert.equal(rows.length, 2); assert.equal(rows[0].event_date, '2026-10-02');
  assert.equal(rows[0].event_description, 'พบปัญหา\nตรวจซ้ำ'); assert.equal(rows[0].is_critical_point, true);
});
test('rejects invalid dates and wrong column counts', () => {
  for (const text of ['31/2/2569\t08:00\tเหตุการณ์', 'เวลา\tเหตุการณ์', '2026-10-02\t08:00\tเหตุการณ์\textra\textra']) assert.throws(() => parseTimelinePaste(text));
});
test('preserves escaped quotes and relative time with unknown date', () => {
  assert.equal(parseTimelinePaste('\tก่อนเกิดเหตุ\t"กล่าวว่า ""หยุด"""')[0].event_description, 'กล่าวว่า "หยุด"');
});
