import { normalizeRmScope } from './rm-scope.utils';

describe('normalizeRmScope', () => {
  it('defaults RM Committee members to department scope', () => {
    expect(normalizeRmScope('rm_committee')).toBe('department');
  });

  it('keeps valid RM scopes', () => {
    expect(normalizeRmScope('rm_committee', 'group')).toBe('group');
    expect(normalizeRmScope('rm_committee', 'hospital')).toBe('hospital');
  });

  it('separates department heads from group heads', () => {
    expect(normalizeRmScope('head')).toBe('department');
    expect(normalizeRmScope('head', 'department')).toBe('department');
    expect(normalizeRmScope('head', 'group')).toBe('group');
    expect(normalizeRmScope('head', 'hospital')).toBe('department');
  });

  it('clears RM scope for other roles', () => {
    expect(normalizeRmScope('staff', 'hospital')).toBeNull();
  });
});
