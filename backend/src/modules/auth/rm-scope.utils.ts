export const RM_SCOPES = ['department', 'group', 'hospital'] as const;

export type RmScope = typeof RM_SCOPES[number];

export function normalizeRmScope(role: string | null | undefined, scope?: string | null): RmScope | null {
  if (role === 'rm_committee') {
    return RM_SCOPES.includes(scope as RmScope) ? scope as RmScope : 'department';
  }
  if (role === 'head') {
    return scope === 'group' ? 'group' : 'department';
  }
  return null;
}
