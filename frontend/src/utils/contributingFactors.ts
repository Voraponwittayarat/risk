export interface ContributingFactorCategory {
  key: string;
  nameTh: string;
  nameEn: string;
}

export interface ContributingFactorDefinition {
  code: string;
  category: string;
  name: string;
  labelTh: string;
  definition: string;
}

export interface ContributingFactorSelection {
  code: string;
  detail?: string;
  process_key?: string;
  tier?: number;
}

export interface LegacyCauseFactor {
  category: string;
  factor: string;
  sub_factor?: string;
  sort_order?: number;
}

export const CONTRIBUTING_FACTOR_VERSION = 'NRLS ปีงบประมาณ 2569';

export const CONTRIBUTING_FACTOR_CATEGORIES: ContributingFactorCategory[] = [
  { key: 'staff', nameTh: 'ด้านบุคลากร', nameEn: 'Staff Factors' },
  { key: 'patient', nameTh: 'ด้านผู้ป่วย', nameEn: 'Patient Factors' },
  { key: 'nature_of_work', nameTh: 'ลักษณะงานที่ปฏิบัติ', nameEn: 'Nature of Work' },
  { key: 'team', nameTh: 'ทีมทำงาน', nameEn: 'Team' },
  { key: 'communication', nameTh: 'การสื่อสาร', nameEn: 'Communication' },
  { key: 'supervision_support', nameTh: 'การกำกับดูแล/การสนับสนุน', nameEn: 'Supervision/support' },
  { key: 'policies_protocols', nameTh: 'นโยบายและขั้นตอน/ระเบียบปฏิบัติทางคลินิก', nameEn: 'Policies & procedures/Clinical protocols' },
  { key: 'data_information', nameTh: 'ข้อมูลและสารสนเทศ', nameEn: 'Data & Information' },
  { key: 'equipment_device', nameTh: 'อุปกรณ์/เครื่องมือ', nameEn: 'Equipment/device' },
  { key: 'environment', nameTh: 'สิ่งแวดล้อม', nameEn: 'Environment' },
];

