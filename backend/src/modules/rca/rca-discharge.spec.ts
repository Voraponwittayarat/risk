import { RcaService } from './rca.service';

describe('administrative discharge without RCA', () => {
  const setup = () => {
    const tx: any = {
      riskregister: { findFirst: jest.fn().mockResolvedValue({ id: 10, id_risk: 20, status_risk: 'ทบทวน' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      standard_rca_case: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      capa_action: { count: jest.fn().mockResolvedValue(0) }, rca_case: { count: jest.fn().mockResolvedValue(0) },
      riskreview: { create: jest.fn() }, sla_instance: { updateMany: jest.fn() }, workflow_audit: { create: jest.fn() },
    };
    const service = new RcaService({ $transaction: (fn: any) => fn(tx) } as any, {} as any, {} as any);
    jest.spyOn(service, 'getStandardById').mockResolvedValue({ id: 'R1', version: 3, department_id: '1', incident_id: 10, status: 'DRAFT', participants: [] } as any);
    jest.spyOn(service as any, 'allowedDepartments').mockResolvedValue(['1']);
    return { service, tx, data: { reason: 'ส่งเข้าระบบ RCA ผิดจากการตรวจข้อเท็จจริง', expected_version: 3 }, user: { id: 7, role: 'head', departmentId: 1 } };
  };
  it('closes the incident, retains cancelled RCA and records the reason without creating a register', async () => {
    const { service, tx, data, user } = setup();
    await expect(service.dischargeWithoutRca('R1', data, user)).resolves.toMatchObject({ incident_id: 10, status: 'จำหน่าย' });
    expect(tx.standard_rca_case.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }));
    expect(tx.riskreview.create.mock.calls[0][0].data.notereview).toContain(data.reason);
    expect(tx.riskregister.updateMany.mock.calls[0][0].data).toMatchObject({ status_risk: 'จำหน่าย', rca_required: false, rca_status: 'NONE' });
    expect(tx.workflow_audit.create.mock.calls[0][0].data.action).toBe('DISCHARGED_WITHOUT_RCA');
  });
  it.each(['staff', 'rm_committee'])('rejects actors outside the authorized workflow: %s', async role => {
    const { service, tx, data, user } = setup();
    if (role === 'rm_committee') (service as any).allowedDepartments.mockResolvedValue(['99']);
    await expect(service.dischargeWithoutRca('R1', data, { ...user, role })).rejects.toThrow();
    expect(tx.riskreview.create).not.toHaveBeenCalled();
  });
  it('rejects stale versions, short reasons and an active CAPA', async () => {
    const { service, tx, data, user } = setup();
    await expect(service.dischargeWithoutRca('R1', { ...data, expected_version: 2 }, user)).rejects.toThrow('ข้อมูลเปลี่ยน');
    await expect(service.dischargeWithoutRca('R1', { ...data, reason: 'สั้น' }, user)).rejects.toThrow('เหตุผล');
    tx.capa_action.count.mockResolvedValue(1);
    await expect(service.dischargeWithoutRca('R1', data, user)).rejects.toThrow('มาตรการ');
    expect(tx.standard_rca_case.updateMany).not.toHaveBeenCalled();
  });
  it('does not reopen completed or cancelled RCA and detects competing saves', async () => {
    const { service, tx, data, user } = setup();
    tx.standard_rca_case.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.dischargeWithoutRca('R1', data, user)).rejects.toThrow('ข้อมูลเปลี่ยน');
    expect(tx.riskreview.create).not.toHaveBeenCalled();
    (service.getStandardById as jest.Mock).mockResolvedValue({ department_id: '1', incident_id: 10, status: 'CANCELLED', participants: [] });
    await expect(service.dischargeWithoutRca('R1', data, user)).rejects.toThrow('จำหน่ายได้เฉพาะ');
    await expect(service.completeStandard('R1', {} as any, user)).rejects.toThrow('ยกเลิกหรือจำหน่าย');
  });
});
