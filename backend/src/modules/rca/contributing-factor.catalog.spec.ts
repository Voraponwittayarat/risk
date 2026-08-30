import {
  NRLS_CONTRIBUTING_FACTORS,
  normalizeContributingFactors,
  serializeContributingFactors,
} from './contributing-factor.catalog';

describe('NRLS contributing factors fiscal year 2569', () => {
  it('contains exactly 35 unique factors in 10 categories', () => {
    expect(NRLS_CONTRIBUTING_FACTORS).toHaveLength(35);
    expect(new Set(NRLS_CONTRIBUTING_FACTORS.map((factor) => factor.code)).size).toBe(35);
    expect(new Set(NRLS_CONTRIBUTING_FACTORS.map((factor) => factor.category)).size).toBe(10);
  });

  it('removes F0006 and F0009 and includes the new patient factor F0037', () => {
    const codes = new Set(NRLS_CONTRIBUTING_FACTORS.map((factor) => factor.code));
    expect(codes.has('F0006')).toBe(false);
    expect(codes.has('F0009')).toBe(false);
    expect(codes.has('F0037')).toBe(true);
    expect(NRLS_CONTRIBUTING_FACTORS.find((factor) => factor.code === 'F0037')?.category).toBe('patient');
  });

  it('normalizes valid selections, removes duplicates, and rejects unknown codes', () => {
    expect(normalizeContributingFactors([
      { code: 'f0001', detail: '  เวรต่อเนื่อง  ' },
      { code: 'F0001', detail: 'duplicate' },
      { code: 'F0006', detail: 'retired' },
      { code: 'F0037' },
    ])).toEqual([
      { code: 'F0001', detail: 'เวรต่อเนื่อง' },
      { code: 'F0037' },
    ]);
  });

  it('serializes only canonical selections for MariaDB TEXT storage', () => {
    expect(serializeContributingFactors([{ code: 'F0021', detail: 'ข้อมูลส่งเวรไม่ครบ' }]))
      .toBe('[{"code":"F0021","detail":"ข้อมูลส่งเวรไม่ครบ"}]');
    expect(serializeContributingFactors([])).toBeNull();
  });

  it('keeps the same NRLS factor when it belongs to different clinical processes', () => {
    expect(normalizeContributingFactors([
      { code: 'F0021', detail: 'ข้อมูลส่งเวรไม่ครบ', process_key: 'การประเมิน/การส่งตรวจ (Assessment/Investigation)' },
      { code: 'F0021', detail: 'ข้อมูลจำหน่ายไม่ครบ', process_key: 'จำหน่าย/ดูแลต่อเนื่อง (Discharge)' },
      { code: 'F0021', detail: 'duplicate in same process', process_key: 'จำหน่าย/ดูแลต่อเนื่อง (Discharge)' },
    ])).toEqual([
      { code: 'F0021', detail: 'ข้อมูลส่งเวรไม่ครบ', process_key: 'การประเมิน/การส่งตรวจ (Assessment/Investigation)' },
      { code: 'F0021', detail: 'ข้อมูลจำหน่ายไม่ครบ', process_key: 'จำหน่าย/ดูแลต่อเนื่อง (Discharge)' },
    ]);
  });

  it('supports many-to-many Factor to Tier selections inside the same process', () => {
    expect(normalizeContributingFactors([
      { code: 'F0035', process_key: 'วางแผนดูแล (Plan of Care)', tier: 3, detail: 'สภาพแวดล้อม' },
      { code: 'F0035', process_key: 'วางแผนดูแล (Plan of Care)', tier: 4, detail: 'การบริหาร' },
      { code: 'F0035', process_key: 'วางแผนดูแล (Plan of Care)', tier: 4, detail: 'duplicate' },
    ])).toEqual([
      { code: 'F0035', detail: 'สภาพแวดล้อม', process_key: 'วางแผนดูแล (Plan of Care)', tier: 3 },
      { code: 'F0035', detail: 'การบริหาร', process_key: 'วางแผนดูแล (Plan of Care)', tier: 4 },
    ]);
  });
});
