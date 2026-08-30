export const CANONICAL_ROLES = ['admin', 'rm_committee', 'head', 'staff'] as const;
export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

export function canonicalRole(value?: string | null, legacyUserRole = 99): CanonicalRole {
  if (value && CANONICAL_ROLES.includes(value as CanonicalRole)) {
    return value as CanonicalRole;
  }
  if (legacyUserRole === 1) return 'admin';
  if (legacyUserRole === 10) return 'rm_committee';
  if (legacyUserRole === 20) return 'head';
  return 'staff';
}

export function legacyFieldsForRole(role: CanonicalRole) {
  switch (role) {
    case 'admin':
      return { userRole: 1, accessrules: '1', rmStatus: null, priority: '5' };
    case 'rm_committee':
      return { userRole: 10, accessrules: null, rmStatus: '1', priority: '5' };
    case 'head':
      return { userRole: 20, accessrules: null, rmStatus: null, priority: '1' };
    default:
      return { userRole: 99, accessrules: null, rmStatus: null, priority: '5' };
  }
}
