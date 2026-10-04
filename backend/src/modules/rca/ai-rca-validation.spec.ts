import { BadRequestException } from '@nestjs/common';
import { RcaService } from './rca.service';
import { normalizeAiSwissLayer } from './ai-rca-validation';

describe('RCA assistant safeguards', () => {
  const prior = process.env.AI_ASSISTANT_ENABLED;
  beforeEach(() => { process.env.AI_ASSISTANT_ENABLED = 'false'; });
  afterEach(() => { if (prior === undefined) delete process.env.AI_ASSISTANT_ENABLED; else process.env.AI_ASSISTANT_ENABLED = prior; });
  it('does not manufacture a medication timeline or harm when AI is disabled', async () => {
    const service = new RcaService({} as any, {} as any, {} as any);
    await expect(service.generateAiAssistance({ incident_text: 'ยังไม่ได้ให้ยา ไม่พบผลกระทบจริง', severity: 'A' })).rejects.toThrow('ไม่มีการสร้างข้อมูลทดแทน');
  });
  it.each([{ topic: 5 }, { incident_text: 'x'.repeat(4001) }, { actual_impact: {} }])('rejects malformed and oversized input before calling provider', async input => {
    const service = new RcaService({} as any, {} as any, {} as any);
    await expect(service.generateAiAssistance(input as any)).rejects.toThrow(BadRequestException);
  });
  it.each([['การบริหารองค์กร', 'org'], ['การนิเทศงาน', 'supervision'], ['สภาพแวดล้อม', 'precondition'], ['การกระทำที่ไม่ปลอดภัย', 'act'], ['org', 'org'], ['unrecognized', '']])('normalizes layer %s to %s', (input, expected) => {
    expect(normalizeAiSwissLayer(input)).toBe(expected);
  });
});

describe('AI incident access', () => {
  it('rejects staff before loading incident or generating suggestions', async () => {
    const service = new RcaService({} as any, {} as any, {} as any);
    await expect(service.generateAiForIncident({ incident_id: 999 }, { role: 'staff' })).rejects.toThrow('เฉพาะผู้มีสิทธิ์ทบทวน');
  });
  it('rejects an incident outside the reviewing department', async () => {
    const prisma: any = { riskregister: { findFirst: jest.fn().mockResolvedValue({ department_id: '2', status_risk: 'ตรวจสอบ' }) } };
    const service = new RcaService(prisma, {} as any, {} as any);
    const generate = jest.spyOn(service, 'generateAiAssistance');
    await expect(service.generateAiForIncident({ incident_id: 999 }, { role: 'head', departmentId: 1 })).rejects.toThrow('นอกขอบเขต');
    expect(generate).not.toHaveBeenCalled();
  });
  it('passes only operator-provided text to analysis after access checks', async () => {
    const prisma: any = { riskregister: { findFirst: jest.fn().mockResolvedValue({ department_id: '1', status_risk: 'ตรวจสอบ' }) } };
    const service = new RcaService(prisma, {} as any, {} as any);
    const generate = jest.spyOn(service, 'generateAiAssistance').mockResolvedValue({ analysis_notice: 'synthetic' } as any);
    const dto = { incident_id: 999, incident_text: 'ข้อความที่ผู้ใช้แก้แล้ว' };
    await service.generateAiForIncident(dto, { role: 'head', departmentId: 1 });
    expect(generate).toHaveBeenCalledWith(dto);
    expect(prisma.riskregister.findFirst).toHaveBeenCalledWith({ where: { id: 999 }, select: { department_id: true, status_risk: true } });
  });
});
