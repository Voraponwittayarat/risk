import {
  deidentifyIncidentText,
  normalizeAiRiskSuggestions,
  rankAiRiskCandidates,
} from './ai-incident-assistant.utils';

describe('AI incident assistant risk grounding', () => {
  const standards = [
    { nrls_code: 'CPP105', name: 'ผู้ป่วยพลัดตกหกล้ม', group: 'Clinical', program_id: 6 },
    { nrls_code: 'CPS201', name: 'ความคลาดเคลื่อนทางยา', group: 'Clinical', program_id: 5 },
  ];
  const locals = [
    { riskstore_id: 12, riskstore_name: 'PT/01 ผู้ป่วยตกเตียง', nrls_code: 'CPP105' },
  ];

  it('ranks mapped NRLS risks using incident keywords', () => {
    const result = rankAiRiskCandidates('ผู้ป่วยเอื้อมหยิบของแล้วตกเตียง มีแผลถลอก', standards, locals);
    expect(result[0]).toMatchObject({ nrls_code: 'CPP105', local_risk_id: 12 });
  });

  it('filters hallucinated codes and restores canonical master data', () => {
    const candidates = rankAiRiskCandidates('ผู้ป่วยตกเตียง', standards, locals);
    const result = normalizeAiRiskSuggestions([
      { nrls_code: 'MADE-UP', confidence: 99, reason: 'ไม่มีจริง' },
      { nrls_code: 'cpp105', confidence: 120, reason: 'ตรงกับเหตุการณ์ตกเตียง' },
      { nrls_code: 'CPP105', confidence: 10, reason: 'ซ้ำ' },
    ], candidates);

    expect(result).toEqual([expect.objectContaining({
      nrls_code: 'CPP105',
      name: 'ผู้ป่วยพลัดตกหกล้ม',
      confidence: 100,
      local_risk_id: 12,
    })]);
  });

  it('removes direct identifiers before sending incident text to an external AI', () => {
    const safe = deidentifyIncidentText(
      'ผู้ป่วยชื่อ นายสมชาย ใจดี HN 12-3456 AN:9988 VN/777 CID 1234567890123 โทร 081-234-5678 email somchai@example.com ลื่นล้มในห้องน้ำ',
    );

    expect(safe).toContain('ลื่นล้มในห้องน้ำ');
    expect(safe).not.toMatch(/สมชาย|ใจดี|12-3456|9988|777|1234567890123|081-234-5678|somchai@example\.com/);
    expect(safe).toContain('[ปกปิดชื่อ]');
    expect(safe).toContain('[ปกปิดรหัสผู้รับบริการ]');
  });
});
