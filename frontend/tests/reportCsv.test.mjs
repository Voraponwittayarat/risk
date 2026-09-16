import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, csvCell, getMatrixCell, matrixCsvRows, standardsCsvRows } from '../src/utils/reportCsv.ts';

test('CSV preserves Thai text, commas, quotes, and embedded newlines', () => {
  assert.equal(buildCsv([['ชื่อ "ตัวอย่าง", หน่วยงาน', 'บรรทัดแรก\nบรรทัดสอง', null]]), '\uFEFF"ชื่อ ""ตัวอย่าง"", หน่วยงาน","บรรทัดแรก\nบรรทัดสอง",""');
});
test('CSV protects spreadsheet formula prefixes without changing numeric values', () => {
  for (const text of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '  =1', '\tformula', '\rformula']) {
    assert.ok(csvCell(text).startsWith('"\''));
  }
  assert.equal(csvCell(-5), '"-5"');
});
test('Matrix uses the API array, preserves axes and includes counts beyond the five example items', () => {
  const data = { totalConfirmed: 18, matrix: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ count: 0, items: [] }))) };
  data.matrix[4][1] = { count: 18, items: Array.from({ length: 5 }, (_, id) => ({ id })) };
  assert.equal(getMatrixCell(data, 5, 2).count, 18);
  const rows = matrixCsvRows(data);
  assert.equal(rows.length, 26);
  assert.deepEqual(rows[2], [5, 2, 10, 18]);
  assert.equal(rows.slice(1).reduce((sum, row) => sum + row[3], 0), 18);
});
test('Standards export uses standard totals, not risk register rows', () => {
  const rows = standardsCsvRows([{ number: 1, name: 'Test standard', total: 3, withMeasures: 2, proactive: 1 }]);
  assert.deepEqual(rows[1], [1, 'Test standard', 3, 2, 1]);
});
