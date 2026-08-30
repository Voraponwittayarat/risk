import { IncidentRcaPolicyService, RCA_POLICY_VERSION } from './incident-rca-policy.service';

describe('IncidentRcaPolicyService', () => {
  const prisma: any = {
    nine_standards: { findMany: jest.fn().mockResolvedValue([]) },
    riskstore: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const service = new IncidentRcaPolicyService(prisma);

  it('requires Standard RCA for clinical severe harm', async () => {
    const result = await service.evaluate({ nrls_code: 'CPP405', level_id: 'G' }, new Date('2026-08-24T00:00:00Z'));
    expect(result).toMatchObject({ rca_required: true, recommended_rca_type: 'STANDARD', policy_version: RCA_POLICY_VERSION });
    expect(result.criteria_matches[0]).toContain('G');
  });

  it('requires Standard RCA for section 41 regardless of client recommendation', async () => {
    const result = await service.evaluate({ nrls_code: 'GPI101', level_id: '1', is_sec41: true });
    expect(result.recommended_rca_type).toBe('STANDARD');
    expect(result.rca_required).toBe(true);
  });

  it('does not guess a clinical mapping from an unmapped local risk', async () => {
    const result = await service.evaluate({ riskstore_id: 999, level_id: 'D' });
    expect(result.rca_required).toBe(false);
    expect(result.mapping_review_required).toBe(true);
  });
});
