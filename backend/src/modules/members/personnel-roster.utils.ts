import { parse } from 'csv-parse/sync';

export const normalizePersonnelName = (name: string) => name.normalize('NFC')
  .trim().replace(/^(?:นางสาว|นาง|นาย|น\.ส\.|นส\.|ดร\.|นพ\.|พญ\.|ทพญ\.|ทพ\.)\s*/, '')
  .replace(/\s+/g, '').toLowerCase();

export function parsePersonnelRoster(text: string) {
  const table: string[][] = parse(text, { bom: true, skip_empty_lines: true, relax_column_count: true, max_record_size: 20000 });
  const headerIndex = table.findIndex(r => r.some(c => c.trim() === 'ลำดับ') && r.some(c => /ชื่อ\s*-?\s*(สกุล|นามสกุล)/.test(c)));
  if (headerIndex < 0) throw new Error('ไม่พบหัวตาราง ลำดับ / ชื่อ - สกุล');
  const headers = table[headerIndex].map(c => c.trim());
  const index = (label: string) => headers.indexOf(label);
  const nameIndex = headers.findIndex(c => /ชื่อ\s*-?\s*(สกุล|นามสกุล)/.test(c));
  if (['ตำแหน่ง', 'กลุ่มงาน', 'งาน', 'ประเภทการจ้าง'].some(h => index(h) < 0)) throw new Error('คอลัมน์ไม่ครบตามไฟล์รายชื่อ');
  const rows = table.slice(headerIndex + 1).filter(c => c.some(v => v.trim()));
  const seen = new Set<string>();
  const result = rows.flatMap((cells, i) => {
    // Side summary columns are not personnel rows. A named row with invalid ordinal is an error, not silently skipped.
    const name = (cells[nameIndex] || '').trim();
    if (!name && !/^\d+$/.test((cells[index('ลำดับ')] || '').trim())) return [];
    const get = (h: string) => (cells[index(h)] || '').trim();
    const key = normalizePersonnelName(name);
    const errors: string[] = [];
    if (!/^\d+$/.test(get('ลำดับ'))) errors.push('ลำดับต้องเป็นตัวเลข');
    if (!key || name.length > 150) errors.push('ชื่อไม่ถูกต้อง');
    if (!get('กลุ่มงาน')) errors.push('ไม่มีกลุ่มงาน');
    if (seen.has(key)) errors.push('ชื่อซ้ำในไฟล์ กรุณาตรวจตัวบุคคล');
    seen.add(key);
    const position = get('ตำแหน่ง'), group = get('กลุ่มงาน'), unit = get('งาน'), employment = get('ประเภทการจ้าง');
    if ([position, group, unit, employment].some(v => v.length > 255)) errors.push('ข้อความยาวเกิน 255 ตัวอักษร');
    return [{ row: headerIndex + i + 2, name, key, position, group, unit, employment, errors }];
  });
  if (!result.length || result.length > 3000) throw new Error('รองรับ 1–3,000 รายการต่อไฟล์');
  return result;
}

export const sourceUnitKey = (row: { group: string; unit: string }) => JSON.stringify([row.group, row.unit]);
