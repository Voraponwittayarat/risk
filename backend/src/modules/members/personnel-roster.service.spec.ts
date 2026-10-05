import { PersonnelRosterService } from './personnel-roster.service';
const csv = 'ลำดับ,ชื่อ - สกุล,ตำแหน่ง,กลุ่มงาน,งาน,ประเภทการจ้าง\n1,นาย ตัวอย่าง ทดสอบ,เจ้าหน้าที่,กลุ่ม,งานใหม่,จ้าง\n2,คน ใหม่,เจ้าหน้าที่,กลุ่ม,งานใหม่,จ้าง';
describe('personnel roster import', () => {
  const admin = { id: 1, role: 'admin' };
  function setup() {
    let latest: any = null;
    const members = [{ id: 3, cid: 'fixture-only', member_name: 'ตัวอย่าง ทดสอบ', department_id1: 8 }];
    const tx = {
      personnel_roster_batch: { findFirst: jest.fn(async () => latest), create: jest.fn(async () => ({ id: 1 })) },
      personnel_roster_entry: { createMany: jest.fn(async (_args: any) => ({ count: 2 })) },
      member: { findMany: jest.fn(async () => members) },
      department: { findMany: jest.fn(async () => [{ id: 8, depart_name: 'งานใหม่' }]) },
    };
    const prisma = { ...tx, $transaction: jest.fn(async fn => fn(tx)) };
    const service = new PersonnelRosterService(prisma as any);
    return { service, tx, members, prisma, setLatest: (v: any) => { latest = v; } };
  }
  async function preview(service: PersonnelRosterService, owner = admin) {
    return service.preview({ originalname: 'fixture.csv', buffer: Buffer.from(csv) }, owner);
  }
  const body = (token: string) => ({ token, asOf: '2026-10-02', confirmSnapshot: true, rows: [{ row: 2, departmentId: 8, memberId: 3 }, { row: 3, departmentId: 8, memberId: null }] });
  it('suggests unique names and departments; returns no identity numbers', async () => {
    const { service } = setup();
    const p = await preview(service);
    expect(p.rows.map(r => [r.status, r.memberId])).toEqual([['existing_member',3],['new',null]]);
    expect(p.units[0].departmentId).toBe(8);
    expect(JSON.stringify(p)).not.toContain('fixture-only');
  });
  it('rejects non-admin and requires owner, complete snapshot and valid assignments', async () => {
    const { service, tx } = setup();
    await expect(preview(service, { id: 2, role: 'staff' })).rejects.toThrow();
    const p = await preview(service);
    await expect(service.commit(body(p.token), { id: 2, role: 'admin' })).rejects.toThrow();
    await expect(service.commit({ ...body(p.token), confirmSnapshot: false }, admin)).rejects.toThrow();
    await expect(service.commit({ ...body(p.token), rows: [{ row: 2, departmentId: 999, memberId: 3 }, { row: 3, departmentId: 8, memberId: null }] }, admin)).rejects.toThrow();
    expect(tx.personnel_roster_batch.create).not.toHaveBeenCalled();
  });
  it('writes an atomic snapshot and consumes the token without touching login accounts', async () => {
    const { service, tx, prisma } = setup();
    const p = await preview(service);
    expect(await service.commit(body(p.token), admin)).toEqual({ id: 1, count: 2, unlinked: 1 });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable', timeout: 30000 });
    expect(tx.personnel_roster_entry.createMany.mock.calls[0][0].data).toHaveLength(2);
    await expect(service.commit(body(p.token), admin)).rejects.toThrow();
    expect(tx.personnel_roster_batch.create).toHaveBeenCalledTimes(1);
  });
  it('refuses stale previews after another snapshot or personnel edit', async () => {
    const { service, setLatest, members, tx } = setup();
    const p = await preview(service);
    setLatest({ id: 5 });
    await expect(service.commit(body(p.token), admin)).rejects.toThrow('ชุดใหม่');
    setLatest(null); members[0].member_name = 'ข้อมูลเปลี่ยน';
    await expect(service.commit(body(p.token), admin)).rejects.toThrow('เปลี่ยนแล้ว');
    expect(tx.personnel_roster_batch.create).not.toHaveBeenCalled();
  });
  it('requires ambiguous names to be resolved and rejects duplicate person links', async () => {
    const { service, members } = setup();
    members.push({ ...members[0], id: 4 });
    const p = await preview(service);
    expect(p.rows[0]).toMatchObject({ matchStatus: 'ambiguous', memberId: null });
    await expect(service.commit({ ...body(p.token), rows: [{ row: 2, departmentId: 8, memberId: 3 }, { row: 3, departmentId: 8, memberId: 3 }] }, admin)).rejects.toThrow('ซ้ำ');
  });
});
