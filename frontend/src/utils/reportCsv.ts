export type CsvValue = string | number | boolean | null | undefined;

// Quote every cell, escape quotes, and keep spreadsheet applications from
// interpreting user-entered text as a formula.
export function csvCell(value: CsvValue): string {
  let text = String(value ?? '');
  if (typeof value === 'string' && (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: CsvValue[][]): string {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export type MatrixCell = { count: number; items: any[] };
export type IncidentMatrix = { totalConfirmed: number; matrix: MatrixCell[][] };

export function getMatrixCell(data: IncidentMatrix | null, consequence: number, likelihood: number): MatrixCell {
  return data?.matrix?.[consequence - 1]?.[likelihood - 1] ?? { count: 0, items: [] };
}

export function matrixCsvRows(data: IncidentMatrix): CsvValue[][] {
  return [
    ['ผลกระทบ (C)', 'โอกาสเกิด (L)', 'คะแนน (C × L)', 'จำนวนอุบัติการณ์ยืนยันแล้ว'],
    ...[5, 4, 3, 2, 1].flatMap(c => [1, 2, 3, 4, 5].map(l => [c, l, c * l, getMatrixCell(data, c, l).count])),
  ];
}

export function standardsCsvRows(standards: { number: number; name: string; total: number; withMeasures: number; proactive: number }[]): CsvValue[][] {
  return [
    ['มาตรฐานข้อที่', 'ชื่อมาตรฐาน', 'จำนวนทะเบียนที่เชื่อมโยง', 'ทะเบียนที่มีมาตรการ', 'ทะเบียนเชิงรุก'],
    ...standards.map(s => [s.number, s.name, s.total, s.withMeasures, s.proactive]),
  ];
}
