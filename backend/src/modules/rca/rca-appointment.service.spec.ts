import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RcaAppointmentService } from './rca-appointment.service';
import { RcaService } from './rca.service';

describe('RCA center appointments', () => {
  const actor = { id: 7 };
  let prisma: any, rca: any, service: RcaAppointmentService;
  const future = () => new Date(Date.now() + 86400000).toISOString();
  beforeEach(() => {
    prisma = { standard_rca_appointment: { create: jest.fn().mockResolvedValue({ id: 'M1' }), findFirst: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() }, workflow_audit: { create: jest.fn() } };
    prisma.$transaction = (run: any) => run(prisma);
    rca = { getStandardById: jest.fn().mockResolvedValue({ hospital_center: true, can_manage_team: true, status: 'PENDING', participants: [{ id: 1 }] }) };
    service = new RcaAppointmentService(prisma, rca);
  });
  afterEach(() => jest.restoreAllMocks());
  it('saves a future appointment with only participants from this case and audits it', async () => {
    await service.create('R1', { starts_at: future(), location: 'Meeting room', participant_ids: [1, 1] }, actor);
    expect(prisma.standard_rca_appointment.create.mock.calls[0][0].data.participant_ids).toBe('[1]');
    expect(prisma.workflow_audit.create).toHaveBeenCalled();
  });
  it('rejects outsiders, declined participants, and past dates', async () => {
    await expect(service.create('R1', { starts_at: future(), location: 'room', participant_ids: [9] }, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('R1', { starts_at: '2020-01-01', location: 'room', participant_ids: [1] }, actor)).rejects.toBeInstanceOf(BadRequestException);
    rca.getStandardById.mockResolvedValue({ hospital_center: true, can_manage_team: true, participants: [{ id: 1, response_status: 'DECLINED' }] });
    await expect(service.create('R1', { starts_at: future(), location: 'room', participant_ids: [1] }, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.standard_rca_appointment.create).not.toHaveBeenCalled();
  });
  it('does not allow a read-only collaborator to schedule', async () => {
    rca.getStandardById.mockResolvedValue({ hospital_center: true, can_manage_team: false });
    await expect(service.create('R1', { starts_at: future(), location: 'room', participant_ids: [1] }, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('does not send an already delivered appointment again', async () => {
    prisma.standard_rca_appointment.findFirst.mockResolvedValue({ starts_at: new Date(future()), notification_status: 'SENT' });
    const send = jest.spyOn(global, 'fetch');
    expect(await service.notify('R1', 'M1', actor)).toEqual({ sent: true, already_sent: true });
    expect(send).not.toHaveBeenCalled();
  });
  it('limits RM/PCT center access and does not give approval rights', async () => {
    const db: any = { team: { findUnique: jest.fn().mockResolvedValue({ team_name: 'PCT' }) } };
    const core = new RcaService(db, {} as any, {} as any);
    const user = { id: 7, role: 'staff', teamId: 2, departmentId: '99' };
    await expect((core as any).assertStandardWriter({ hospital_center: true, department_id: '1', participants: [] }, user)).resolves.toBeUndefined();
    await expect((core as any).assertStandardWriter({ hospital_center: false, department_id: '1', participants: [] }, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect((core as any).assertStandardWriter({ hospital_center: true, department_id: '1', participants: [] }, user, true)).rejects.toBeInstanceOf(ForbiddenException);
    db.team.findUnique.mockResolvedValue({ team_name: 'PHARMACY' });
    expect(await (core as any).isCenterCoordinator(user)).toBe(false);
  });
  it('uses the shared bot and sends only appointment data, with a delivery claim', async () => {
    const previous = { token: process.env.TELEGRAM_BOT_TOKEN, chat: process.env.TELEGRAM_CHAT_ID, enabled: process.env.RCA_TELEGRAM_APPOINTMENTS_ENABLED };
    process.env.TELEGRAM_BOT_TOKEN = 'test-only'; process.env.TELEGRAM_CHAT_ID = 'test-chat'; process.env.RCA_TELEGRAM_APPOINTMENTS_ENABLED = 'true';
    try {
      prisma.standard_rca_appointment.findFirst.mockResolvedValue({ starts_at: new Date(future()), location: 'room', notification_status: 'NOT_SENT' });
      const send = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as any);
      await service.notify('R1', 'M1', actor);
      const payload = JSON.parse(send.mock.calls[0][1]?.body as string);
      expect(payload.chat_id).toBe('test-chat'); expect(payload.text).toContain('/rca/standard/R1');
      expect(payload.text).not.toContain('participants');
      expect(prisma.standard_rca_appointment.update).toHaveBeenCalledWith({ where: { id: 'M1' }, data: { notification_status: 'SENT' } });
      send.mockClear(); prisma.standard_rca_appointment.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.notify('R1', 'M1', actor)).rejects.toThrow('กำลังส่ง'); expect(send).not.toHaveBeenCalled();
      prisma.standard_rca_appointment.updateMany.mockResolvedValue({ count: 1 });
      send.mockRejectedValue(new Error('timeout'));
      await expect(service.notify('R1', 'M1', actor)).rejects.toThrow('ยังยืนยันผลส่งไม่ได้');
      expect(prisma.standard_rca_appointment.update).toHaveBeenLastCalledWith({ where: { id: 'M1' }, data: { notification_status: 'UNKNOWN' } });
    } finally {
      for (const [key, value] of Object.entries({ TELEGRAM_BOT_TOKEN: previous.token, TELEGRAM_CHAT_ID: previous.chat, RCA_TELEGRAM_APPOINTMENTS_ENABLED: previous.enabled })) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });
});
