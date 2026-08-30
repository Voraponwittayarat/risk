import { canonicalRole, legacyFieldsForRole } from './role.utils';

describe('canonical roles', () => {
  it('keeps one valid canonical role', () => {
    expect(canonicalRole('rm_committee', 1)).toBe('rm_committee');
  });

  it('maps the legacy numeric user role only when canonical role is absent', () => {
    expect(canonicalRole(null, 1)).toBe('admin');
    expect(canonicalRole(null, 10)).toBe('rm_committee');
    expect(canonicalRole(null, 20)).toBe('head');
    expect(canonicalRole(null, 99)).toBe('staff');
  });

  it('does not layer RM or head flags onto the admin compatibility mirror', () => {
    expect(legacyFieldsForRole('admin')).toEqual({
      userRole: 1,
      accessrules: '1',
      rmStatus: null,
      priority: '5',
    });
  });
});
