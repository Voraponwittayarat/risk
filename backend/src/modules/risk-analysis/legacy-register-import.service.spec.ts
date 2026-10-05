import { LegacyRegisterImportService, normalizeLegacyRegister } from './legacy-register-import.service';
const user = { id: 9, role: 'rm_committee', rmScope: 'hospital', departmentId: 2 };
const record = { source_row: 4, risk_title: 'Original hospital risk', risk_owner_name: 'Owner One', initial_likelihood: 4, initial_consequence: 5, source_risk_score: 20, status: 'open', review_frequency_months: 1, last_reviewed_date: '2024-01-31', source_context: 'Original review result; no residual reassessment', risk_prevention: 'Original plan' };
const packet = () => ({ format: 'riskhrms-hospital-register-v1', source_id: 'FILE_ID', source_sha256: 'a'.repeat(64), sheet: 'Original sheet', records: [{ ...record }] });
function fixture() {
  const stored: any[] = [];
  const db: any = {
    riskanalysis: { findMany: jest.fn(async () => stored), create: jest.fn(async ({ data }) => { const row = { id: stored.length + 1, ...data }; stored.push(row); return row; }) },
    member: { findMany: jest.fn(async () => [{ member_name: 'Owner One', cid: 'test-owner' }]) },
    user: { findMany: jest.fn(async () => [{ id: 17, cid: 'test-owner' }]) },
    workflow_audit: { create: jest.fn(async () => ({})) },
  };
  db.$transaction = jest.fn(async (fn) => fn(db));
  return { db, stored, service: new LegacyRegisterImportService(db) };
}
describe('hospital legacy register import', () => {
  it('preserves original title and plan, leaves NRLS and residual assessment unset, clamps month end', () => {
    const row = normalizeLegacyRegister(packet()).records[0].data;
    expect(row.risk_title).toBe(record.risk_title); expect(row.risk_prevention).toBe(record.risk_prevention);
    expect(row.nrls_code).toBeNull(); expect(row.residual_risk_level).toBeNull();
    expect(row.next_review_date.toISOString().slice(0, 10)).toBe('2024-02-29');
    expect(row.risk_description).toContain('Original review result'); expect(row.risk_description).toContain('แถว 4');
  });
  it.each([{ initial_likelihood: null }, { initial_consequence: 0 }, { source_risk_score: 12 }, { status: 'closed' }, { risk_owner_name: '' }, { last_reviewed_date: '2024-02-31' }])('rejects incomplete, conflicting or closed source records %p', patch => {
    const batch = packet(); Object.assign(batch.records[0], patch);
    expect(() => normalizeLegacyRegister(batch)).toThrow();
  });
  it('rejects duplicate names even when source rows differ', () => {
    const batch = packet(); batch.records.push({ ...record, source_row: 5 });
    expect(() => normalizeLegacyRegister(batch)).toThrow('ซ้ำ');
  });
  it('rejects malformed rows with a controlled validation error', () => {
    expect(() => normalizeLegacyRegister({ ...packet(), records: [null] })).toThrow('รายการความเสี่ยง');
  });
  it('restricts both preview and commit to hospital RM/Admin before querying data', async () => {
    const { service, db } = fixture();
    await expect(service.preview(packet(), { ...user, rmScope: 'group' })).rejects.toThrow('เฉพาะ RM');
    await expect(service.commit(packet(), { ...user, role: 'staff' })).rejects.toThrow('เฉพาะ RM');
    expect(db.riskanalysis.findMany).not.toHaveBeenCalled();
  });
  it('previews owner matches without exposing CID and does not write', async () => {
    const { service, db } = fixture(); const preview = await service.preview(packet(), user);
    expect(preview.new_count).toBe(1); expect(preview.rows[0].owner_linked).toBe(true);
    expect(JSON.stringify(preview)).not.toContain('test-owner'); expect(db.riskanalysis.create).not.toHaveBeenCalled();
  });
  it('does not attach an owner when matching names are ambiguous', async () => {
    const { service, db } = fixture(); db.member.findMany.mockResolvedValue([{ member_name: 'Owner One', cid: 'a' }, { member_name: 'Owner One', cid: 'b' }]);
    expect((await service.preview(packet(), user)).rows[0].owner_linked).toBe(false);
  });
  it('writes source provenance audit in a serializable transaction and repeated import skips duplicates', async () => {
    const { service, db } = fixture(); const preview = await service.preview(packet(), user);
    const result = await service.commit({ ...packet(), preview_hash: preview.preview_hash }, user);
    expect(result?.imported).toBe(1); expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }));
    expect(db.riskanalysis.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ scope_level: 'hospital', created_by: 9, risk_owner_user_id: 17 }));
    expect(db.workflow_audit.create.mock.calls[0][0].data.new_value).not.toContain('Original review result');
    const next = await service.preview(packet(), user);
    expect(next.duplicate_count).toBe(1); expect((await service.commit({ ...packet(), preview_hash: next.preview_hash }, user))?.imported).toBe(0);
    expect(db.riskanalysis.create).toHaveBeenCalledTimes(1);
  });
  it('refuses stale preview after another import rather than overwriting', async () => {
    const { service, stored, db } = fixture(); const preview = await service.preview(packet(), user);
    stored.push({ id: 5, risk_code: 'other-code', risk_title: record.risk_title });
    await expect(service.commit({ ...packet(), preview_hash: preview.preview_hash }, user)).rejects.toThrow('เปลี่ยนไป');
    expect(db.riskanalysis.create).not.toHaveBeenCalled();
  });
});