export const CONTRIBUTING_FACTORS: ContributingFactorDefinition[] = [
  {
    code: 'F0001', category: 'staff', name: 'Staff Factors: Fatigue', labelTh: 'ความเหนื่อยล้า',
    definition: 'สภาวะความอ่อนล้าทางร่างกายหรือจิตใจที่ทำให้การตื่นตัวลดลง เช่น พักผ่อนไม่พอหรือทำงานต่อเนื่องนานเกินไป',
  },
  {
    code: 'F0002', category: 'staff', name: 'Staff Factors: Stress', labelTh: 'ความเครียด',
    definition: 'สภาวะความกดดันทางอารมณ์หรือจิตใจจากเรื่องงานหรือเรื่องส่วนตัว จนส่งผลต่อสมาธิและการตัดสินใจ',
  },
  {
    code: 'F0003', category: 'staff', name: 'Staff Factors: Inattention', labelTh: 'ความไม่ใส่ใจ',
    definition: 'การขาดความใส่ใจในการปฏิบัติงาน ซึ่งส่งผลเสียต่อผลสำเร็จและคุณภาพของงาน',
  },
  {
    code: 'F0004', category: 'staff', name: 'Staff Factors: Competence, Knowledge, Skills, Experience', labelTh: 'สมรรถนะ ความรู้ ทักษะ ประสบการณ์',
    definition: 'มีความรู้หรือความสามารถที่จำเป็นไม่เพียงพอ หรือยังไม่มีประสบการณ์ในการปฏิบัติงานนั้น เช่น บุคลากรจบใหม่หรือได้รับมอบหมายงานที่ไม่ตรงสมรรถนะ',
  },
  {
    code: 'F0005', category: 'staff', name: 'Staff Factors: Cognitive bias', labelTh: 'อคติทางความคิด',
    definition: 'การเข้าใจเหตุการณ์ ข้อเท็จจริง หรือบุคคลอื่นโดยอิงจากความเชื่อและประสบการณ์ของตน ซึ่งอาจไม่ถูกต้อง',
  },
  {
    code: 'F0007', category: 'staff', name: 'Staff Factors: Health issues', labelTh: 'ปัญหาสุขภาพ',
    definition: 'ข้อจำกัดทางร่างกายหรือจิตใจ รวมถึงโรคประจำตัว การเจ็บป่วย หรือภาวะสุขภาพจิตที่กระทบประสิทธิภาพการปฏิบัติงาน',
  },
  {
    code: 'F0008', category: 'staff', name: 'Staff Factors: Attitude, Mindset, Culture', labelTh: 'ทัศนคติ กรอบความคิด วัฒนธรรม',
    definition: 'ทัศนคติและวิธีคิดที่สะท้อนเป็นพฤติกรรมหรือความเคยชินร่วมกัน เช่น วัฒนธรรมองค์กรที่ทำให้ไม่กล้าทักท้วงเมื่อพบความผิดปกติ',
  },
  {
    code: 'F0010', category: 'patient', name: 'Patient Factors: Clinical condition', labelTh: 'ภาวะทางคลินิก',
    definition: 'ความซับซ้อนและระยะของโรค อาการ หรือสภาพความเจ็บป่วยของผู้ป่วยที่ส่งผลต่อการดูแลรักษาและผลการรักษา',
  },
  {
    code: 'F0011', category: 'patient', name: 'Patient Factors: Medication', labelTh: 'ยาที่ผู้ป่วยได้รับ',
    definition: 'ความหลากหลาย ความต่อเนื่อง และระยะเวลาที่ได้รับยา รวมทั้งความถูกต้องเหมาะสมของกระบวนการบริหารยา',
  },
  {
    code: 'F0012', category: 'patient', name: 'Patient Factors: Language, sociocultural', labelTh: 'ภาษา สังคมวัฒนธรรม',
    definition: 'ความแตกต่างด้านภาษา รวมถึงความต้องการทางสังคมและวัฒนธรรมที่มีผลต่อความเข้าใจและประสิทธิภาพของการดูแลสุขภาพ',
  },
  {
    code: 'F0013', category: 'patient', name: 'Patient Factors: Informed & literacy', labelTh: 'การได้รับข้อมูลและการรู้หนังสือ',
    definition: 'ระดับการรับรู้และเรียนรู้ข้อมูลที่ผู้ป่วยสามารถค้นหา ทำความเข้าใจ และใช้ประกอบการตัดสินใจเกี่ยวกับสุขภาพของตนเองหรือผู้อื่น',
  },
  {
    code: 'F0037', category: 'patient', name: 'Patient Factors: Individual conditions', labelTh: 'สภาวะเฉพาะบุคคล',
    definition: 'ลักษณะเฉพาะบุคคลที่อาจมีผลต่อกระบวนการดูแลรักษา เช่น ผู้สูงอายุ เด็ก ภาวะอ้วน หรือความแตกต่างทางเพศ',
  },
  {
    code: 'F0014', category: 'nature_of_work', name: 'Nature of Work: Work process Complexity', labelTh: 'ความซับซ้อนของกระบวนการทำงาน',
    definition: 'ขั้นตอนการทำงานมีความซับซ้อน ยุ่งยาก หรือสับสนโดยไม่จำเป็น ทำให้มีโอกาสผิดพลาดสูง',
  },
  {
    code: 'F0015', category: 'nature_of_work', name: 'Nature of Work: Competing tasks', labelTh: 'งานที่ต้องแข่งขันกัน',
    definition: 'การทำงานภายใต้แรงกดดันหรือเวลาจำกัด ต้องเร่งให้ทันกำหนด จนอาจลัดขั้นตอนหรือลดความรอบคอบ',
  },
  {
    code: 'F0016', category: 'nature_of_work', name: 'Nature of Work: Interruptions', labelTh: 'การขัดจังหวะ',
    definition: 'การถูกรบกวนสมาธิจากบุคคล เสียง หรือเหตุการณ์แทรกซ้อน รวมถึงการทำหลายงานพร้อมกันหรือสลับงานจนสับสน',
  },
  {
    code: 'F0017', category: 'nature_of_work', name: 'Nature of Work: Physical/Cognitive requirements', labelTh: 'ความต้องการทางกายภาพ/สติปัญญา',
    definition: 'สภาพร่างกายหรือสติปัญญาของผู้ปฏิบัติงานไม่เหมาะสมกับลักษณะงาน ส่งผลให้ประสิทธิภาพหรือประสิทธิผลลดลง',
  },
  {
    code: 'F0018', category: 'team', name: 'Team: Complexity of team', labelTh: 'ความซับซ้อนของทีม',
    definition: 'องค์ประกอบของทีมมีความซับซ้อน หลากหลาย แตกต่าง หรือมีการทำงานคาบเกี่ยวกัน',
  },
  {
    code: 'F0019', category: 'team', name: 'Team: Team status', labelTh: 'สภาวะของทีม',
    definition: 'ลักษณะและสถานะของทีม เช่น ทีมทางการหรือเฉพาะกิจ ทีมที่ทำงานร่วมกันมานาน หรือทีมที่เพิ่งจัดตั้งใหม่',
  },
  {
    code: 'F0020', category: 'communication', name: 'Communication: Supervisor to staff', labelTh: 'หัวหน้างานถึงเจ้าหน้าที่',
    definition: 'การสื่อสารจากหัวหน้างานถึงเจ้าหน้าที่ไม่เป็นไปตามกระบวนการที่เหมาะสม หรือข้อมูลไม่ถูกต้อง ไม่ครบถ้วน ไม่ตรงเป้าหมาย',
  },
  {
    code: 'F0021', category: 'communication', name: 'Communication: Among staff or team members', labelTh: 'ระหว่างเจ้าหน้าที่หรือสมาชิกทีม',
    definition: 'การสื่อสารระหว่างบุคลากรหรือทีมงานไม่ครอบคลุม ไม่ครบถ้วน หรือไม่เหมาะสม เช่น ข้อมูลสำคัญสูญหายระหว่างส่งเวรหรือส่งต่อ',
  },
  {
    code: 'F0022', category: 'communication', name: 'Communication: Staff to patient (or family)', labelTh: 'เจ้าหน้าที่ถึงผู้ป่วยหรือครอบครัว',
    definition: 'การสื่อสารจากบุคลากรถึงผู้ป่วยหรือครอบครัวไม่ถูกต้อง ไม่ครบถ้วน หรือไม่เหมาะสม เช่น ไม่อธิบายทางเลือกการรักษา การใช้ยา หรืออาการเฝ้าระวัง',
  },
  {
    code: 'F0023', category: 'supervision_support', name: 'Supervision/support: Clinical supervision', labelTh: 'ด้านคลินิก',
    definition: 'การกำกับ ดูแล สนับสนุน ให้คำปรึกษาหรือคำแนะนำด้านคลินิกและงานที่เกี่ยวข้องกับบริการทางการแพทย์',
  },
  {
    code: 'F0024', category: 'supervision_support', name: 'Supervision/support: Managerial supervision', labelTh: 'ด้านการจัดการ',
    definition: 'การกำกับ ดูแล สนับสนุน ให้คำปรึกษาหรือคำแนะนำด้านการบริหารจัดการและกระบวนการปฏิบัติงานของหน่วยงานหรือองค์กร',
  },
  {
    code: 'F0025', category: 'policies_protocols', name: 'Policies & procedures/Clinical protocols: Presence of policies', labelTh: 'การมีนโยบาย',
    definition: 'การมีนโยบายหรือระเบียบปฏิบัติในการดูแลรักษาพยาบาลให้บุคลากรปฏิบัติตาม เพื่อนำไปสู่คุณภาพและความปลอดภัยของผู้ป่วย',
  },
  {
    code: 'F0026', category: 'policies_protocols', name: 'Policies & procedures/Clinical protocols: Clarity of policies', labelTh: 'ความชัดเจนของนโยบาย',
    definition: 'นโยบายหรือระเบียบปฏิบัติมีความชัดเจน เข้าใจง่าย และช่วยให้บุคลากรปฏิบัติงานได้ถูกต้อง เหมาะสม และมีประสิทธิภาพ',
  },
  {
    code: 'F0027', category: 'policies_protocols', name: 'Policies & procedures/Clinical protocols: Lack of compliance to policies, GL or SOP', labelTh: 'การไม่ปฏิบัติตามนโยบาย แนวปฏิบัติ หรือมาตรฐานการปฏิบัติงาน',
    definition: 'การละเลยหรือไม่ปฏิบัติตามนโยบาย แนวปฏิบัติ หรือมาตรฐาน ทำให้ประสิทธิผลการดูแลลดลงและอาจทำให้ผู้ป่วยไม่ปลอดภัย',
  },
  {
    code: 'F0028', category: 'data_information', name: 'Data & Information: Availability', labelTh: 'ความพร้อมใช้งาน',
    definition: 'ข้อมูลหรือสารสนเทศมีความพร้อมใช้ และสามารถเข้าถึงหรือเรียกใช้งานได้อย่างทันท่วงที',
  },
  {
    code: 'F0029', category: 'data_information', name: 'Data & Information: Accuracy', labelTh: 'ความแม่นยำ',
    definition: 'ข้อมูลหรือสารสนเทศมีความเที่ยงตรง แม่นยำ และแสดงค่าที่แท้จริงของคุณลักษณะที่กำลังวัด',
  },
  {
    code: 'F0030', category: 'data_information', name: 'Data & Information: Legibility', labelTh: 'ความชัดเจน',
    definition: 'ข้อมูลหรือสารสนเทศมีความชัดเจน ตรงประเด็น และสามารถเข้าใจได้ง่าย',
  },
  {
    code: 'F0031', category: 'equipment_device', name: 'Equipment/device: Function', labelTh: 'การทำงาน',
    definition: 'อุปกรณ์หรือเครื่องมือทำงานไม่ถูกต้อง หรือไม่ตรงตามวัตถุประสงค์และความต้องการ',
  },
  {
    code: 'F0032', category: 'equipment_device', name: 'Equipment/device: Design', labelTh: 'การออกแบบ',
    definition: 'อุปกรณ์หรือเครื่องมือออกแบบไม่เอื้อต่อการใช้งาน หรือชวนให้เกิดความเข้าใจผิด เช่น ปุ่มกดอยู่ใกล้กันเกินไป',
  },
  {
    code: 'F0033', category: 'equipment_device', name: 'Equipment/device: Availability', labelTh: 'ความพร้อมใช้งาน',
    definition: 'อุปกรณ์หรือเครื่องมือไม่พร้อมสำหรับการใช้งาน เช่น มีไม่เพียงพอหรือไม่อยู่ในสภาพพร้อมใช้',
  },
  {
    code: 'F0034', category: 'equipment_device', name: 'Equipment/device: Maintenance', labelTh: 'การบำรุงรักษา',
    definition: 'ขาดการบำรุงรักษาอย่างเหมาะสม เช่น การตรวจสอบ การสอบเทียบ การบำรุงรักษาเชิงป้องกัน หรือการซ่อมแซม',
  },
  {
    code: 'F0035', category: 'environment', name: 'Environment: Culture of safety, Management, Poor engineer control', labelTh: 'วัฒนธรรมความปลอดภัย การจัดการ การควบคุมทางวิศวกรรมที่ไม่ดี',
    definition: 'การจัดการสภาพแวดล้อมการทำงานและการควบคุมทางวิศวกรรมไม่เหมาะสม เช่น ไฟฟ้า เครื่องใช้ไฟฟ้า สารเคมี หรืออุปกรณ์ ซึ่งอาจก่ออันตรายต่อผู้ป่วยและผู้ปฏิบัติงาน',
  },
  {
    code: 'F0036', category: 'environment', name: 'Environment: Physical surroundings (e.g., lighting, noise)', labelTh: 'สภาพแวดล้อมทางกายภาพ',
    definition: 'สภาพแวดล้อมทางกายภาพเป็นอุปสรรค เช่น แสงสว่างไม่พอ เสียงดังรบกวน อุณหภูมิร้อนหรือหนาวเกินไป หรือพื้นที่คับแคบ',
  },
];

