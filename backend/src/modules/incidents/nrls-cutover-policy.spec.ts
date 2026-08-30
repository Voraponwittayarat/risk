import { isNrlsRequired, maxWithNrlsCutover, NRLS_CUTOVER_DATE } from './nrls-cutover-policy';

describe('NRLS cutover policy', () => {
  it('does not require NRLS before 1 October 2026', () => {
    expect(isNrlsRequired('2026-09-30')).toBe(false);
  });

  it('requires NRLS from 1 October 2026 onward', () => {
    expect(isNrlsRequired(NRLS_CUTOVER_DATE)).toBe(true);
    expect(isNrlsRequired('2026-10-02')).toBe(true);
  });

  it('does not let monitoring count a period before the cutover', () => {
    expect(maxWithNrlsCutover(new Date('2020-01-01T00:00:00.000Z')).toISOString().slice(0, 10)).toBe(NRLS_CUTOVER_DATE);
    expect(maxWithNrlsCutover(new Date('2026-11-01T00:00:00.000Z')).toISOString().slice(0, 10)).toBe('2026-11-01');
  });
});
