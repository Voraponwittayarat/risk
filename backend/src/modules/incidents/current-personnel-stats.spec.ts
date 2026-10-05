import { IncidentsService } from './incidents.service';
describe('staff reporting against latest roster', () => {
  function setup(roster: any) {
    const prisma = {
      personnel_roster_batch: { findFirst: jest.fn(async () => roster) },
      riskregister: { findFirst: jest.fn(async () => ({ date_report: new Date('2026-01-02') })), findMany: jest.fn(async () => [
        { id: 1, created_by: 10, date_report: new Date('2026-01-02'), department_id: '8' },
        { id: 2, created_by: 10, date_report: new Date('2026-01-03'), department_id: '8' },
        { id: 3, created_by: 99, date_report: new Date('2026-01-04'), department_id: '8' },
      ]) },
      department: { findMany: jest.fn(async () => [{ id: 8, depart_name: 'งานผู้ป่วยใน', depart_group_id: 1 }]) },
      departmentgroup: { findMany: jest.fn(async () => []) },
      member: { findMany: jest.fn(async () => [{ id: 3, cid: 'fixture-cid', department_id1: 9 }]) },
      user: { findMany: jest.fn(async () => [{ id: 10, cid: 'fixture-cid' }]) },
    };
    const service = new IncidentsService(prisma as any, {} as any);
    jest.spyOn(service as any, 'getVisibleReportDepartmentIds').mockResolvedValue(null);
    jest.spyOn(service as any, 'scopeIncidentWhere').mockImplementation(async w => w);
    return { service, prisma };
  }
  it('includes unregistered staff, deduplicates people and excludes past/non-roster reporters', async () => {
    const { service, prisma } = setup({ id: 1, as_of: new Date('2026-10-02'), imported_at: new Date(), entries: [
      { id: 100, member_id: 3, department_id: 8 }, { id: 101, member_id: null, department_id: 8 },
    ] });
    const result = await service.getDepartmentStaffReportingStats({ year: 2026, year_type: 'calendar' }, { role: 'admin' });
    expect(result.summary).toMatchObject({ totalHospitalStaff: 2, staffSource: 'latest_roster', rosterUnlinked: 1 });
    expect(result.monthlyStaffTotals[1]).toBe(1);
    expect(result.monthlyStaffPercentages[1]).toBe('50.00%');
    expect(result.departmentRows.find(r => r.department_name.includes('IPD'))).toMatchObject({ total_staff: 2, monthly_counts: expect.objectContaining({ 1: 1 }) });
    expect(prisma.member.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [3] } } }));
  });
  it('keeps the existing active-member source when no snapshot has been imported', async () => {
    const { service, prisma } = setup(null);
    const result = await service.getDepartmentStaffReportingStats({ year: 2026 }, { role: 'admin' });
    expect(result.summary.staffSource).toBe('active_members');
    expect(prisma.member.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: '1' } }));
  });
  it('counts a linked member without a login account as not yet linked to a reporter', async () => {
    const { service, prisma } = setup({ id: 1, as_of: new Date('2026-10-02'), imported_at: new Date(), entries: [{ id: 100, member_id: 3, department_id: 8 }] });
    prisma.user.findMany.mockResolvedValue([]);
    const result = await service.getDepartmentStaffReportingStats({ year: 2026 }, { role: 'admin' });
    expect(result.summary).toMatchObject({ totalHospitalStaff: 1, rosterUnlinked: 1 });
    expect(result.monthlyStaffTotals[1]).toBe(0);
  });
});
