import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { IncidentsService } from '../incidents/incidents.service';
import { RcaService } from '../rca/rca.service';
import { TriggerToolService } from './trigger-tool.service';

describe('TriggerToolService incident linkage', () => {
  let service: TriggerToolService;
  let prisma: any;
  let incidentsService: any;
  let rcaService: any;

  const review = {
    id: 7,
    review_date: new Date('2026-08-30T08:00:00.000Z'),
    reviewer_name: 'ผู้ทบทวน',
    department: 'หอผู้ป่วยใน',
    hn: '12345',
    an: '67890',
    diagnosis: 'Sepsis',
    severity_level: 'E',
    ae_description: 'พบการให้ยาล่าช้า',
    riskregister_id: null,
    standard_rca_id: null,
    nrls_name_snapshot: 'Medication error',
    findings: [{ trigger_id: 1, trigger_name: 'Antidote', detail: 'ได้รับ antidote' }],
  };

  beforeEach(async () => {
    prisma = {
      trigger_tool_master: {},
      trigger_finding: { deleteMany: jest.fn() },
      medical_record_review: {
        create: jest.fn().mockResolvedValue(review),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...review, ...data })),
        delete: jest.fn().mockResolvedValue(review),
        findUnique: jest.fn().mockResolvedValue(review),
      },
      riskregister: { findMany: jest.fn().mockResolvedValue([]) },
      standard_rca_case: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    incidentsService = {
      create: jest.fn().mockResolvedValue({
        id: 101,
        id_risk: 9001,
        riskstore_id: 11,
        nrls_code: 'C101',
        nrls_name_snapshot: 'Medication error',
        status_risk: 'รายงาน',
      }),
    };
    rcaService = { createStandard: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerToolService,
        { provide: PrismaService, useValue: prisma },
        { provide: IncidentsService, useValue: incidentsService },
        { provide: RcaService, useValue: rcaService },
      ],
    }).compile();
    service = module.get(TriggerToolService);
  });

  it('creates exactly one linked incident for one confirmed review', async () => {
    const result = await service.createReview({
      reviewer_name: 'ผู้ทบทวน',
      department: 'หอผู้ป่วยใน',
      department_id: '2',
      hn: '12345',
      an: '67890',
      diagnosis: 'Sepsis',
      has_trigger: true,
      has_adverse_event: true,
      has_error: true,
      severity_level: 'E',
      preventability: 'ป้องกันได้ (Preventable)',
      ae_description: 'พบการให้ยาล่าช้า',
      risk_confirmed: true,
      nrls_code: 'C101',
      riskstore_id: 11,
      findings: review.findings,
    }, { id: 22, role: 'staff', departmentId: 2 });

    expect(incidentsService.create).toHaveBeenCalledTimes(1);
    expect(incidentsService.create.mock.calls[0][0]).toEqual(expect.objectContaining({
      nrls_code: 'C101',
      level_id: 'E',
      department_id: '2',
      user_ir_type: 'Trigger Tool',
    }));
    expect(incidentsService.create.mock.calls[0][2]).toEqual(expect.objectContaining({
      linkKey: 'TRIGGER_REVIEW:7',
    }));
    expect(prisma.medical_record_review.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7 },
      data: expect.objectContaining({ riskregister_id: 101, riskregister_id_risk: 9001 }),
    }));
    expect(result.incident.id).toBe(101);
  });

  it('does not create a review or incident until the reviewer explicitly confirms risk', async () => {
    await expect(service.createReview({
      reviewer_name: 'ผู้ทบทวน', department: 'IPD', hn: '12345',
      has_trigger: true, has_adverse_event: false, has_error: true,
      severity_level: 'C', ae_description: 'พบความคลาดเคลื่อน',
      risk_confirmed: false, nrls_code: 'C101', findings: review.findings,
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.medical_record_review.create).not.toHaveBeenCalled();
    expect(incidentsService.create).not.toHaveBeenCalled();
  });

  it('requires an NRLS risk topic for a confirmed review', async () => {
    await expect(service.createReview({
      reviewer_name: 'ผู้ทบทวน', department: 'IPD', hn: '12345',
      has_trigger: true, has_adverse_event: false, has_error: true,
      severity_level: 'C', ae_description: 'พบความคลาดเคลื่อน',
      risk_confirmed: true, findings: review.findings,
    })).rejects.toThrow('กรุณาเลือกหัวข้อความเสี่ยงตามมาตรฐาน NRLS');
  });

  it('can confirm an existing historical review and create its missing incident', async () => {
    const result = await service.confirmReviewRisk(7, {
      risk_confirmed: true,
      nrls_code: 'C101',
      riskstore_id: 11,
      severity_level: 'E',
      ae_description: 'ยืนยันพบการให้ยาล่าช้า',
      department_id: '2',
    }, { id: 22, role: 'staff', departmentId: 2 });

    expect(incidentsService.create).toHaveBeenCalledTimes(1);
    expect(prisma.medical_record_review.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        risk_confirmation_status: 'CONFIRMED',
        riskregister_id: 101,
        riskregister_id_risk: 9001,
      }),
    }));
    expect(result.incident.id_risk).toBe(9001);
  });

  it('forwards RCA through the linked incident so RM, NRLS and facts remain connected', async () => {
    const incident = {
      id: 101, id_risk: 9001, level_id: 'E', nrls_code: 'C101',
      nrls_name_snapshot: 'Medication error', link_key: 'TRIGGER_REVIEW:7',
    };
    prisma.riskregister.findMany.mockResolvedValue([incident]);
    rcaService.createStandard.mockResolvedValue({ id: 'RCA-FULL-1' });

    const result = await service.forwardToRca(7, { id: 22, departmentId: 2 });

    expect(rcaService.createStandard).toHaveBeenCalledWith(expect.objectContaining({
      incident_id: 101,
      incident_id_risk: 9001,
      source_trigger_review_id: 7,
    }), expect.anything());
    expect(result.rca_id).toBe('RCA-FULL-1');
  });
});
