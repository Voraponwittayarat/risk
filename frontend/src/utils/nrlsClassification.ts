export type NrlsRiskKind = 'clinical' | 'general';
export type NrlsTypeId = '2' | '1';

export function getNrlsRiskKind(nrlsCode: unknown): NrlsRiskKind | null {
  const code = String(nrlsCode || '').trim().toUpperCase();
  if (code.startsWith('C')) return 'clinical';
  if (code.startsWith('G')) return 'general';
  return null;
}

export function getNrlsTypeId(nrlsCode: unknown): NrlsTypeId | '' {
  const kind = getNrlsRiskKind(nrlsCode);
  return kind === 'clinical' ? '2' : kind === 'general' ? '1' : '';
}

export function getNrlsRiskKindLabel(nrlsCode: unknown): string {
  const kind = getNrlsRiskKind(nrlsCode);
  return kind === 'clinical' ? 'Clinical' : kind === 'general' ? 'General' : 'ไม่ทราบประเภท';
}
