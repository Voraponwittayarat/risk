import { normalizePersonnelName, parsePersonnelRoster } from './personnel-roster.utils';
const header = 'ลำดับ,ชื่อ - สกุล,ตำแหน่ง,"กลุ่มงาน\n",งาน,ประเภทการจ้าง,,ประเภทการจ้าง,จำนวน,รวม,รวม';
describe('current personnel CSV', () => {
  it('reads a title, multiline header and only personnel columns, excluding side summaries', () => {
    const rows = parsePersonnelRoster(`รายชื่อบุคลากร,,,,ข้อมูล ณ วันที่,2 ตุลาคม 2026\n${header}\n1,นาย ตัวอย่าง ทดสอบ,เจ้าหน้าที่,กลุ่มการพยาบาล,งานผู้ป่วยใน,ข้าราชการ,,รวม,9,9,9\n,,,,,,,รวม,9,9,9`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'นาย ตัวอย่าง ทดสอบ', group: 'กลุ่มการพยาบาล', unit: 'งานผู้ป่วยใน', employment: 'ข้าราชการ', errors: [] });
    expect(Object.values(rows[0])).not.toContain('รวม');
  });
  it('flags duplicate normalized names and malformed named rows rather than silently omitting people', () => {
    const rows = parsePersonnelRoster(`${header}\n1,นาย ตัวอย่าง ทดสอบ,เจ้าหน้าที่,กลุ่มงาน,งาน,จ้าง\n2,ตัวอย่าง   ทดสอบ,เจ้าหน้าที่,กลุ่มงาน,งาน,จ้าง\nผิด,คน ใหม่,เจ้าหน้าที่,กลุ่มงาน,งาน,จ้าง`);
    expect(rows).toHaveLength(3);
    expect(rows[1].errors.join()).toContain('ชื่อซ้ำ');
    expect(rows[2].errors.join()).toContain('ลำดับ');
  });
  it('does not fuzzy-match similar names', () => {
    expect(normalizePersonnelName('นางสาว สมมติ ทดสอบ')).toBe(normalizePersonnelName('สมมติทดสอบ'));
    expect(normalizePersonnelName('สมมติ ทดสอบ')).not.toBe(normalizePersonnelName('สมมติ ทดสอบสอง'));
  });
  it('rejects empty and oversized imports', () => {
    expect(() => parsePersonnelRoster(header)).toThrow('1–3,000');
    expect(() => parsePersonnelRoster(`${header}\n` + Array.from({ length: 3001 }, (_,i) => `${i+1},คน ${i},ตำแหน่ง,กลุ่ม,งาน,จ้าง`).join('\n'))).toThrow('1–3,000');
  });
});
