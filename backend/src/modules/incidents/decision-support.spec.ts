import {
  analyticsPeriod,
  AnalyticsIncident,
  summarizeSignals,
} from './decision-support';
import { IncidentsService } from './incidents.service';

const row = (
  overrides: Partial<AnalyticsIncident> = {},
): AnalyticsIncident => ({
  id: 1,
  id_risk: 9,
  date_report: new Date('2026-09-13'),
  department_id: '1',
  nrls_code: 'TEST',
  classification_status: 'CONFIRMED',
  level_id: 'B',
  rca_required: false,
  rca_status: 'NONE',
  rca_due_at: null,
  ...overrides,
});
describe('decision support', () => {
  const now = new Date('2026-09-13T10:00:00Z');
  it('uses Bangkok calendar days and equal non-overlapping windows', () => {
    const p = analyticsPeriod(30, new Date('2026-09-12T18:00:00Z'));
    expect(p.end.toISOString().slice(0, 10)).toBe('2026-09-13');
    expect((+p.end - +p.start) / 86400000).toBe(29);
    expect(+p.start - +p.previousStart).toBe(30 * 86400000);
    expect(() => analyticsPeriod('garbage', now)).toThrow();
    expect(() => analyticsPeriod(365, now)).toThrow();
  });
  it('excludes unconfirmed codes from trends, separates A/B, and handles zero baseline', () => {
    const p = analyticsPeriod(30, now);
    const result = summarizeSignals(
      [
        row(),
        row({ id: 2, level_id: 'A' }),
        row({ id: 3, classification_status: 'PENDING', level_id: 'I' }),
        row({ id: 4, date_report: new Date('2026-09-14') }),
      ],
      p,
    );
    expect(result.summary).toMatchObject({
      total: 3,
      nearMiss: 1,
      unsafeConditions: 1,
      unclassified: 1,
      severe: 1,
    });
    expect(result.priorities[0]).toMatchObject({
      count: 2,
      previous: 0,
      percent: null,
      repeatDepartments: 1,
    });
  });
  it('does not call cross-department reports recurrence and includes both boundaries', () => {
    const p = analyticsPeriod(30, now);
    const result = summarizeSignals(
      [
        row({ date_report: p.start }),
        row({ department_id: '2' }),
        row({ date_report: p.previousStart }),
        row({ date_report: p.previousEnd }),
        row({ date_report: new Date(+p.previousStart - 86400000) }),
      ],
      p,
    );
    expect(result.priorities[0]).toMatchObject({
      count: 2,
      previous: 2,
      delta: 0,
      repeatDepartments: 0,
    });
  });
  it('returns empty signals without manufacturing a positive safety conclusion', () => {
    expect(summarizeSignals([], analyticsPeriod(90, now))).toMatchObject({
      priorities: [],
      summary: { total: 0, repeated: 0 },
    });
  });

  it('scopes records and CAPA composite identities, retaining old backlog and silent high risks', async () => {
    jest.useFakeTimers().setSystemTime(now);
    try {
      const prisma: any = {
        riskregister: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              row({
                date_report: new Date('2020-01-01'),
                rca_required: true,
                rca_due_at: new Date('2020-02-01'),
              }),
            ]),
        },
        department: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 1, depart_name: 'Test unit' }]),
        },
        nRLS_riskstore: { findMany: jest.fn().mockResolvedValue([]) },
        riskanalysis: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                id: 10,
                risk_title: 'Synthetic risk',
                department_id: '1',
                scope_level: 'department',
                nrls_code: 'TEST',
                is_never_event: 1,
                initial_risk_level: 'red',
                next_review_date: null,
                reviews: [],
                source: 'FMEA',
              },
            ]),
        },
        capa_action: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 2,
              incident_id: 1,
              status: 'PENDING',
              due_date: new Date('2026-09-12'),
              effectiveness_status: 'NOT_DUE',
            },
            {
              id: 3,
              incident_id: 1,
              status: 'AWAITING_EFFECTIVENESS',
              due_date: new Date('2026-09-01'),
              completed_at: new Date('2026-09-02'),
              effectiveness_due_date: new Date('2026-09-12'),
              effectiveness_status: 'NOT_DUE',
            },
            {
              id: 4,
              incident_id: 1,
              status: 'CLOSED',
              effectiveness_status: 'EFFECTIVE',
            },
          ]),
        },
      };
      const service = new IncidentsService(prisma, {} as any);
      const result = await service.getDecisionSupport(
        { days: 30, department_id: '2' },
        { id: 99, role: 'staff', departmentId: 1 },
      );
      const where = prisma.riskregister.findMany.mock.calls[0][0].where;
      expect(where.AND[0]).toEqual({ department_id: '2' });
      expect(JSON.stringify(where.AND[1])).toContain('created_by');
      expect(prisma.capa_action.findMany.mock.calls[0][0].where.OR).toEqual([
        { incident_id: 1, incident_id_risk: 9 },
      ]);
      expect(prisma.riskanalysis.findMany.mock.calls[0][0].where).toMatchObject(
        { department_id: { in: ['1'] }, AND: [{ department_id: '2' }] },
      );
      expect(result.summary.total).toBe(0);
      expect(result.backlog).toMatchObject({
        rca: 1,
        overdueRca: 1,
        capa: 2,
        overdueCapa: 1,
      });
      expect(result.effectiveness).toMatchObject({
        effective: 1,
        unassessed: 2,
        overdue: 1,
      });
      expect(result.followup[0]).toMatchObject({ count: 0, assessed: false });
      expect(result.proactive.count).toBe(1);
      expect(result.departments[0].rca).toBe(1);
      const selection = prisma.riskregister.findMany.mock.calls[0][0].select;
      expect(selection.detail).toBeUndefined();
      expect(selection.user_ir).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
