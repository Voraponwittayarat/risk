export const MAPPING_PERMISSIONS = ['none', 'contribute', 'full'] as const;

export type MappingPermission = (typeof MAPPING_PERMISSIONS)[number];

export function normalizeMappingPermission(
  role: string | null | undefined,
  permission?: string | null,
): MappingPermission {
  if (role === 'admin') return 'full';
  if (role !== 'rm_committee') return 'none';
  return MAPPING_PERMISSIONS.includes(permission as MappingPermission)
    ? (permission as MappingPermission)
    : 'full';
}
