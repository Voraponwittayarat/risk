export interface ContributingFactorSelection {
  code: string;
  detail?: string;
  process_key?: string;
  tier?: number;
}

export interface ContributingFactorCatalogItem {
  code: string;
  category: string;
  name: string;
}

export const NRLS_CONTRIBUTING_FACTOR_VERSION = '2569';

export const NRLS_CONTRIBUTING_FACTORS: ContributingFactorCatalogItem[] = [
  { code: 'F0001', category: 'staff', name: 'Staff Factors: Fatigue' },
  { code: 'F0002', category: 'staff', name: 'Staff Factors: Stress' },
  { code: 'F0003', category: 'staff', name: 'Staff Factors: Inattention' },
  { code: 'F0004', category: 'staff', name: 'Staff Factors: Competence, Knowledge, Skills, Experience' },
  { code: 'F0005', category: 'staff', name: 'Staff Factors: Cognitive bias' },
  { code: 'F0007', category: 'staff', name: 'Staff Factors: Health issues' },
  { code: 'F0008', category: 'staff', name: 'Staff Factors: Attitude, Mindset, Culture' },
  { code: 'F0010', category: 'patient', name: 'Patient Factors: Clinical condition' },
  { code: 'F0011', category: 'patient', name: 'Patient Factors: Medication' },
  { code: 'F0012', category: 'patient', name: 'Patient Factors: Language, sociocultural' },
  { code: 'F0013', category: 'patient', name: 'Patient Factors: Informed & literacy' },
  { code: 'F0037', category: 'patient', name: 'Patient Factors: Individual conditions' },
  { code: 'F0014', category: 'nature_of_work', name: 'Nature of Work: Work process Complexity' },
  { code: 'F0015', category: 'nature_of_work', name: 'Nature of Work: Competing tasks' },
  { code: 'F0016', category: 'nature_of_work', name: 'Nature of Work: Interruptions' },
  { code: 'F0017', category: 'nature_of_work', name: 'Nature of Work: Physical/Cognitive requirements' },
  { code: 'F0018', category: 'team', name: 'Team: Complexity of team' },
  { code: 'F0019', category: 'team', name: 'Team: Team status' },
  { code: 'F0020', category: 'communication', name: 'Communication: Supervisor to staff' },
  { code: 'F0021', category: 'communication', name: 'Communication: Among staff or team members' },
  { code: 'F0022', category: 'communication', name: 'Communication: Staff to patient (or family)' },
  { code: 'F0023', category: 'supervision_support', name: 'Supervision/support: Clinical supervision' },
  { code: 'F0024', category: 'supervision_support', name: 'Supervision/support: Managerial supervision' },
  { code: 'F0025', category: 'policies_protocols', name: 'Policies & procedures/Clinical protocols: Presence of policies' },
  { code: 'F0026', category: 'policies_protocols', name: 'Policies & procedures/Clinical protocols: Clarity of policies' },
  { code: 'F0027', category: 'policies_protocols', name: 'Policies & procedures/Clinical protocols: Lack of compliance to policies, GL or SOP' },
  { code: 'F0028', category: 'data_information', name: 'Data & Information: Availability' },
  { code: 'F0029', category: 'data_information', name: 'Data & Information: Accuracy' },
  { code: 'F0030', category: 'data_information', name: 'Data & Information: Legibility' },
  { code: 'F0031', category: 'equipment_device', name: 'Equipment/device: Function' },
  { code: 'F0032', category: 'equipment_device', name: 'Equipment/device: Design' },
  { code: 'F0033', category: 'equipment_device', name: 'Equipment/device: Availability' },
  { code: 'F0034', category: 'equipment_device', name: 'Equipment/device: Maintenance' },
  { code: 'F0035', category: 'environment', name: 'Environment: Culture of safety, Management, Poor engineer control' },
  { code: 'F0036', category: 'environment', name: 'Environment: Physical surroundings (e.g., lighting, noise)' },
];

const factorByCode = new Map(NRLS_CONTRIBUTING_FACTORS.map((factor) => [factor.code, factor]));

export function normalizeContributingFactors(value: unknown): ContributingFactorSelection[] {
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
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const source = row as Record<string, unknown>;
    const code = String(source.code || '').toUpperCase();
    const processKey = typeof source.process_key === 'string'
      ? source.process_key.trim().slice(0, 100)
      : '';
    const tier = Number(source.tier);
    const normalizedTier = Number.isInteger(tier) && tier >= 1 && tier <= 5 ? tier : undefined;
    const scopedCode = `${processKey || '__case__'}:${normalizedTier || '__tier__'}:${code}`;
    if (!factorByCode.has(code) || seen.has(scopedCode)) continue;
    seen.add(scopedCode);
    const detail = typeof source.detail === 'string' ? source.detail.trim().slice(0, 4000) : '';
    normalized.push({
      code,
      ...(detail ? { detail } : {}),
      ...(processKey ? { process_key: processKey } : {}),
      ...(normalizedTier ? { tier: normalizedTier } : {}),
    });
  }
  return normalized;
}

export function serializeContributingFactors(value: unknown): string | null {
  const normalized = normalizeContributingFactors(value);
  return normalized.length ? JSON.stringify(normalized) : null;
}

export function toLegacyFishbone(code: string, detail: string) {
  const factor = factorByCode.get(code);
  if (!factor) throw new Error(`Unknown NRLS contributing factor: ${code}`);
  return {
    category: factor.category,
    factor: `${factor.code} ${factor.name}`,
    sub_factor: detail,
  };
}
