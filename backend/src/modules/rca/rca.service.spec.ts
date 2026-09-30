import { RcaService } from './rca.service';

describe('RcaService incident review queue', () => {
  it('starts the FY2570 queue on 1 October Bangkok time and excludes future reviews', async () => {
    const prisma: any = {
      riskreview: { findMany: jest.fn().mockResolvedValue([]) },
      riskregister: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new RcaService(prisma, {} as any, {} as any);
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-09-30T18:00:00.000Z')); // 1 Oct, 01:00 Bangkok
      await service.getIncidentReviews({ role: 'admin' });
      expect(prisma.riskreview.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { AND: [
          { OR: [{ cause_problem: { not: null } }, { contributing_factors: { not: null } }] },
          { review_date: {
            gte: new Date('2026-10-01T00:00:00.000Z'),
            lt: new Date('2026-10-02T00:00:00.000Z'),
          } },
        ] },
      }));
    } finally {
      jest.useRealTimers();
    }
  });

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

describe('RcaService Standard RCA completion', () => {
  const completeCase = {
    id: 'RCA-FULL-1',
    incident_id: 13547,
    status: 'IN_PROGRESS',
    created_by: 7,
    risk_analysis_id: null,
    is_not_risk: false,
    topic: 'ยาความเสี่ยงสูง',
    rca_team: 'หน่วยงานเจ้าของเรื่อง',
    review_outcome: 'DEPARTMENT_MONITORING',
    what_happened: 'ผู้ป่วยได้รับยาผิดขนาด',
    potential_impact: 'อาจเกิดอันตรายรุนแรง',
    info_interview: true,
    contributing_factors: JSON.stringify([{ code: 'P01', detail: 'ขั้นตอนตรวจสอบไม่ชัดเจน' }]),
    timelines: [{ event_description: 'พบความคลาดเคลื่อนก่อนให้ยา' }],
    cmps: [{ observation: 'ขั้นตอนตรวจสอบยาความเสี่ยงสูงไม่ครบถ้วน', hypothesis: 'ไม่มีจุดหยุดตรวจสอบ' }],
    whys: [],
    process_analyses: [],
    participants: [{
      participant_type: 'DEPARTMENT', display_name: 'หอผู้ป่วย', role: 'OWNER',
      response_status: 'ACCEPTED', is_owner: true,
    }],
    voice_of_staff_entries: [{ key_points: 'ขั้นตอนตรวจสอบทำได้ยากในช่วงภาระงานสูง' }],
    capas: [{
      action: 'จัดทำ independent double check',
      responsible: 'หัวหน้าหอผู้ป่วย',
      due_date: new Date('2026-10-01'),
      effectiveness_criteria: 'อัตราการทำ double check ครบถ้วน',
      baseline_value: '60%',
      target_value: '95%',
      effectiveness_due_date: new Date('2026-11-15'),
    }],
  };

  it('completes RCA, creates a department Risk Register profile, and links CAPA monitoring', async () => {
    const incident = {
      id: 13547,
      id_risk: 13573,
      nrls_code: 'CPP101',
      nrls_name_snapshot: 'ความคลาดเคลื่อนทางยา',
      department_id: '15',
      program_id: 2,
      level_id: 'G',
    };
    const createdProfile = { id: 88, nrls_code: 'CPP101', scope_level: 'department', department_id: '15' };
    const tx: any = {
      riskanalysis: {
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(createdProfile),
      },
      department: { findUnique: jest.fn().mockResolvedValue({ depart_name: 'หอผู้ป่วย' }) },
      standard_rca_case: {
        update: jest.fn().mockResolvedValue({ ...completeCase, status: 'COMPLETED', risk_analysis_id: 88 }),
      },
      riskregister: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      capa_action: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      workflow_audit: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const prisma: any = {
      riskregister: { findFirst: jest.fn().mockResolvedValue(incident) },
      riskanalysis: { findUnique: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new RcaService(prisma, {} as any, {} as any);
    jest.spyOn(service, 'getStandardById').mockResolvedValue(completeCase as any);

    const result = await service.completeStandard('RCA-FULL-1', {
      risk_description: 'ความเสี่ยงจากการให้ยาความเสี่ยงสูงผิดขนาด',
      risk_owner_name: 'หัวหน้าหอผู้ป่วย',
      initial_likelihood: 3,
      review_frequency_months: 3,
    }, { id: 7, role: 'staff', departmentId: 15 });

    expect(tx.riskanalysis.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        nrls_code: 'CPP101',
        scope_level: 'department',
        scope_identifier: '15',
        source: 'RCA',
        risk_owner_name: 'หัวหน้าหอผู้ป่วย',
        initial_likelihood: 3,
      }),
    }));
    expect(tx.standard_rca_case.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMPLETED', risk_analysis_id: 88 }),
    }));
    expect(tx.capa_action.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ risk_analysis_id: 88 }),
    }));
    expect(result.risk_profile_created).toBe(true);
  });

  it('does not complete RCA until every measure has an effectiveness plan', async () => {
    const prisma: any = {};
    const service = new RcaService(prisma, {} as any, {} as any);
    jest.spyOn(service, 'getStandardById').mockResolvedValue({
      ...completeCase,
      capas: [{ ...completeCase.capas[0], effectiveness_criteria: '' }],
    } as any);

    await expect(service.completeStandard('RCA-FULL-1', {}, { id: 7, role: 'staff', departmentId: 15 }))
      .rejects.toThrow('เกณฑ์ประเมินมาตรการที่ 1');
  });

  it('requires the department owner and review route before completion', async () => {
    const service = new RcaService({} as any, {} as any, {} as any);
    jest.spyOn(service, 'getStandardById').mockResolvedValue({
      ...completeCase,
      review_outcome: 'IN_PROGRESS',
      participants: [{ ...completeCase.participants[0], is_owner: false }],
    } as any);

    await expect(service.completeStandard('RCA-FULL-1', {}, { id: 7, role: 'staff', departmentId: 15 }))
      .rejects.toThrow('เจ้าของเรื่องในทีมทบทวน');
    await expect(service.completeStandard('RCA-FULL-1', {}, { id: 7, role: 'staff', departmentId: 15 }))
      .rejects.toThrow('ผลลัพธ์หลังหน่วยงานทบทวน');
  });

  it('returns the existing Risk Register link when completion is retried', async () => {
    const prisma: any = { $transaction: jest.fn() };
    const service = new RcaService(prisma, {} as any, {} as any);
    const completed = { ...completeCase, status: 'COMPLETED', risk_analysis: { id: 88, risk_code: 'CPP101' } };
    jest.spyOn(service, 'getStandardById').mockResolvedValue(completed as any);

    const result = await service.completeStandard('RCA-FULL-1', {}, { id: 7, role: 'staff', departmentId: 15 });

    expect(result).toMatchObject({ already_completed: true, risk_profile_created: false, risk_analysis: { id: 88 } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
