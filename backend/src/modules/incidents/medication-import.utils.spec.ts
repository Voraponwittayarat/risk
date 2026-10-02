import { medicationDate, parseMedicationCsv } from './medication-import.utils';

const headers = ['ประทับเวลา', 'วันที่เกิดเหตุการณ์', 'ช่วงเวรที่เกิดเหตุการณ์', 'สถานที่เกิดเหตุการณ์', 'ข้อมูลผู้ป่วย (HN/AN/ชื่อ-นามสกุล)', 'Prescribing Error (ความคลาดเคลื่อนในการสั่งใช้ยา)', 'ระดับความรุนแรง', 'เหตุการณ์/รายละเอียดเพิ่มเติม', 'คอลัมน์ 17', 'คอลัมน์ 17'];
const csv = (cells: string[]) => headers.join(',') + '\r\n' + cells.map(c => '"' + c.replace(/"/g, '""') + '"').join(',');
describe('Medication CSV parser', () => {
  it('reads repeated headers, multiline quoted narratives and excludes patient column', () => {
    const [row] = parseMedicationCsv('\ufeff' + csv(['1/10/2026 08:00', '1/10/2569', 'เช้า', 'ทดสอบ', 'TEST_PATIENT_IDENTIFIER', 'ทดสอบสั่งยา', 'B: ตัวอย่าง', 'บรรทัดหนึ่ง, รายละเอียด\nบรรทัดสอง', '', '']));
    expect(row.date).toBe('2026-10-01');
    expect(row.level).toBe('B');
    expect(row.stages).toHaveLength(1);
    expect(row.detail).toContain('บรรทัดหนึ่ง, รายละเอียด\nบรรทัดสอง');
    expect(JSON.stringify(row)).not.toContain('TEST_PATIENT_IDENTIFIER');
  });
  it('uses stable fingerprints when rows are reordered and differentiates records', () => {
    const cells = ['1/10/2026 08:00', '1/10/2026', 'เช้า', 'ทดสอบ', '', '', 'A', 'เหตุการณ์ทดสอบ', '', ''];
    const [a] = parseMedicationCsv(csv(cells));
    const [b] = parseMedicationCsv(csv(cells));
    expect(a.key).toBe(b.key);
    cells[0] = '1/10/2026 09:00';
    expect(parseMedicationCsv(csv(cells))[0].key).not.toBe(a.key);
  });
  it('rejects unrelated CSV and reports invalid dates without substituting current date', () => {
    expect(() => parseMedicationCsv('a,b\n1,2')).toThrow();
    expect(medicationDate('31/2/2569')).toBe('');
    expect(medicationDate('2026-02-29')).toBe('');
    expect(medicationDate('2024-02-29')).toBe('2024-02-29');
  });
});
