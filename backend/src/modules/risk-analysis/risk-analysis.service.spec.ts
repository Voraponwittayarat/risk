import { ForbiddenException } from '@nestjs/common';
import { RiskAnalysisService } from './risk-analysis.service';

describe('Risk reports use stored records and selected scope', () => {
  let prisma: any;
  let service: RiskAnalysisService;
  beforeEach(() => {
    prisma = {
      riskanalysis: { findMany: jest.fn().mockResolvedValue([]) },
      department: { findMany: jest.fn().mockResolvedValue([{ id: 1, depart_name: 'Unit one' }, { id: 2, depart_name: 'Unit two' }]) },
      riskstore: { findMany: jest.fn().mockResolvedValue([{ riskstore_id: 7, nrls_code: 'TEST' }]) },
      nRLS_riskstore: { findMany: jest.fn().mockResolvedValue([{ nrls_code: 'TEST', name: 'Test incident' }]) },
      nine_standards: { findMany: jest.fn().mockResolvedValue([{ id: 1, std_number: 1, std_name: 'Stored standard', risk_codes: '7', safety_category: null }]) },
    };
    service = new RiskAnalysisService(prisma);
  });

  it('keeps the selected department in KPI queries for multi-department users', async () => {
    await service.getStats({ department_id: '2', scope_level: 'department' }, { role: 'staff', departmentId: 1, departmentId2: 2 });
    expect(prisma.riskanalysis.findMany).toHaveBeenCalledWith({ where: { department_id: '2', scope_level: 'department' } });
  });

  it('rejects out-of-scope KPI selection instead of returning another department', async () => {
    await expect(service.getStats({ department_id: '2' }, { role: 'staff', departmentId: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.riskanalysis.findMany).not.toHaveBeenCalled();
  });

  it('limits a department head to their departments unless they have group scope', async () => {
    await service.getStats({}, { role: 'head', departmentId: 1 });
    expect(prisma.riskanalysis.findMany).toHaveBeenCalledWith({ where: { department_id: { in: ['1'] } } });
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });

  it('uses the same due filter as the due register', async () => {
    await service.getStats({ due_soon: true, department_id: '2' }, { role: 'admin' });
    expect(prisma.riskanalysis.findMany.mock.calls[0][0].where).toMatchObject({ department_id: '2', status: { not: 'closed' }, next_review_date: { lte: expect.any(Date) } });
  });

  it('never claims measures exist when there are no stored profiles', async () => {
    const result = await service.getNineStandards({ department_id: '1' }, { role: 'staff', departmentId: 1 });
    expect(result[0]).toMatchObject({ name: 'Stored standard', mappedCodes: ['TEST'], incidents: [{ code: 'TEST', name: 'Test incident' }], total: 0, withMeasures: 0, profiles: [] });
    expect(prisma.riskanalysis.findMany.mock.calls[0][0].where.department_id).toBe('1');
  });

  it('counts only mapped profiles and actual non-empty measures', async () => {
    const base = { department_id: '1', reviews: [], nrls_code: 'TEST' };
    prisma.riskanalysis.findMany.mockResolvedValue([
      { ...base, id: 1, risk_title: 'Saved one', risk_prevention: 'A saved plan', source: 'FMEA' },
      { ...base, id: 2, risk_title: 'Saved two', risk_prevention: '  ', risk_mitigation: null },
      { ...base, id: 3, nrls_code: 'OTHER', risk_prevention: 'Unrelated' },
    ]);
    const result = await service.getNineStandards({}, { role: 'admin' });
    expect(result[0]).toMatchObject({ total: 2, withMeasures: 1, proactive: 1 });
    expect(result[0].profiles.map(p => p.id)).toEqual([1, 2]);
  });

  it('does not invent a standard catalogue when the database has none', async () => {
    prisma.nine_standards.findMany.mockResolvedValue([]);
    expect(await service.getNineStandards({}, { role: 'admin' })).toEqual([]);
  });
});
