import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CapaService } from './capa.service';

describe('CapaService closed-loop policy', () => {
  let service: CapaService;
  let prisma: any;
  let capa: any;
  let incident: any;

  beforeEach(() => {
    incident = {
      id: 10,
      id_risk: 100,
      level_id: 'E',
      department_id: '1',
      sendto_department_id: '1',
      sendto_team_id: 7,
      nrls_code: 'C-TEST',
    };
    capa = {
      id: 5,
      incident_id: 10,
      incident_id_risk: 100,
      source_type: 'NON_RCA',
      source_id: 'INC-10',
      status: 'IN_PROGRESS',
      responsible_user_id: 20,
      responsible_member_cid: '1111111111111',
      responsible_department_id: '1',
      responsible_team_id: null,
      due_date: new Date('2026-09-01'),
      evidence: 'หลักฐานการดำเนินมาตรการครบถ้วน',
      effectiveness_criteria: 'อัตราการเกิดเหตุซ้ำลดลง',
      target_value: '0 ครั้ง',
      effectiveness_due_date: new Date('2026-10-01'),
      effectiveness_status: 'NOT_DUE',
      approval_status: 'NOT_READY',
    };
    prisma = {
      department: {
        findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
      },
      riskregister: {
        findFirst: jest.fn().mockResolvedValue(incident),
        findMany: jest.fn().mockResolvedValue([incident]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      capa_action: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(capa)),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...capa, ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      capa_effectiveness_review: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      workflow_audit: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      sla_policy: { findUnique: jest.fn().mockResolvedValue({ id: 1, duration_hours: 168 }) },
      sla_instance: {
        upsert: jest.fn().mockResolvedValue({ id: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      escalation_event: { create: jest.fn() },
      notification_log: { upsert: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };
    service = new CapaService(prisma);
  });

  it('allows team and department users to open their scoped monitoring workspace', async () => {
    const scoped = jest.spyOn(service, 'findAll').mockResolvedValue([]);
    const user = { id: 7, role: 'rm_committee', rmScope: 'department', departmentId: 1, teamId: 7 };
    await service.findMonitoringActions(user, {});
    expect(scoped).toHaveBeenCalledWith(user, {});
  });

  it('keeps system administrators out of clinical CAPA creation', async () => {
    await expect(service.create({ incident_id: 10 } as any, { id: 1, role: 'admin' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('filters unrelated department records from the monitoring endpoint', async () => {
    prisma.capa_action.findMany.mockResolvedValue([capa]);
    const rows = await service.findMonitoringActions({ id: 77, role: 'staff', departmentId: 8 }, {});
    expect(rows).toEqual([]);
  });

  it('allows an independent department head to close effective low-severity work', async () => {
    incident.level_id = 'B';
    capa = { ...capa, status: 'AWAITING_APPROVAL', effectiveness_status: 'EFFECTIVE', approval_status: 'PENDING' };
    const result = await service.decideClosure(5, { decision: 'APPROVE' }, { id: 30, role: 'head', departmentId: 1 });
    expect(result.status).toBe('CLOSED');
  });

  it('denies self approval even for low-severity work', async () => {
    incident.level_id = 'B';
    capa = { ...capa, status: 'AWAITING_APPROVAL', effectiveness_status: 'EFFECTIVE', approval_status: 'PENDING' };
    await expect(service.decideClosure(5, { decision: 'APPROVE' }, { id: 20, role: 'head', departmentId: 1 }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not let the owner declare implementation without structured evidence', async () => {
    capa = { ...capa, evidence: null, effectiveness_criteria: null, target_value: null };
    await expect(service.update(5, { status: 'IMPLEMENTED' }, {
      id: 20, cid: '1111111111111', role: 'staff', departmentId: 1,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves implemented work to an effectiveness gate instead of closing it', async () => {
    const result = await service.update(5, { status: 'IMPLEMENTED' }, {
      id: 20, cid: '1111111111111', role: 'staff', departmentId: 1,
    });

    expect(result.status).toBe('AWAITING_EFFECTIVENESS');
    expect(prisma.sla_instance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workflow_stage: 'CAPA_IMPLEMENTATION' }),
    }));
    expect(prisma.sla_instance.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        entity_type_entity_id_workflow_stage: expect.objectContaining({ workflow_stage: 'CAPA_EFFECTIVENESS' }),
      }),
    }));
  });

  it('prevents the implementer from reviewing their own effectiveness', async () => {
    capa = { ...capa, status: 'AWAITING_EFFECTIVENESS', completed_at: new Date('2026-08-01') };
    await expect(service.recordEffectiveness(5, {
      review_date: '2026-10-01',
      result: 'EFFECTIVE',
      measured_value: '0 ครั้ง',
      observation: 'ไม่พบอุบัติการณ์เกิดซ้ำตลอดช่วงติดตาม',
    }, {
      id: 20, cid: '1111111111111', role: 'head', departmentId: 1,
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reserves final closure approval for RM after an effective review', async () => {
    capa = { ...capa, status: 'AWAITING_APPROVAL', effectiveness_status: 'EFFECTIVE', approval_status: 'PENDING' };
    await expect(service.decideClosure(5, { decision: 'APPROVE' }, {
      id: 30, role: 'head', departmentId: 1,
    })).rejects.toBeInstanceOf(ForbiddenException);

    prisma.capa_action.findMany.mockResolvedValue([{ status: 'CLOSED' }]);
    const result = await service.decideClosure(5, { decision: 'APPROVE' }, {
      id: 40, role: 'rm_committee', rmScope: 'hospital', departmentId: 9,
    });
    expect(result.status).toBe('CLOSED');
    expect(result.approval_status).toBe('APPROVED');
    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ improvement_status: 'CLOSED' }),
    }));
  });
});