const FACTOR_BY_CODE = new Map(CONTRIBUTING_FACTORS.map((factor) => [factor.code, factor]));

export function getContributingFactor(code: string) {
  return FACTOR_BY_CODE.get(String(code || '').toUpperCase());
}

export function normalizeContributingFactorSelections(value: unknown): ContributingFactorSelection[] {
  let rows: unknown = value;
  if (typeof value === 'string') {
    try {
      rows = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rows)) return [];

  const seen = new Set<string>();
  const normalized: ContributingFactorSelection[] = [];
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const source = row as Record<string, unknown>;
    const code = String(source.code || '').toUpperCase();
    const processKey = typeof source.process_key === 'string' ? source.process_key.trim() : '';
    const tier = Number(source.tier);
    const normalizedTier = Number.isInteger(tier) && tier >= 1 && tier <= 5 ? tier : undefined;
    const scopedCode = `${processKey || '__case__'}:${normalizedTier || '__tier__'}:${code}`;
    if (!FACTOR_BY_CODE.has(code) || seen.has(scopedCode)) return;
    seen.add(scopedCode);
    const detail = typeof source.detail === 'string' ? source.detail.trim() : '';
    normalized.push({
      code,
      ...(detail ? { detail } : {}),
      ...(processKey ? { process_key: processKey } : {}),
      ...(normalizedTier ? { tier: normalizedTier } : {}),
    });
  });
  return normalized;
}

