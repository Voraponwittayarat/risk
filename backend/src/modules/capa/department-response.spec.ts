import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CapaService } from './capa.service';

describe('Hospital RM response monitoring', () => {
  const rm = { role: 'rm_committee', rmScope: 'hospital' };
  let db: any;
  let service: CapaService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T12:00:00Z'));
    db = {
      department: { findMany: jest.fn().mockResolvedValue(Array.from({ length: 17 }, (_, i) => ({ id: i + 1, depart_name: `Department ${i + 1}` }))) },
      sla_instance: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new CapaService(db);
  });
  afterEach(() => jest.useRealTimers());

  it.each([{}, { role: 'admin' }, { role: 'head', rmScope: 'hospital' }, { role: 'user' },
    { role: 'rm_committee', rmScope: 'department' }, { role: 'rm_committee', rmScope: 'group' }, { role: 'rm_committee' }])(
    'denies monitoring API access for %j before querying data', async (user) => {
      await expect(service.departmentResponse(user)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.findMonitoringActions(user, {})).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.department.findMany).not.toHaveBeenCalled();
    },
  );

  it('includes all 17 departments and separates response duration from waiting time', async () => {
    const item = { owner_department_id: '1', started_at: new Date('2026-09-09T00:00:00Z'), due_at: new Date('2026-09-09T04:00:00Z') };
    db.sla_instance.findMany.mockResolvedValue([
      { ...item, status: 'COMPLETED', completed_at: new Date('2026-09-09T04:00:00Z') },
      { ...item, status: 'COMPLETED', completed_at: new Date('2026-09-09T08:00:00Z') },
      { ...item, status: 'ACTIVE', completed_at: null },
      { ...item, status: 'ACTIVE', due_at: new Date('2026-09-10T00:00:00Z') },
      { ...item, status: 'COMPLETED', completed_at: null },
      { ...item, status: 'ACTIVE', owner_department_id: '999' },
    ]);
    const result = await service.departmentResponse(rm);
    expect(result.rows).toHaveLength(17);
    expect(result.rows[0]).toMatchObject({ total: 4, responded: 2, pending: 2, overdue: 1,
      average_hours: 6, median_hours: 6, on_time_percent: 50, longest_wait_hours: 12 });
    expect(result.rows[1]).toMatchObject({ total: 0, average_hours: null, on_time_percent: null, longest_wait_hours: null });
    expect(result.invalid_records).toBe(1);
    expect(result.unassigned_records).toBe(1);
  });

  it('filters by inclusive Bangkok calendar dates and only owner review SLA', async () => {
    await service.departmentResponse(rm, '2026-09-01', '2026-09-09');
    expect(db.sla_instance.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      entity_type: 'INCIDENT', workflow_stage: 'REVIEW_OWNER', status: { in: ['ACTIVE', 'COMPLETED'] },
      started_at: { gte: new Date('2026-08-31T17:00:00Z'), lt: new Date('2026-09-09T17:00:00Z') },
    } }));
  });

  it.each([['2026-02-30', undefined], ['invalid', undefined], ['2026-09-10', '2026-09-01']])(
    'rejects invalid date ranges %s %s', async (from, to) => {
      await expect(service.departmentResponse(rm, from, to)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.sla_instance.findMany).not.toHaveBeenCalled();
    },
  );
});
