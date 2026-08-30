export interface AiStandardRiskRow {
  nrls_code: string;
  name: string;
  group?: string | null;
  category?: string | null;
  type?: string | null;
  sub_type?: string | null;
  definition?: string | null;
  program_id?: number | null;
}

export interface AiLocalRiskRow {
  riskstore_id: number;
  riskstore_name: string;
  nrls_code?: string | null;
}

export interface AiRiskCandidate {
  nrls_code: string;
  name: string;
  group: string | null;
  program_id: number | null;
  local_risk_id: number | null;
  local_risk_name: string | null;
  match_score: number;
}

export interface CanonicalAiRiskSuggestion extends Omit<AiRiskCandidate, 'match_score'> {
  confidence: number;
  reason: string;
}

export function deidentifyIncidentText(value: unknown): string {
  return String(value || '')
    .replace(/\b(?:HN|AN|VN|CID)\s*[:#=/-]?\s*[A-Za-z0-9/-]+/gi, '[ปกปิดรหัสผู้รับบริการ]')
    .replace(/(?:เลข(?:บัตรประชาชน|ประจำตัวประชาชน|ผู้ป่วย|ที่ผู้ป่วย))\s*[:#=/-]?\s*[A-Za-z0-9/-]+/g, '[ปกปิดรหัสผู้รับบริการ]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[ปกปิดอีเมล]')
    .replace(/(?<!\d)\d(?:[-\s]?\d){12}(?!\d)/g, '[ปกปิดเลขประจำตัว]')
    .replace(/(?<!\d)(?:\+66|0)(?:[-\s]?\d){8,9}(?!\d)/g, '[ปกปิดเบอร์โทร]')
    .replace(/(?:ผู้ป่วยชื่อ|คนไข้ชื่อ|เจ้าหน้าที่ชื่อ|บุคลากรชื่อ|ญาติชื่อ|ชื่อ(?:-?สกุล)?)\s*[:：]?\s*(?:(?:นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|นพ\.|พญ\.|แพทย์หญิง)\s*)?[ก-๙A-Za-z.'-]+(?:\s+[ก-๙A-Za-z.'-]+)?/g, '[ปกปิดชื่อ]')
    .replace(/(?:นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|นพ\.|พญ\.|แพทย์หญิง)\s*[ก-๙A-Za-z.'-]+(?:\s+[ก-๙A-Za-z.'-]+)?/g, '[ปกปิดชื่อ]')
    .slice(0, 4000);
}

const keywordGroups: string[][] = [
  ['ตกเตียง', 'หกล้ม', 'ลื่นล้ม', 'พลัดตก', 'fall'],
  ['ยา', 'จ่ายยา', 'ให้ยา', 'ขนาดยา', 'แพ้ยา', 'medication', 'drug'],
  ['ระบุตัว', 'ผิดคน', 'สลับตัว', 'patient identification'],
  ['ติดเชื้อ', 'สารคัดหลั่ง', 'infection'],
  ['เข็มตำ', 'ของมีคม', 'needle'],
  ['เครื่องมือ', 'อุปกรณ์', 'ชำรุด', 'equipment', 'device'],
  ['ผ่าตัด', 'หัตถการ', 'surgery', 'surgical'],
  ['เลือด', 'ส่วนประกอบของเลือด', 'transfusion'],
  ['ส่งต่อ', 'refer', 'referral'],
  ['ผลตรวจ', 'สิ่งส่งตรวจ', 'ห้องปฏิบัติการ', 'specimen', 'laboratory'],
  ['เวชระเบียน', 'เอกสาร', 'ข้อมูลผู้ป่วย', 'record', 'information'],
  ['ไฟไหม้', 'ไฟฟ้า', 'น้ำรั่ว', 'สิ่งแวดล้อม', 'environment'],
  ['เจ้าหน้าที่', 'บุคลากร', 'อาชีวอนามัย', 'occupational', 'personnel'],
  ['ร้องเรียน', 'สิทธิผู้ป่วย', 'complaint', 'rights'],
  ['ล่าช้า', 'รอคอย', 'delay'],
  ['แผลกดทับ', 'pressure injury', 'pressure sore'],
  ['หลบหนี', 'สูญหาย', 'หนีออก', 'missing'],
  ['ทำร้าย', 'ทะเลาะ', 'ลักทรัพย์', 'security', 'violence'],
];

const ignoredTerms = new Set([
  'และ', 'หรือ', 'ที่', 'ใน', 'มี', 'เป็น', 'ได้', 'ให้', 'จาก', 'ของ', 'แล้ว', 'เมื่อ',
  'ผู้ป่วย', 'คนไข้', 'เหตุการณ์', 'พบว่า', 'เวลา', 'วันที่', 'วันนี้', 'เมื่อวาน',
]);

const normalize = (value: unknown): string => String(value || '')
  .toLocaleLowerCase('th-TH')
  .replace(/[\s\u00a0]+/g, ' ')
  .replace(/[“”"'`()\[\]{}.,;:!?/\\|_-]+/g, ' ')
  .trim();

const compact = (value: unknown): string => normalize(value).replace(/\s+/g, '');

const extractTerms = (text: string): string[] => Array.from(new Set(
  normalize(text)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && term.length <= 40 && !ignoredTerms.has(term)),
));

const scoreText = (eventText: string, targetText: string): number => {
  const event = normalize(eventText);
  const target = normalize(targetText);
  const eventCompact = compact(event);
  const targetCompact = compact(target);
  if (!event || !target) return 0;

  let score = 0;
  for (const term of extractTerms(event)) {
    if (target.includes(term)) score += term.length >= 5 ? 8 : 4;
  }
  for (const term of extractTerms(target)) {
    if (term.length >= 3 && event.includes(term)) score += term.length >= 5 ? 6 : 3;
  }
  if (targetCompact.length >= 4 && eventCompact.includes(targetCompact)) score += 30;

  for (const aliases of keywordGroups) {
    const eventMatches = aliases.some((alias) => eventCompact.includes(compact(alias)));
    const targetMatches = aliases.some((alias) => targetCompact.includes(compact(alias)));
    if (eventMatches && targetMatches) score += 24;
  }
  return score;
};

export function rankAiRiskCandidates(
  eventText: string,
  standards: AiStandardRiskRow[],
  localRisks: AiLocalRiskRow[],
  limit = 20,
): AiRiskCandidate[] {
  const event = normalize(eventText).slice(0, 12000);
  if (!event) return [];

  const localByCode = new Map<string, { row: AiLocalRiskRow; score: number }>();
  for (const local of localRisks) {
    const code = String(local.nrls_code || '').trim().toUpperCase();
    if (!code) continue;
    const score = scoreText(event, local.riskstore_name);
    const previous = localByCode.get(code);
    if (!previous || score > previous.score) localByCode.set(code, { row: local, score });
  }

  return standards
    .map((standard) => {
      const code = String(standard.nrls_code || '').trim().toUpperCase();
      const searchable = [
        standard.name,
        standard.group,
        standard.category,
        standard.type,
        standard.sub_type,
        standard.definition,
      ].filter(Boolean).join(' ');
      const local = localByCode.get(code);
      let score = scoreText(event, searchable) + (local?.score || 0);
      if (compact(event).includes(compact(code))) score += 100;
      return {
        nrls_code: code,
        name: String(standard.name || '').trim(),
        group: standard.group || null,
        program_id: standard.program_id || null,
        local_risk_id: local?.row.riskstore_id || null,
        local_risk_name: local?.row.riskstore_name || null,
        match_score: score,
      };
    })
    .filter((candidate) => candidate.nrls_code && candidate.name && candidate.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score || a.nrls_code.localeCompare(b.nrls_code))
    .slice(0, Math.max(1, Math.min(limit, 30)));
}

export function normalizeAiRiskSuggestions(
  value: unknown,
  candidates: AiRiskCandidate[],
): CanonicalAiRiskSuggestion[] {
  if (!Array.isArray(value)) return [];
  const candidateByCode = new Map(candidates.map((candidate) => [candidate.nrls_code.toUpperCase(), candidate]));
  const seen = new Set<string>();
  const normalized: CanonicalAiRiskSuggestion[] = [];

  for (const raw of value) {
    const code = String(raw?.nrls_code || '').trim().toUpperCase();
    const candidate = candidateByCode.get(code);
    if (!candidate || seen.has(code)) continue;
    seen.add(code);
    const parsedConfidence = Number(raw?.confidence);
    const confidence = Number.isFinite(parsedConfidence)
      ? Math.max(0, Math.min(100, Math.round(parsedConfidence)))
      : 50;
    normalized.push({
      nrls_code: candidate.nrls_code,
      name: candidate.name,
      group: candidate.group,
      program_id: candidate.program_id,
      local_risk_id: candidate.local_risk_id,
      local_risk_name: candidate.local_risk_name,
      confidence,
      reason: String(raw?.reason || 'สอดคล้องกับคำสำคัญในรายละเอียดเหตุการณ์').trim().slice(0, 300),
    });
    if (normalized.length === 3) break;
  }
  return normalized;
}