export function contributingFactorSelectionsFromLegacy(items: LegacyCauseFactor[] = []) {
  const selections: ContributingFactorSelection[] = [];
  const legacy: LegacyCauseFactor[] = [];
  const seen = new Set<string>();

  items.forEach((item) => {
    const code = item.factor?.match(/\bF\d{4}\b/i)?.[0]?.toUpperCase();
    if (!code || !FACTOR_BY_CODE.has(code)) {
      legacy.push(item);
      return;
    }
    if (!seen.has(code)) {
      seen.add(code);
      selections.push({ code, ...(item.sub_factor?.trim() ? { detail: item.sub_factor.trim() } : {}) });
    }
  });

  return { selections, legacy };
}

export function contributingFactorSelectionsToLegacy(items: ContributingFactorSelection[]): LegacyCauseFactor[] {
  return normalizeContributingFactorSelections(items).map((selection, index) => {
    const definition = FACTOR_BY_CODE.get(selection.code)!;
    return {
      category: definition.category,
      factor: `${definition.code} ${definition.name}`,
      sub_factor: selection.process_key
        ? `[กระบวนการ: ${selection.process_key}${selection.tier ? ` / Tier ${selection.tier}` : ''}]${selection.detail ? ` ${selection.detail}` : ''}`
        : selection.detail,
      sort_order: index + 1,
    };
  });
}

export function formatContributingFactorSummary(items: ContributingFactorSelection[], additionalCause = '') {
  const parts = normalizeContributingFactorSelections(items).map((selection) => {
    const definition = FACTOR_BY_CODE.get(selection.code)!;
    const detail = selection.detail ? `: ${selection.detail}` : '';
    const process = selection.process_key ? ` (${selection.process_key}${selection.tier ? ` / Tier ${selection.tier}` : ''})` : '';
    return `[${definition.code}] ${definition.labelTh}${process}${detail}`;
  });
  if (additionalCause.trim()) parts.push(`สาเหตุเพิ่มเติม: ${additionalCause.trim()}`);
  return parts.join(' | ');
}
