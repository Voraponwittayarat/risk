import { normalizeMappingPermission } from './mapping-permission.utils';

describe('normalizeMappingPermission', () => {
  it('gives every RM full Mapping access by default regardless of RM scope', () => {
    expect(normalizeMappingPermission('rm_committee', null)).toBe('full');
    expect(normalizeMappingPermission('rm_committee', undefined)).toBe('full');
  });

  it('keeps the permission level selected by Admin for RM', () => {
    expect(normalizeMappingPermission('rm_committee', 'none')).toBe('none');
    expect(normalizeMappingPermission('rm_committee', 'contribute')).toBe(
      'contribute',
    );
    expect(normalizeMappingPermission('rm_committee', 'full')).toBe('full');
  });

  it('keeps Admin full and non-RM roles off', () => {
    expect(normalizeMappingPermission('admin', 'none')).toBe('full');
    expect(normalizeMappingPermission('head', 'full')).toBe('none');
    expect(normalizeMappingPermission('staff', 'full')).toBe('none');
  });
});
