import { isSelectableLocalRisk } from './localRiskStatus';

export interface StandardRiskSearchResult<T = any> {
  risk: T;
  score: number;
  matchedSources: Array<'code' | 'name' | 'legacy' | 'definition' | 'metadata'>;
  matchedLegacyNames: string[];
  definitionSnippet: string | null;
}

const synonymGroups: string[][] = [
  ['ตกเตียง', 'หกล้ม', 'ลื่นล้ม', 'พลัดตก', 'พลัดล้ม', 'fall'],
  ['ยา', 'จ่ายยา', 'ให้ยา', 'ยาผิด', 'แพ้ยา', 'คลาดเคลื่อนทางยา', 'medication', 'drug'],
  ['ระบุตัว', 'ผิดคน', 'สลับตัว', 'patient identification'],
  ['ติดเชื้อ', 'สารคัดหลั่ง', 'infection'],
  ['เข็มตำ', 'ของมีคม', 'needle'],
  ['เครื่องมือ', 'อุปกรณ์', 'ชำรุด', 'ขัดข้อง', 'equipment', 'device'],
  ['ผ่าตัด', 'หัตถการ', 'surgery', 'surgical'],
  ['เลือด', 'ส่วนประกอบของเลือด', 'transfusion'],
  ['ส่งต่อ', 'ส่งตัว', 'refer', 'referral'],
  ['ผลตรวจ', 'สิ่งส่งตรวจ', 'ห้องปฏิบัติการ', 'specimen', 'laboratory', 'lab'],
  ['เวชระเบียน', 'เอกสาร', 'ข้อมูลผู้ป่วย', 'record', 'information'],
  ['ไฟไหม้', 'ไฟฟ้า', 'น้ำรั่ว', 'สิ่งแวดล้อม', 'environment'],
  ['เจ้าหน้าที่', 'บุคลากร', 'อาชีวอนามัย', 'occupational', 'personnel'],
  ['ร้องเรียน', 'สิทธิผู้ป่วย', 'complaint', 'rights'],
  ['ล่าช้า', 'รอคอย', 'delay'],
  ['แผลกดทับ', 'pressure injury', 'pressure sore'],
  ['หลบหนี', 'สูญหาย', 'หนีออก', 'missing'],
  ['ทำร้าย', 'ทะเลาะ', 'ลักทรัพย์', 'security', 'violence'],
];

const normalize = (value: unknown): string => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase('th-TH')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/[“”"'`()\u005B\u005D{}.,;:!?/\\|_–—-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compact = (value: unknown): string => normalize(value).replace(/\s+/g, '');

const queryUnits = (query: string): string[][] => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  return Array.from(new Set(normalizedQuery.split(' ').filter(Boolean))).map((token) => {
    const tokenCompact = compact(token);
    const synonyms = synonymGroups.find((group) => group.some((word) => {
      const wordCompact = compact(word);
      return tokenCompact.includes(wordCompact) || wordCompact.includes(tokenCompact);
    }));
    return synonyms ? Array.from(new Set([token, ...synonyms].map(compact))) : [tokenCompact];
  });
};

const matchesUnit = (text: string, unit: string[]): boolean => unit.some((term) => text.includes(term));

const excerpt = (value: unknown, units: string[][], maxLength = 150): string | null => {
  const original = String(value || '').replace(/\s+/g, ' ').trim();
  if (!original) return null;
  const normalizedOriginal = normalize(original);
  const terms = units.flat().sort((a, b) => b.length - a.length);
  const matchedTerm = terms.find((term) => normalizedOriginal.includes(normalize(term)));
  if (!matchedTerm || original.length <= maxLength) return original.slice(0, maxLength);
  const index = normalizedOriginal.indexOf(normalize(matchedTerm));
  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(original.length, start + maxLength);
  return `${start > 0 ? '…' : ''}${original.slice(start, end)}${end < original.length ? '…' : ''}`;
};

export function searchStandardRisks<T extends Record<string, any>>(
  risks: T[],
  query: string,
): StandardRiskSearchResult<T>[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return risks.map((risk) => ({
      risk,
      score: 0,
      matchedSources: [],
      matchedLegacyNames: [],
      definitionSnippet: null,
    }));
  }

  const units = queryUnits(normalizedQuery);
  const compactQuery = compact(normalizedQuery);

  return risks.map((risk) => {
    const code = compact(risk.nrls_code);
    const name = compact(risk.name);
    const definition = compact(risk.definition);
    const metadata = compact([
      risk.group,
      risk.category,
      risk.type,
      risk.sub_type,
      risk.remark,
      risk.program?.program_name,
    ].filter(Boolean).join(' '));
    const localRisks = Array.isArray(risk.local_risks)
      ? risk.local_risks.filter(isSelectableLocalRisk)
      : [];
    const legacyNames = localRisks.map((local: any) => String(local?.riskstore_name || '').trim()).filter(Boolean);
    const legacy = compact(legacyNames.join(' '));
    const allSearchable = `${code} ${name} ${legacy} ${definition} ${metadata}`;

    if (!units.every((unit) => matchesUnit(allSearchable, unit))) return null;

    let score = 0;
    const matchedSources = new Set<StandardRiskSearchResult['matchedSources'][number]>();
    if (code === compactQuery) score += 140;
    else if (code.includes(compactQuery)) score += 80;
    if (name === compactQuery) score += 120;
    else if (name.includes(compactQuery)) score += 70;
    if (legacy.includes(compactQuery)) score += 60;
    if (definition.includes(compactQuery)) score += 35;

    for (const unit of units) {
      if (matchesUnit(code, unit)) { score += 30; matchedSources.add('code'); }
      if (matchesUnit(name, unit)) { score += 24; matchedSources.add('name'); }
      if (matchesUnit(legacy, unit)) { score += 20; matchedSources.add('legacy'); }
      if (matchesUnit(definition, unit)) { score += 12; matchedSources.add('definition'); }
      if (matchesUnit(metadata, unit)) { score += 8; matchedSources.add('metadata'); }
    }

    const matchedLegacyNames = legacyNames
      .filter((legacyName: string) => units.some((unit) => matchesUnit(compact(legacyName), unit)))
      .slice(0, 2);

    return {
      risk,
      score,
      matchedSources: Array.from(matchedSources),
      matchedLegacyNames,
      definitionSnippet: matchedSources.has('definition') ? excerpt(risk.definition, units) : null,
    };
  })
    .filter((result): result is StandardRiskSearchResult<T> => result !== null)
    .sort((a, b) => b.score - a.score || String(a.risk.nrls_code).localeCompare(String(b.risk.nrls_code)));
}
