import { RcaService } from './rca.service';

describe('RcaService incident review queue', () => {
  it('shows a co-review to its destination department and links the real incident id', async () => {
    const incident = {
      id: 13547,
      id_risk: 13573,
      detail: 'เหตุการณ์ทดสอบ',
      level_id: 'G',
      department_id: '9',
      sendto_department_id: '15',
      nrls_code: 'CPP101',
      nrls_name_snapshot: 'เหตุการณ์ความเสี่ยงด้านคลินิก',
    };
    const prisma: any = {
      riskregister: { findMany: jest.fn().mockResolvedValue([incident]) },
      riskreview: {
        findMany: jest.fn().mockResolvedValue([{
          id: 6107,
          riskregister_id: 13547,
          risk_id: 13573,
          review_date: new Date('2026-08-29'),
          cause_problem: null,
          contributing_factors: '[{"code":"P01"}]',
          notereview: 'ขอให้หน่วยงานปลายทางร่วมทบทวน',
        }]),
      },
    };
    const service = new RcaService(prisma, {} as any, {} as any);

    const result = await service.getIncidentReviews({ role: 'staff', departmentId: 15 });

    expect(prisma.riskregister.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { department_id: { in: ['15'] } },
          { sendto_department_id: { in: ['15'] } },
        ],
      },
    }));
    expect(result).toEqual([expect.objectContaining({
      id: 6107,
      riskregister_id: 13547,
      incident_id_risk: 13573,
      department_id: '9',
      sendto_department_id: '15',
      nrls_code: 'CPP101',
    })]);
  });
});

describe('RcaService Standard RCA incident source', () => {
  it('returns legacy incidents as selectable sources with NRLS topic, RM number, and description', async () => {
    const prisma: any = {
      standard_rca_case: { findMany: jest.fn().mockResolvedValue([{ incident_id: 10 }]) },
      riskregister: {
        findMany: jest.fn().mockResolvedValue([{
          id: 13547,
          id_risk: 13573,
          nrls_code: 'CPP101',
          nrls_name_snapshot: 'หัวข้อความเสี่ยงตาม NRLS',
          detail: 'รายละเอียดเหตุการณ์จากรายงานเดิม',
          problem_basic: null,
          level_id: 'G',
          date_report: new Date('2026-08-29'),
          status_risk: 'ทบทวน',
          department_id: '15',
          nrls_standard: { name: 'ชื่อมาตรฐาน' },
          local_risk: null,
        }]),
      },
    };
    const service = new RcaService(prisma, {} as any, {} as any);

    const result = await service.getStandardCandidates('13547', { role: 'staff', departmentId: 15 });

    expect(prisma.riskregister.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: expect.arrayContaining([
        { nrls_code: { not: null } },
        { department_id: { in: ['15'] } },
        { id: { notIn: [10] } },
      ]) },
    }));
    expect(result).toEqual([expect.objectContaining({
      id: 13547,
      rm_no: '13573',
      incident_topic: 'หัวข้อความเสี่ยงตาม NRLS',
      incident_description: 'รายละเอียดเหตุการณ์จากรายงานเดิม',
    })]);
  });

  it('persists quick-review CMP rows when creating Standard RCA', async () => {
    const incident = {
      id: 13547,
      id_risk: 13573,
      nrls_code: 'CPP101',
      nrls_name_snapshot: 'หัวข้อความเสี่ยงตาม NRLS',
      program_id: 2,
      department_id: '15',
      level_id: 'G',
      date_report: new Date('2026-08-29'),
      detail: 'รายละเอียดเหตุการณ์',
      problem_basic: null,
      rca_due_at: null,
    };
    const prisma: any = {
      riskregister: {
        findFirst: jest.fn().mockResolvedValue(incident),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      standard_rca_case: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'RCA-FULL-1', status: 'IN_PROGRESS', completed_at: null, capas: [] }),
      },
    };
    const service = new RcaService(prisma, {} as any, {} as any);

    await service.createStandard({
      incident_id: incident.id,
      topic: 'หัวข้อความเสี่ยงตาม NRLS',
      contributing_factors: [
        { code: 'F0035', process_key: 'วางแผนดูแล (Plan of Care)', tier: 1, detail: 'สาเหตุระดับบุคคล' },
        { code: 'F0035', process_key: 'วางแผนดูแล (Plan of Care)', tier: 3, detail: 'สาเหตุระดับสิ่งแวดล้อม' },
      ],
      cmps: [{
        observation: 'ไม่ทำ double check',
        hypothesis: 'ภาระงานสูง',
        comment: 'จัดทำ checklist ทันที',
      }],
    }, { id: 7, role: 'staff', departmentId: 15 });

    expect(prisma.standard_rca_case.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contributing_factors: JSON.stringify([
          { code: 'F0035', detail: 'สาเหตุระดับบุคคล', process_key: 'วางแผนดูแล (Plan of Care)', tier: 1 },
          { code: 'F0035', detail: 'สาเหตุระดับสิ่งแวดล้อม', process_key: 'วางแผนดูแล (Plan of Care)', tier: 3 },
        ]),
        cmps: {
          create: [{
            observation: 'ไม่ทำ double check',
            hypothesis: 'ภาระงานสูง',
            comment: 'จัดทำ checklist ทันที',
            sort_order: 1,
          }],
        },
      }),
    }));
  });
});
