import mappingCsv from '../data/NRLS_5Tier_Mapping_2569.csv?raw';

export interface Nrls5TierMappingItem {
  factorCode: string;
  factorCategory: string;
  factorNameEn: string;
  factorNameTh: string;
  suggestedTiers: number[];
  tierNames: string[];
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  cells.push(value.trim());
  return cells;
}

function parseTierValues(value: string): number[] {
  return [...new Set(value
    .split(/[|;/\s]+/)
    .map((item) => Number(item))
    .filter((tier) => Number.isInteger(tier) && tier >= 1 && tier <= 5))];
}

function parseMapping(): Nrls5TierMappingItem[] {
  const lines = mappingCsv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  const headers = parseCsvLine(lines[0]);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const byCode = new Map<string, Nrls5TierMappingItem>();

  lines.slice(1).forEach((line) => {
    const cells = parseCsvLine(line);
    const read = (header: string) => cells[headerIndex.get(header) ?? -1] || '';
    const factorCode = read('factor_code').toUpperCase();
    if (!/^F\d{4}$/.test(factorCode)) return;
    const tiers = parseTierValues(read('primary_tier'));
    const existing = byCode.get(factorCode);
    if (existing) {
      existing.suggestedTiers = [...new Set([...existing.suggestedTiers, ...tiers])].sort();
      const tierName = read('primary_tier_name');
      if (tierName && !existing.tierNames.includes(tierName)) existing.tierNames.push(tierName);
      return;
    }
    byCode.set(factorCode, {
      factorCode,
      factorCategory: read('factor_category'),
      factorNameEn: read('factor_name_en'),
      factorNameTh: read('factor_name_th'),
      suggestedTiers: tiers,
      tierNames: read('primary_tier_name') ? [read('primary_tier_name')] : [],
    });
  });

  return [...byCode.values()];
}

export const NRLS_5_TIER_MAPPING_2569 = parseMapping();

export function getSuggestedFactorCodesForTier(tier: number): string[] {
  return NRLS_5_TIER_MAPPING_2569
    .filter((item) => item.suggestedTiers.includes(tier))
    .map((item) => item.factorCode);
}

export function getSuggestedTiersForFactor(code: string): number[] {
  return NRLS_5_TIER_MAPPING_2569.find((item) => item.factorCode === code.toUpperCase())?.suggestedTiers || [];
}
