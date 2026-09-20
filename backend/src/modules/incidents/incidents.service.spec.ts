import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { IncidentsService } from './incidents.service';
import { IncidentRcaPolicyService } from '../rca/incident-rca-policy.service';

describe('IncidentsService incident permissions', () => {
  let service: IncidentsService;
  let prisma: any;

  const pendingIncident = {
    id: 10,
    id_risk: 100,
    status_risk: 'รายงาน',
    department_id: '1',
    sendto_department_id: null,
    sendto_team_id: null,
    created_by: 20,
    user_ir: 20,
  };

  beforeEach(async () => {
    prisma = {
      department: { findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]), findUnique: jest.fn() },
      nRLS_riskstore: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      riskstore: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      risk: { create: jest.fn() },
      riskregister: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      riskreview: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      rca_case: { findFirst: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      standard_rca_case: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      capa_action: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      incident_review_entry: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      sla_policy: { findUnique: jest.fn().mockResolvedValue({ id: 1, duration_hours: 336 }) },
      sla_instance: {
        upsert: jest.fn().mockResolvedValue({ id: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      workflow_audit: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      incident_classification_audit: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      team: { findUnique: jest.fn().mockResolvedValue({ id: 7, team_name: 'ทีมคุณภาพ' }) },
      program: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: IncidentRcaPolicyService, useValue: { evaluateAndPersist: jest.fn().mockResolvedValue({ rca_required: false }) } },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  it.each([
    ['clinical_ef', ['E', 'F']],
    ['clinical_ghi', ['G', 'H', 'I']],
    ['general_45', ['4', '5']],
  ])('filters the dashboard severity shortcut %s to its exact levels', async (levelId, expectedLevels) => {
    prisma.riskregister.findMany.mockResolvedValue([]);

    await service.findAll(
      { page: 1, limit: 15, level_id: levelId },
      { id: 1, role: 'admin', departmentId: 1 },
    );

    expect(prisma.riskregister.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({
      level_id: { in: expectedLevels },
    }));
  });

  it.each([
    ['CLINICAL', 'C'],
    ['GENERAL', 'G'],
  ])('filters %s incidents from the NRLS code prefix', async (nrlsType, prefix) => {
    prisma.riskregister.findMany.mockResolvedValue([]);

    await service.findAll(
      { page: 1, limit: 15, nrls_type: nrlsType as 'CLINICAL' | 'GENERAL' },
      { id: 1, role: 'admin', departmentId: 1 },
    );

    expect(prisma.riskregister.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({
      nrls_code: { startsWith: prefix },
    }));
  });

  it('allows a reporter to view and edit their pending report, but not confirm it', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 20, role: 'staff', departmentId: 1 },
      pendingIncident,
    );

    expect(permissions).toMatchObject({
      canView: true,
      canEdit: true,
      canConfirm: false,
      canReview: false,
      canClose: false,
    });
  });

  it('does not expose another staff member pending report in the same department', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 99, role: 'staff', departmentId: 1 },
      pendingIncident,
    );

    expect(permissions.canView).toBe(false);
    expect(permissions.canConfirm).toBe(false);
  });

  it('lets department staff view a confirmed incident without recording the management review', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 99, role: 'staff', departmentId: 1 },
      { ...pendingIncident, status_risk: 'ตรวจสอบ' },
    );

    expect(permissions.canView).toBe(true);
    expect(permissions.canReview).toBe(false);
    expect(permissions.canClose).toBe(false);
  });

  it('lets a team recipient view a department-reviewed incident without exposing the individual review workstation', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 55, role: 'staff', departmentId: 9, teamId: 7 },
      { ...pendingIncident, status_risk: 'ทบทวน', sendto_team_id: 7 },
    );

    expect(permissions.canView).toBe(true);
    expect(permissions.canReview).toBe(false);
    expect(permissions.canTeamReview).toBe(true);
  });

  it('records an implicit review by the responsible head as the Owner review', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      sendto_team_id: 7,
    });

    await service.addReview(
      pendingIncident.id,
      { findings: 'หัวหน้าหน่วยงานทบทวนและกำหนดมาตรการเรียบร้อยแล้ว' },
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1, teamId: 7 },
    );

    expect(prisma.incident_review_entry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ review_role: 'OWNER', reviewer_user_id: 30 }),
    }));
    expect(prisma.sla_instance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workflow_stage: 'REVIEW_OWNER' }),
    }));
  });

  it('queues a pending Standard RCA when the review learning action sends the case to RCA', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      nrls_code: 'CPS101',
      nrls_name_snapshot: 'ความเสี่ยงด้านการดูแลผู้ป่วย',
      level_id: 'D',
      date_report: new Date('2026-08-20'),
      detail: 'รายละเอียดเหตุการณ์สำหรับส่งทำ RCA',
      problem_basic: 'เกิดผลกระทบต่อกระบวนการดูแล',
      program_id: 1,
    });
    prisma.standard_rca_case.findFirst.mockResolvedValue(null);

    const result = await service.addReview(
      pendingIncident.id,
      {
        findings: 'ทบทวนเบื้องต้นแล้ว เห็นควรส่งเรื่องวิเคราะห์สาเหตุเชิงระบบ',
        learning_action: 'SEND_RCA',
        contributing_factors: [{ code: 'F0001', detail: 'บุคลากรมีความเหนื่อยล้า' }],
      },
      { id: 30, name: 'หัวหน้าหน่วยงาน', role: 'head', departmentId: 1, departmentGroup: 1 },
    );

    expect(prisma.standard_rca_case.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        incident_id: pendingIncident.id,
        status: 'PENDING',
        contributing_factors: expect.stringContaining('F0001'),
      }),
    }));
    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ rca_required: true, rca_status: 'REQUIRED', recommended_rca_type: 'FULL' }),
    }));
    expect(result).toMatchObject({ learning_action: 'SEND_RCA' });
  });

  it('routes a reviewed incident to another department in the same review transaction', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({ ...pendingIncident, status_risk: 'ทบทวน' });
    prisma.department.findUnique.mockResolvedValue({ id: 2 });

    await service.addReview(
      pendingIncident.id,
      {
        findings: 'ทบทวนเบื้องต้นแล้ว ขอให้หน่วยงานปลายทางทบทวนร่วมเพิ่มเติม',
        learning_action: 'REQUEST_CO_REVIEW',
        co_review_department_id: '2',
        contributing_factors: [{ code: 'F0001' }],
      },
      { id: 30, name: 'หัวหน้าหน่วยงาน', role: 'head', departmentId: 1, departmentGroup: 1 },
    );

    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status_risk: 'ทบทวน',
        sendto_department_id: '2',
        refer_type: '1',
      }),
    }));
  });

  it('accepts a written other cause without a coded contributing factor', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({ ...pendingIncident, status_risk: 'ตรวจสอบ', level_id: 'C' });
    await service.addReview(10, {
      findings: 'ทบทวนและปรับปรุงขั้นตอนการทำงานเรียบร้อยแล้ว',
      learning_action: 'NO_NEW_MEASURE', contributing_factors: [],
      cause_problem: '  ขั้นตอนประสานงานไม่ชัดเจน  ',
    }, { id: 30, role: 'head', departmentId: 1 });
    expect(prisma.riskreview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cause_problem: 'ขั้นตอนประสานงานไม่ชัดเจน', contributing_factors: null }),
    }));
  });

  it.each(['', '   '])('rejects an empty other cause when no factors are selected', async (cause) => {
    prisma.riskregister.findFirst.mockResolvedValue({ ...pendingIncident, status_risk: 'ตรวจสอบ' });
    await expect(service.addReview(10, {
      findings: 'ทบทวนและปรับปรุงขั้นตอนการทำงานเรียบร้อยแล้ว',
      learning_action: 'NO_NEW_MEASURE', contributing_factors: [], cause_problem: cause,
    }, { id: 30, role: 'head', departmentId: 1 })).rejects.toThrow('หรือพิมพ์สาเหตุอื่น');
    expect(prisma.riskreview.create).not.toHaveBeenCalled();
  });

  it('keeps a resolved low-severity incident open until the review summary confirms discharge', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      level_id: 'B',
    });

    const result = await service.addReview(
      pendingIncident.id,
      {
        findings: 'หน่วยงานแก้ไขสาเหตุและควบคุมปัญหาได้เรียบร้อยแล้ว',
        department_outcome: 'RESOLVED',
        forwarding_purpose: 'NONE',
      },
      { id: 30, name: 'หัวหน้าหน่วยงาน', role: 'head', departmentId: 1, departmentGroup: 1 },
    );

    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status_risk: 'ทบทวน',
        department_review_outcome: 'RESOLVED',
        review_forwarding_purpose: 'NONE',
      }),
    }));
    expect(prisma.riskregister.updateMany.mock.calls[0][0].data).not.toHaveProperty('operational_closed_at');
    expect(result.incident_status).toBe('ทบทวน');
  });

  it('queues the latest reviewed incident from the review summary', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      nrls_code: 'CPS101',
      nrls_name_snapshot: 'ความเสี่ยงด้านการดูแลผู้ป่วย',
      level_id: 'D',
      detail: 'รายละเอียดเหตุการณ์สำหรับส่งทำ RCA',
    });
    prisma.riskreview.findFirst.mockResolvedValue({ id: 9, contributing_factors: '[{"code":"F0001"}]' });
    prisma.standard_rca_case.findFirst.mockResolvedValue(null);

    const result = await service.sendReviewToRca(
      pendingIncident.id,
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
    );

    expect(prisma.standard_rca_case.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ incident_id: pendingIncident.id, status: 'PENDING' }),
    }));
    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ rca_required: true, rca_status: 'REQUIRED' }),
    }));
    expect(result).toMatchObject({ rca_status: 'REQUIRED', already_existed: false });
  });

  it('keeps a high-severity resolved incident open for RM closure', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      level_id: 'C',
    });

    const result = await service.addReview(
      pendingIncident.id,
      {
        findings: 'หน่วยงานดำเนินการแก้ไขปัญหาเสร็จและส่งให้ RM พิจารณาปิดเคส',
        department_outcome: 'RESOLVED',
        forwarding_purpose: 'NONE',
      },
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
    );

    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status_risk: 'ทบทวน', department_review_outcome: 'RESOLVED' }),
    }));
    expect(result.incident_status).toBe('ทบทวน');
  });

  it('keeps a resolved low-severity incident open when another department must take action', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      level_id: '1',
    });
    prisma.department.findUnique.mockResolvedValue({ id: 2 });

    const result = await service.addReview(
      pendingIncident.id,
      {
        findings: 'หน่วยงานแก้ไขส่วนของตนแล้วและขอให้หน่วยงานปลายทางดำเนินการเพิ่มเติม',
        department_outcome: 'RESOLVED',
        forwarding_purpose: 'ADDITIONAL_ACTION',
        forwarded_department_id: '2',
      },
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
    );

    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status_risk: 'ทบทวน',
        sendto_department_id: '2',
        review_forwarding_purpose: 'ADDITIONAL_ACTION',
      }),
    }));
    expect(result.incident_status).toBe('ทบทวน');
  });

  it('rejects the unresolved outcome for severity A-B or 1', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      level_id: 'A',
    });

    await expect(service.addReview(
      pendingIncident.id,
      {
        findings: 'หน่วยงานทบทวนแล้วแต่ยังไม่สามารถยุติปัญหาได้ในขณะนี้',
        department_outcome: 'UNRESOLVED',
      },
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
    )).rejects.toThrow('ไม่มีตัวเลือก “ไม่สามารถยุติปัญหาได้”');
  });

  it('allows an authorized reviewer to mark a reviewing incident as not risk', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
      { ...pendingIncident, status_risk: 'ทบทวน' },
    );

    expect(permissions.canReject).toBe(true);
  });

  it('transitions a reviewed incident to not risk with an auditable reason', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({ ...pendingIncident, status_risk: 'ทบทวน' });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: pendingIncident.id, status_risk: 'ไม่ใช่ความเสี่ยง' } as any);

    await service.updateStatus(
      pendingIncident.id,
      'ไม่ใช่ความเสี่ยง',
      { id: 30, name: 'หัวหน้าหน่วยงาน', role: 'head', departmentId: 1, departmentGroup: 1 },
      'ตรวจสอบแล้วเป็นเหตุการณ์ที่ไม่เข้าข่ายความเสี่ยงของระบบ',
    );

    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status_risk: 'ไม่ใช่ความเสี่ยง', improvement_status: 'NOT_REQUIRED' }),
    }));
  });

  it('rejects a client attempt to self-assign a different review role', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      sendto_team_id: 7,
    });

    await expect(service.addReview(
      pendingIncident.id,
      { review_role: 'RM', findings: 'พยายามระบุบทบาทที่ต่างจากสิทธิ์ของบัญชี' },
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1, teamId: 7 },
    )).rejects.toThrow('ระบบกำหนดบทบาทจากสิทธิ์เป็น OWNER');

    expect(prisma.incident_review_entry.create).not.toHaveBeenCalled();
  });

  it('records an implicit review by a team-only participant as Co-review', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      sendto_team_id: 7,
    });

    await service.addReview(
      pendingIncident.id,
      { findings: 'ทีมนำร่วมทบทวนและให้ข้อเสนอแนะเพิ่มเติมแล้ว' },
      { id: 55, role: 'staff', departmentId: 9, teamId: 7 },
    );

    expect(prisma.incident_review_entry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ review_role: 'CO_REVIEW', reviewer_user_id: 55 }),
    }));
  });

  it('does not expose an incident to the team before the department review stage', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 55, role: 'staff', departmentId: 9, teamId: 7 },
      { ...pendingIncident, status_risk: 'ตรวจสอบ', sendto_team_id: 7 },
    );

    expect(permissions.canView).toBe(false);
    expect(permissions.canTeamReview).toBe(false);
  });

  it('allows the responsible head to confirm a pending incident', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
      pendingIncident,
    );

    expect(permissions.canView).toBe(true);
    expect(permissions.canConfirm).toBe(true);
    expect(permissions.canAssignDepartment).toBe(true);
  });

  it('lets an admin confirm incidents in their own department without granting case closure', async () => {
    const permissions = await (service as any).getIncidentPermissions(
      { id: 1, role: 'admin', departmentId: 1 },
      pendingIncident,
    );

    expect(permissions).toMatchObject({
      canView: true,
      canEdit: true,
      canConfirm: true,
      canReview: false,
      canAssignDepartment: true,
      canClose: false,
      canReject: false,
      canDelete: true,
    });
  });

  it('lets an admin review only incidents belonging to their own department', async () => {
    const admin = { id: 1, role: 'admin', departmentId: 1 };
    const ownPermissions = await (service as any).getIncidentPermissions(
      admin,
      { ...pendingIncident, status_risk: 'ตรวจสอบ' },
    );
    const outsidePermissions = await (service as any).getIncidentPermissions(
      admin,
      { ...pendingIncident, status_risk: 'ตรวจสอบ', department_id: '2' },
    );

    expect(ownPermissions.canReview).toBe(true);
    expect(outsidePermissions.canReview).toBe(false);
    expect(outsidePermissions.canConfirm).toBe(false);
  });

  it('prevents an admin from assigning another department while confirming an own-department incident', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      date_report: new Date('2026-08-20'),
      classification_status: 'CONFIRMED',
    });

    await expect(service.updateStatus(
      pendingIncident.id,
      'ตรวจสอบ',
      { id: 1, role: 'admin', departmentId: 1 },
      'ตรวจสอบข้อมูลและยืนยันความเสี่ยงแล้ว',
      undefined,
      '2',
    )).rejects.toThrow('หน่วยงานต้นทางต้องทบทวนเบื้องต้นก่อน');

    expect(prisma.riskregister.updateMany).not.toHaveBeenCalled();
  });

  it('keeps a department head inside their own department after confirmation', async () => {
    const user = { id: 30, role: 'head', rmScope: 'department', departmentId: 1, departmentGroup: 1 };
    const outsideIncident = { ...pendingIncident, status_risk: 'ตรวจสอบ', department_id: '2' };

    const permissions = await (service as any).getIncidentPermissions(user, outsideIncident);

    expect(permissions.canView).toBe(false);
    expect(permissions.canReview).toBe(false);
  });

  it('allows an explicitly assigned group head to manage departments in the group', async () => {
    const user = { id: 31, role: 'head', rmScope: 'group', departmentId: 1, departmentGroup: 1 };
    const groupIncident = { ...pendingIncident, status_risk: 'ตรวจสอบ', department_id: '2' };

    const permissions = await (service as any).getIncidentPermissions(user, groupIncident);

    expect(permissions.canView).toBe(true);
    expect(permissions.canReview).toBe(true);
  });

  it('requires a meaningful reason before marking an incident as not risk', async () => {
    prisma.riskregister.findFirst.mockResolvedValue(pendingIncident);

    await expect(service.updateStatus(
      pendingIncident.id,
      'ไม่ใช่ความเสี่ยง',
      { id: 40, role: 'rm_committee', rmScope: 'hospital', departmentId: 1 },
      'สั้น',
    )).rejects.toThrow('อย่างน้อย 10 ตัวอักษร');

    expect(prisma.riskregister.updateMany).not.toHaveBeenCalled();
  });

  it('returns an empty team scope for a non-admin user without a team', async () => {
    const scope = await (service as any).buildScopingFilter(
      { id: 99, role: 'staff', departmentId: 1 },
      undefined,
      'team',
    );

    expect(scope).toEqual({ id: -1 });
  });

  it('gives central RM hospital-wide scope', async () => {
    const scope = await (service as any).buildScopingFilter(
      { id: 40, role: 'rm_committee', rmScope: 'hospital', departmentId: 1 },
    );

    expect(scope).toEqual({});
    const permissions = await (service as any).getIncidentPermissions(
      { id: 40, role: 'rm_committee', rmScope: 'hospital', departmentId: 1 },
      { ...pendingIncident, department_id: '99' },
    );
    expect(permissions.canView).toBe(true);
    expect(permissions.canConfirm).toBe(true);
  });

  it('limits group RM to departments in the same group', async () => {
    const scope = await (service as any).buildScopingFilter(
      { id: 41, role: 'rm_committee', rmScope: 'group', departmentId: 1, departmentGroup: 1 },
    );

    expect(scope).toEqual({
      OR: [
        { department_id: { in: ['1', '2'] } },
        { sendto_department_id: { in: ['1', '2'] } },
      ],
    });
  });

  it('applies record-level scope to analytics aggregates', async () => {
    prisma.riskregister.groupBy.mockResolvedValue([]);
    prisma.riskregister.findMany.mockResolvedValue([]);
    prisma.department.findMany.mockResolvedValue([]);
    prisma.program.findMany.mockResolvedValue([]);

    await service.getReportAnalytics({}, { id: 99, role: 'staff', departmentId: 1 });

    expect(prisma.riskregister.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: expect.any(Array) }),
    }));
    expect(prisma.riskregister.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: expect.any(Array) }),
    }));
  });

  it('denies attachment access when the incident is outside the user scope', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      created_by: 20,
      image: 'evidence.jpg',
    });

    await expect(service.getAttachmentPath(
      pendingIncident.id,
      'evidence.jpg',
      { id: 99, role: 'staff', departmentId: 1 },
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a staff attempt to confirm through the status API', async () => {
    prisma.riskregister.findFirst.mockResolvedValue(pendingIncident);

    await expect(service.updateStatus(
      pendingIncident.id,
      'ตรวจสอบ',
      { id: 99, role: 'staff', departmentId: 1 },
      'พยายามยืนยัน',
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.riskregister.updateMany).not.toHaveBeenCalled();
  });

  it('allows a responsible head to confirm through the status API', async () => {
    prisma.riskregister.findFirst.mockResolvedValue(pendingIncident);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: pendingIncident.id } as any);

    await service.updateStatus(
      pendingIncident.id,
      'ตรวจสอบ',
      { id: 30, name: 'หัวหน้าหน่วยงาน', role: 'head', departmentId: 1, departmentGroup: 1 },
      'ยืนยันแล้ว',
    );

    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: pendingIncident.id, id_risk: pendingIncident.id_risk },
      data: expect.objectContaining({ status_risk: 'ตรวจสอบ', updated_by: 30 }),
    }));
    expect(prisma.riskreview.create).toHaveBeenCalled();
    expect(prisma.workflow_audit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'STATUS_TRANSITION', changed_by: 30 }),
    }));
  });

  it('does not allow closing directly from the confirmed stage', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ตรวจสอบ',
      level_id: 'A',
    });

    await expect(service.updateStatus(
      pendingIncident.id,
      'จำหน่าย',
      { id: 30, role: 'head', departmentId: 1 },
      'ทบทวนและกำหนดมาตรการครบถ้วนแล้ว',
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires central RM to close severity C-I or 2-5 incidents', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      level_id: 'C',
      rca_required: false,
    });

    await expect(service.updateStatus(
      pendingIncident.id,
      'จำหน่าย',
      { id: 30, role: 'head', departmentId: 1 },
      'ทบทวนและกำหนดมาตรการครบถ้วนแล้ว',
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow discharge while a required RCA is unfinished', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      level_id: 'B',
      rca_required: true,
      rca_status: 'REQUIRED',
      rca_case_id: 'RCA-FULL-20260920-10',
    });
    prisma.riskreview.count.mockResolvedValue(1);
    prisma.standard_rca_case.findFirst.mockResolvedValue(null);

    await expect(service.updateStatus(
      pendingIncident.id,
      'จำหน่าย',
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
      'หน่วยงานทบทวนและกำหนดมาตรการครบถ้วนแล้ว',
    )).rejects.toThrow('ต้องทำ RCA ให้เสร็จ');
  });

  it('requires at least one recorded review before RM closes a high-severity incident', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      status_risk: 'ทบทวน',
      level_id: 'C',
      rca_required: false,
    });
    prisma.riskreview.count.mockResolvedValue(0);

    await expect(service.updateStatus(
      pendingIncident.id,
      'จำหน่าย',
      { id: 40, role: 'rm_committee', rmScope: 'hospital', departmentId: 1 },
      'คณะกรรมการตรวจผลทบทวนแล้วและเห็นชอบให้ปิดเคส',
    )).rejects.toThrow('ต้องบันทึกผลการทบทวนอย่างน้อย 1 ครั้ง');
  });

  it('prevents changing the immutable reporting department during workflow transition', async () => {
    prisma.riskregister.findFirst.mockResolvedValue(pendingIncident);

    await expect(service.updateStatus(
      pendingIncident.id,
      'ตรวจสอบ',
      { id: 30, role: 'head', departmentId: 1 },
      'ยืนยันข้อมูลเรียบร้อยแล้ว',
      '2',
    )).rejects.toThrow('หน่วยงานต้นทางของรายงานเปลี่ยนไม่ได้');
  });

  it('safe-deletes only a verified duplicate and retains an audit snapshot', async () => {
    const now = new Date();
    const duplicate = {
      ...pendingIncident,
      id: 11,
      id_risk: 101,
      status_risk: 'ตรวจสอบ',
      date_report: new Date('2026-08-20'),
      classified_at: now,
      send_date: now,
      nrls_code: 'NRLS-01',
      riskstore_id: 5,
      level_id: 'A',
    };
    const original = { ...duplicate, id: 10, id_risk: 100 };
    prisma.riskregister.findFirst
      .mockResolvedValueOnce(duplicate)
      .mockResolvedValueOnce(original);

    await service.remove(
      duplicate.id,
      { duplicate_of_incident_id: original.id, reason: 'ผู้รายงานส่งเหตุการณ์เดียวกันซ้ำสองครั้ง' },
      { id: 1, role: 'admin' },
    );

    expect(prisma.workflow_audit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'SAFE_DELETE_DUPLICATE',
        entity_id: String(duplicate.id),
        changed_by: 1,
      }),
    }));
    expect(prisma.riskregister.deleteMany).toHaveBeenCalledWith({ where: { id: duplicate.id } });
  });

  it('requires the department review stage before forwarding an incident to a team', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({ ...pendingIncident, status_risk: 'ตรวจสอบ' });

    await expect(service.forwardIncident(
      pendingIncident.id,
      { sendto_team_id: 7, note: 'ขอให้ทีมช่วยดูภาพรวม' },
      { id: 30, name: 'หัวหน้าหน่วยงาน', role: 'head', departmentId: 1, departmentGroup: 1 },
    )).rejects.toThrow('ต้องบันทึกผลการทบทวนของหน่วยงาน');
  });

  it.each(['รายงาน', 'แก้ไข', 'ตรวจสอบ'])('blocks department forwarding before review from %s', async (status) => {
    prisma.riskregister.findFirst.mockResolvedValue({ ...pendingIncident, status_risk: status });
    await expect(service.forwardIncident(10, { sendto_department_id: '2' },
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
    )).rejects.toThrow('ต้องบันทึกผลการทบทวนของหน่วยงานก่อนส่งต่อ');
    expect(prisma.riskregister.updateMany).not.toHaveBeenCalled();
  });

  it('rejects assigning another department during confirmation', async () => {
    prisma.riskregister.findFirst.mockResolvedValue(pendingIncident);
    await expect(service.updateStatus(10, 'ตรวจสอบ',
      { id: 30, role: 'head', departmentId: 1, departmentGroup: 1 },
      'ตรวจสอบข้อมูลก่อนยืนยันแล้ว', undefined, '2',
    )).rejects.toThrow('หน่วยงานต้นทางต้องทบทวนเบื้องต้นก่อน');
    expect(prisma.riskregister.updateMany).not.toHaveBeenCalled();
  });

  it('queues a reviewed incident in the team workspace when forwarded', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({ ...pendingIncident, status_risk: 'ทบทวน' });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: pendingIncident.id } as any);

    await service.forwardIncident(
      pendingIncident.id,
      { sendto_team_id: 7, note: 'ติดตามปัญหาเชิงระบบ' },
      { id: 30, name: 'หัวหน้าหน่วยงาน', role: 'head', departmentId: 1, departmentGroup: 1 },
    );

    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sendto_team_id: 7, team_review_status: 'PENDING' }),
    }));
  });

  it('places one NRLS risk in the annual matrix while keeping all incidents in its frequency count', async () => {
    const annualRows = [
      { ...pendingIncident, id: 10, status_risk: 'ทบทวน', sendto_team_id: 7, date_report: new Date('2026-01-10'), nrls_code: 'NRLS-01', nrls_name_snapshot: 'ความเสี่ยงทดสอบ', level_id: 'D', team_review_status: 'PENDING', program_id: null },
      { ...pendingIncident, id: 11, status_risk: 'ทบทวน', sendto_team_id: 7, date_report: new Date('2026-02-10'), nrls_code: 'NRLS-01', nrls_name_snapshot: 'ความเสี่ยงทดสอบ', level_id: 'I', team_review_status: 'PENDING', program_id: null },
      { ...pendingIncident, id: 12, status_risk: 'ทบทวน', sendto_team_id: 7, date_report: new Date('2026-03-10'), nrls_code: null, nrls_name_snapshot: null, level_id: 'A', team_review_status: 'PENDING', program_id: null },
    ];
    prisma.riskregister.findMany.mockResolvedValue(annualRows);

    const result = await service.getTeamWorkspace(
      { id: 55, role: 'staff', departmentId: 9, teamId: 7 },
      { fiscal_year: 2026 },
    );

    expect(result.summary.mapped_risks).toBe(1);
    expect(result.summary.unmapped_incidents).toBe(1);
    expect(result.top_risks[0]).toMatchObject({ nrls_code: 'NRLS-01', count: 2, consequence: 5, risk_level: 'red' });
    expect(result.matrix[4][0].count).toBe(1);
  });

  it('builds a sub-risk matrix from local topics and keeps NRLS-only incidents in an explicit bucket', async () => {
    const annualRows = [
      { ...pendingIncident, id: 20, status_risk: 'ทบทวน', sendto_team_id: 7, date_report: new Date('2025-01-10'), nrls_code: 'NRLS-01', nrls_name_snapshot: 'การพลัดตกหกล้ม', riskstore_id: 5, level_id: 'D', team_review_status: 'PENDING', program_id: null },
      { ...pendingIncident, id: 21, status_risk: 'ทบทวน', sendto_team_id: 7, date_report: new Date('2025-02-10'), nrls_code: null, nrls_name_snapshot: null, riskstore_id: 5, level_id: 'I', team_review_status: 'PENDING', program_id: null },
      { ...pendingIncident, id: 22, status_risk: 'ทบทวน', sendto_team_id: 7, date_report: new Date('2025-03-10'), nrls_code: 'NRLS-01', nrls_name_snapshot: 'การพลัดตกหกล้ม', riskstore_id: null, level_id: 'A', team_review_status: 'PENDING', program_id: null },
      { ...pendingIncident, id: 23, status_risk: 'ทบทวน', sendto_team_id: 7, date_report: new Date('2025-04-10'), nrls_code: null, nrls_name_snapshot: null, riskstore_id: 6, level_id: 'E', team_review_status: 'PENDING', program_id: null },
    ];
    prisma.riskregister.findMany.mockResolvedValue(annualRows);
    prisma.riskstore.findMany.mockResolvedValue([
      { riskstore_id: 5, riskstore_name: 'ลื่นล้มในห้องน้ำ', nrls_code: 'NRLS-01' },
      { riskstore_id: 6, riskstore_name: 'หัวข้อความเสี่ยงเฉพาะโรงพยาบาล', nrls_code: null },
    ]);
    prisma.nRLS_riskstore.findMany.mockResolvedValue([{ nrls_code: 'NRLS-01', name: 'การพลัดตกหกล้ม' }]);

    const result = await service.getTeamWorkspace(
      { id: 55, role: 'staff', departmentId: 9, teamId: 7 },
      { fiscal_year: 2025 },
    );

    expect(result.summary).toMatchObject({
      mapped_risks: 1,
      sub_risks: 3,
      mapped_sub_risks: 2,
      legacy_mapped_incidents: 1,
      nrls_without_subrisk_incidents: 1,
      local_unmapped_incidents: 1,
      unmapped_incidents: 1,
    });
    expect(result.top_risks[0]).toMatchObject({ nrls_code: 'NRLS-01', count: 3, consequence: 5 });
    expect(result.top_sub_risks).toEqual(expect.arrayContaining([
      expect.objectContaining({ riskstore_id: 5, name: 'ลื่นล้มในห้องน้ำ', count: 2, mapping_status: 'NRLS_WITH_LOCAL' }),
      expect.objectContaining({ riskstore_id: null, name: 'ยังไม่ระบุชื่อความเสี่ยงย่อย', count: 1, mapping_status: 'NRLS_NO_SUBRISK' }),
      expect.objectContaining({ riskstore_id: 6, mapping_status: 'LOCAL_UNMAPPED' }),
    ]));
    expect(result.matrices.sub_risk[4][0].count).toBe(1);
    expect(result.matrices.sub_risk_mapped[2][0].count).toBe(0);
  });

  it('uses the local risk owner as the team matrix fallback while keeping the forwarded queue separate', async () => {
    const legacyOwnedRow = {
      ...pendingIncident,
      id: 30,
      status_risk: 'ตรวจสอบ',
      sendto_team_id: null,
      date_report: new Date('2025-05-10'),
      nrls_code: null,
      nrls_name_snapshot: null,
      riskstore_id: 8,
      level_id: 'E',
      team_review_status: null,
      program_id: null,
    };
    prisma.riskregister.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([legacyOwnedRow]);
    prisma.riskstore.findMany.mockResolvedValue([
      { riskstore_id: 8, riskstore_name: 'ความเสี่ยงเดิมของ PCT', nrls_code: null, team_id: 7 },
    ]);

    const result = await service.getTeamWorkspace(
      { id: 55, role: 'staff', departmentId: 9, teamId: 7 },
      { fiscal_year: 2025 },
    );

    expect(prisma.riskregister.findMany.mock.calls[0][0].where.AND).toEqual(expect.arrayContaining([
      { sendto_team_id: 7 },
      { status_risk: { in: ['ตรวจสอบ', 'ทบทวน', 'จำหน่าย'] } },
    ]));
    expect(prisma.riskregister.findMany.mock.calls[1][0].where.AND[0]).toEqual({
      OR: [
        { sendto_team_id: 7 },
        { sendto_team_id: null, local_risk: { team_id: 7 } },
      ],
    });
    expect(result.summary).toMatchObject({
      total: 0,
      matrix_incidents: 1,
      forwarded_matrix_incidents: 0,
      local_owner_matrix_incidents: 1,
      sub_risks: 1,
      local_unmapped_incidents: 1,
    });
    expect(result.top_sub_risks[0]).toMatchObject({
      name: 'ความเสี่ยงเดิมของ PCT',
      mapping_status: 'LOCAL_UNMAPPED',
    });
    expect(result.matrices.sub_risk[2][0].count).toBe(1);
  });

  it('records one audit review per incident when a team completes a batch', async () => {
    prisma.riskregister.findMany.mockResolvedValue([
      { ...pendingIncident, id: 10, id_risk: 100, status_risk: 'ทบทวน', sendto_team_id: 7, team_review_started_at: null },
      { ...pendingIncident, id: 11, id_risk: 101, status_risk: 'ทบทวน', sendto_team_id: 7, team_review_started_at: null },
    ]);

    const result = await service.batchReviewTeam(
      { incident_ids: [10, 11], action: 'COMPLETE', note: 'กำหนดมาตรการกลางของทีม' },
      { id: 55, name: 'สมาชิกทีม', role: 'staff', departmentId: 9, teamId: 7 },
    );

    expect(result.updated).toBe(2);
    expect(prisma.riskregister.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.riskreview.create).toHaveBeenCalledTimes(2);
    expect(prisma.riskregister.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ team_review_status: 'COMPLETED', team_reviewed_by: 55 }),
    }));
  });

  it('rejects missing and unknown NRLS codes', async () => {
    await expect((service as any).resolveClassification('', null, 'A')).rejects.toBeInstanceOf(BadRequestException);
    prisma.nRLS_riskstore.findUnique.mockResolvedValue(null);
    await expect((service as any).resolveClassification('PT/02', null, 'A')).rejects.toThrow('ไม่พบรหัส PT/02');
  });

  it('derives Clinical and General severity from the C/G code prefix, not metadata', async () => {
    prisma.nRLS_riskstore.findUnique
      .mockResolvedValueOnce({ nrls_code: 'CPP405', name: 'Clinical', group: 'ข้อมูลกลุ่มที่ระบุผิดเป็น General', program_id: 6 })
      .mockResolvedValueOnce({ nrls_code: 'CPP405', name: 'Clinical', group: 'ข้อมูลกลุ่มที่ระบุผิดเป็น General', program_id: 6 })
      .mockResolvedValueOnce({ nrls_code: 'GPI101', name: 'General', group: 'ข้อมูลกลุ่มที่ระบุผิดเป็น Clinical', program_id: 2 });
    await expect((service as any).resolveClassification('CPP405', null, 'D')).resolves.toMatchObject({ level: 'D', localId: null });
    await expect((service as any).resolveClassification('CPP405', null, '3')).rejects.toThrow('Clinical');
    await expect((service as any).resolveClassification('GPI101', null, 'A')).rejects.toThrow('General');
  });

  it('rejects a local risk mapped to a different NRLS code', async () => {
    prisma.nRLS_riskstore.findUnique.mockResolvedValue({ nrls_code: 'CPP405', name: 'Clinical', group: 'คลินิก', program_id: 6 });
    prisma.riskstore.findUnique.mockResolvedValue({ riskstore_id: 1, nrls_code: 'CPI203' });
    await expect((service as any).resolveClassification('CPP405', 1, 'D')).rejects.toThrow('ไม่ตรงกับรหัส NRLS');
  });

  it('creates an incident with nullable local risk and program derived from NRLS', async () => {
    prisma.nRLS_riskstore.findUnique.mockResolvedValue({ nrls_code: 'CPP405', name: 'Patient ID', group: 'คลินิก', program_id: 6 });
    prisma.riskregister.findFirst.mockResolvedValue({ id_risk: 100 });
    prisma.riskregister.create.mockImplementation(({ data }) => Promise.resolve({ id: 11, ...data }));
    jest.spyOn(service as any, 'sendTelegramAlert').mockResolvedValue(undefined);
    const result = await service.create({
      nrls_code: 'CPP405', riskstore_id: null, level_id: 'D', date_report: '2026-08-23',
      time_report: '2026-08-23T10:00:00.000Z', user_ir_type: 'หน่วยงาน', department_id: '1',
    }, { id: 20, role: 'staff', departmentId: 1 });
    expect(result).toMatchObject({ program_id: 6, riskstore_id: null, nrls_name_snapshot: 'Patient ID', classification_status: 'PENDING' });
  });

  it('rejects a staff report that spoofs another reporting department', async () => {
    await expect(service.create({
      nrls_code: 'CPP405', riskstore_id: null, level_id: 'D', date_report: '2026-08-23',
      time_report: '2026-08-23T10:00:00.000Z', user_ir_type: 'หน่วยงาน', department_id: '99',
    }, { id: 20, role: 'staff', departmentId: 1 })).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.riskregister.create).not.toHaveBeenCalled();
  });

  it('creates an admin report when the source is the admin own department', async () => {
    prisma.nRLS_riskstore.findUnique.mockResolvedValue({
      nrls_code: 'CPP405', name: 'Patient ID', group: 'คลินิก', program_id: 6,
    });
    prisma.riskregister.findFirst.mockResolvedValue({ id_risk: 100 });
    prisma.riskregister.create.mockImplementation(({ data }) => Promise.resolve({ id: 11, ...data }));
    jest.spyOn(service as any, 'sendTelegramAlert').mockResolvedValue(undefined);

    const result = await service.create({
      nrls_code: 'CPP405', riskstore_id: null, level_id: 'D', date_report: '2026-08-23',
      time_report: '2026-08-23T10:00:00.000Z', user_ir_type: 'หน่วยงาน', department_id: '1',
    }, { id: 1, role: 'admin', departmentId: 1 });

    expect(result).toMatchObject({ department_id: '1', created_by: 1 });
  });

  it('rejects an admin report that claims another source department', async () => {
    await expect(service.create({
      nrls_code: 'CPP405', riskstore_id: null, level_id: 'D', date_report: '2026-08-23',
      time_report: '2026-08-23T10:00:00.000Z', user_ir_type: 'หน่วยงาน', department_id: '2',
    }, { id: 1, role: 'admin', departmentId: 1 })).rejects.toThrow('นอกขอบเขตของบัญชีนี้');

    expect(prisma.riskregister.create).not.toHaveBeenCalled();
  });

  it('rejects reusing an attachment filename owned by another account', async () => {
    await expect(service.create({
      nrls_code: 'CPP405', riskstore_id: null, level_id: 'D', date_report: '2026-08-23',
      time_report: '2026-08-23T10:00:00.000Z', user_ir_type: 'หน่วยงาน', department_id: '1',
      image: '999-1780000000000-123.jpg',
    }, { id: 20, role: 'staff', departmentId: 1 })).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.riskregister.create).not.toHaveBeenCalled();
  });

  it('requires NRLS for every new report, including an incident date before cutover', async () => {
    await expect(service.create({
      nrls_code: null, riskstore_id: 9, level_id: '3', date_report: '2026-09-30',
      time_report: '2026-09-30T10:00:00.000Z', user_ir_type: 'หน่วยงาน', department_id: '1',
    }, { id: 20, role: 'staff', departmentId: 1 })).rejects.toThrow('รายงานใหม่ทุกวันที่เกิดเหตุ');
    expect(prisma.riskregister.create).not.toHaveBeenCalled();
  });

  it('rejects an incident without NRLS on the cutover date', async () => {
    await expect(service.create({
      nrls_code: null, riskstore_id: null, level_id: '3', date_report: '2026-10-01',
      time_report: '2026-10-01T10:00:00.000Z', user_ir_type: 'หน่วยงาน', department_id: '1',
    }, { id: 20, role: 'staff', departmentId: 1 })).rejects.toThrow('รายงานใหม่ทุกวันที่เกิดเหตุ');
  });

  it('does not allow a pre-cutover new report to be downgraded to LEGACY later', async () => {
    prisma.riskregister.findFirst.mockResolvedValue({
      ...pendingIncident,
      date_report: new Date('2026-09-30'),
      nrls_code: 'CPP405',
      classification_status: 'PENDING',
      level_id: 'D',
      riskstore_id: null,
      image: null,
    });

    await expect(service.update(10, { nrls_code: null }, {
      id: 1,
      role: 'rm_committee',
      rmScope: 'hospital',
      departmentId: 1,
    })).rejects.toThrow('เฉพาะประวัติเดิมสถานะ Legacy');
    expect(prisma.riskregister.updateMany).not.toHaveBeenCalled();
  });

  it('masks common patient identifiers in the Telegram event summary', () => {
    const summary = (service as any).sanitizeTelegramSummary('HN: 123456 CID 1234567890123 นายสมชาย ใจดี โทร 0812345678 ให้ยาผิดขนาด');
    expect(summary).not.toContain('1234567890123');
    expect(summary).not.toContain('0812345678');
    expect(summary).not.toContain('สมชาย');
    expect(summary).toContain('ให้ยาผิดขนาด');
  });
});
