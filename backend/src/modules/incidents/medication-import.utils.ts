import { parse } from 'csv-parse/sync';
import { createHash } from 'crypto';

export function medicationDate(value: string): string {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let date = value.trim();
  if (match) {
    const year = Number(match[3]) > 2400 ? Number(match[3]) - 543 : Number(match[3]);
    date = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : '';
}

export function parseMedicationCsv(text: string) {
  const table: string[][] = parse(text, { bom: true, skip_empty_lines: true, max_record_size: 60000 });
  const headers = table.shift()?.map(h => h.trim()) || [];
  const required = ['ประทับเวลา', 'วันที่เกิดเหตุการณ์', 'ช่วงเวรที่เกิดเหตุการณ์', 'สถานที่เกิดเหตุการณ์', 'ระดับความรุนแรง', 'เหตุการณ์/รายละเอียดเพิ่มเติม'];
  if (!required.every(h => headers.includes(h))) throw new Error('HEADER');
  if (!table.length || table.length > 500) throw new Error('COUNT');
  return table.map((cells, index) => {
    const get = (name: string) => (cells[headers.indexOf(name)] || '').trim();
    const stages = headers.flatMap((h, i) => /Error\s*\(/i.test(h) && cells[i]?.trim() ? [`${h}: ${cells[i].trim()}`] : []);
    const date = medicationDate(get('วันที่เกิดเหตุการณ์'));
    const level = get('ระดับความรุนแรง').match(/^\s*(?:ระดับ\s*)?([A-I])(?:\b|\s|[:.)-]|$)/i)?.[1].toUpperCase() || '';
    // Patient identifiers and image URLs are intentionally excluded from the preview and incident narrative.
    const detail = [
      'นำเข้าจากแบบฟอร์ม Medication Error', ...stages,
      `วันที่ต้นฉบับ: ${get('วันที่เกิดเหตุการณ์')}`,
      `เวรต้นฉบับ: ${get('ช่วงเวรที่เกิดเหตุการณ์')}`,
      `สถานที่ต้นฉบับ: ${get('สถานที่เกิดเหตุการณ์')}`,
      `ตัวยาที่ถูกต้อง: ${get('ตัวยาที่ถูกต้อง (กรณีผิดขนาน/ชนิด/ตัวยา)')}`,
      `ตัวยาที่ผิด: ${get('ตัวยาที่ผิด (กรณีผิดขนาน/ชนิด/ตัวยา)')}`,
      get('เหตุการณ์/รายละเอียดเพิ่มเติม'),
    ].join('\n');
    const safeHeaders = new Set([...required, 'ตัวยาที่ถูกต้อง (กรณีผิดขนาน/ชนิด/ตัวยา)', 'ตัวยาที่ผิด (กรณีผิดขนาน/ชนิด/ตัวยา)', 'การช่วยเหลือหรือแก้ไขเบื้องต้น', 'ชื่อผู้รายงาน']);
    const source_columns = headers.map((header, i) => ({
      header,
      value: safeHeaders.has(header) || /Error\s*\(/i.test(header) ? (cells[i] || '') : '',
      excluded: !safeHeaders.has(header) && !/Error\s*\(/i.test(header),
    }));
    const stageCodes = headers.flatMap((h, i) => {
      if (!cells[i]?.trim() || /^(ไม่มี|ไม่พบ|ไม่เกิด|ไม่ได้เกิด|none|no|n\/a|-)$/i.test(cells[i].trim())) return [];
      if (/^Prescribing Error\s*\(/i.test(h)) return ['CPM201'];
      if (/^Transcribing Error\s*\(/i.test(h)) return ['CPM202'];
      if (/^Pre-dispensing Error\s*\(/i.test(h)) return ['CPM203'];
      if (/^Dispensing Error\s*\(/i.test(h)) return ['CPM204'];
      if (/^Administration Error\s*\(/i.test(h)) return ['CPM205'];
      return [];
    });
    const hasPreAdministration = headers.some((h, i) => /^Pre-Administration Error/i.test(h) && cells[i]?.trim());
    const suggested_nrls_code = stageCodes.length === 1 && !hasPreAdministration ? stageCodes[0] : '';
    return { source_columns, suggested_nrls_code, row: index + 2, key: 'medcsv:' + createHash('sha256').update(JSON.stringify(cells.map(c => c.trim()))).digest('hex'), date, level,
      shift: get('ช่วงเวรที่เกิดเหตุการณ์'), location: get('สถานที่เกิดเหตุการณ์'), stages,
      detail, problem_basic: get('การช่วยเหลือหรือแก้ไขเบื้องต้น'),
      reporter: get('ชื่อผู้รายงาน'), errors: [!date && 'วันที่ไม่ถูกต้อง', !level && 'กรุณาเลือกระดับ A–I'].filter(Boolean) };
  });
}
