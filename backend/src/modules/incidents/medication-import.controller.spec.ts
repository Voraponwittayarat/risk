import { MedicationImportService } from './medication-import.controller';

describe('Medication import authorization and idempotency', () => {
  const user = { id: 7, role: 'rm_committee', departmentId: 1, rmScope: 'hospital' };
  function setup() {
    const stored: any[] = [];
    const prisma: any = {
      department: { findMany: jest.fn().mockResolvedValue([{ id: 1, depart_name: 'Test', depart_group_id: 1 }, { id: 2, depart_name: 'Other', depart_group_id: 2 }]) },
      location: { findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Test' }]) },
      duration: { findMany: jest.fn().mockResolvedValue([{ id: 1, duration_name: 'เช้า' }]) },
      nRLS_riskstore: { findMany: jest.fn().mockResolvedValue([{ nrls_code: 'TEST', name: 'Test' }]) },
      riskregister: { findMany: jest.fn().mockImplementation(async () => stored), findFirst: jest.fn().mockImplementation(async ({ where }) => stored.find(s => s.link_key === where.link_key)) },
    };
    const incidents: any = { create: jest.fn().mockImplementation(async (_data, _user, source) => { const record = { id: 1, link_key: source.linkKey }; stored.push(record); return record; }) };
    const service = new MedicationImportService(prisma, incidents);
    const file: any = { originalname: 'test.csv', buffer: Buffer.from('ประทับเวลา,วันที่เกิดเหตุการณ์,ช่วงเวรที่เกิดเหตุการณ์,สถานที่เกิดเหตุการณ์,ระดับความรุนแรง,เหตุการณ์/รายละเอียดเพิ่มเติม\n1/10/2026,1/10/2569,เช้า,Test,B,Test') };
    const choice = { row: 2, date_report: '2026-10-01', time_report: '08:00', level_id: 'B', nrls_code: 'TEST', department_id: '1', location_id: '1', duration_id: '1' };
    return { service, incidents, file, choice };
  }
  it('allows hospital RM and admin but denies staff, head and narrower RM scopes', async () => {
    const { service } = setup();
    for (const role of ['staff', 'head']) await expect(service.context({ ...user, role })).rejects.toThrow();
    for (const rmScope of ['department', 'group', null, undefined]) await expect(service.context({ ...user, rmScope })).rejects.toThrow();
    expect((await service.context(user)).departments.map(d => d.id)).toEqual([1, 2]);
    expect((await service.context({ ...user, role: 'admin', rmScope: null })).departments.map(d => d.id)).toEqual([1, 2]);
  });
  it('binds preview to its owner and validates all selected rows before writing', async () => {
    const { service, incidents, file, choice } = setup();
    const { token } = await service.preview(file, user);
    await expect(service.commit({ token, rows: [choice] }, { ...user, id: 8 })).rejects.toThrow();
    await expect(service.commit({ token, rows: [{ ...choice, department_id: '999' }] }, user)).rejects.toThrow();
    await expect(service.commit({ token, rows: [{ ...choice, time_report: '25:00' }] }, user)).rejects.toThrow();
    expect(incidents.create).not.toHaveBeenCalled();
  });
  it('allows admin import and rechecks scope on preview and commit', async () => {
    const { service, file, choice, incidents } = setup();
    const admin = { ...user, role: 'admin', rmScope: null };
    const { token } = await service.preview(file, admin);
    await expect(service.preview(file, { ...user, rmScope: 'group' })).rejects.toThrow();
    await expect(service.commit({ token, rows: [choice] }, { ...user, rmScope: 'department' })).rejects.toThrow();
    expect(incidents.create).not.toHaveBeenCalled();
    expect((await service.commit({ token, rows: [choice] }, admin)).results[0].status).toBe('created');
  });
  it('serializes repeated submissions, skips duplicates and suppresses external notifications', async () => {
    const { service, incidents, file, choice } = setup();
    const { token } = await service.preview(file, user);
    const results = await Promise.all([service.commit({ token, rows: [choice] }, user), service.commit({ token, rows: [choice] }, user)]);
    expect(results[0].results[0].status).toBe('created');
    expect(results[1].results[0].status).toBe('duplicate');
    expect(incidents.create).toHaveBeenCalledTimes(1);
    expect(incidents.create.mock.calls[0][2].suppressNotification).toBe(true);
  });
});
