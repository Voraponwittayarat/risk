import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Pencil, Plus, RefreshCw, Search, SlidersHorizontal, UsersRound, X } from 'lucide-react';

interface Member {
  id: number;
  cid: string;
  name: string;
  departmentId: number | null;
  departmentId2: number | null;
  departmentName: string | null;
  positionId: number | null;
  positionName: string | null;
  teamId: number | null;
  teamName: string | null;
  role: string;
  rmScope: string | null;
  active: boolean;
  createdAt: string;
}

interface Option { id: number; name: string }
interface RoleOption { id: string; name: string }
interface Metadata { departments: Option[]; positions: Option[]; teams: Option[]; roles: RoleOption[]; rmScopes: RoleOption[] }

interface MemberForm {
  cid: string;
  name: string;
  departmentId: string;
  departmentId2: string;
  positionId: string;
  teamId: string;
  role: string;
  rmScope: string;
  active: boolean;
}

const emptyForm: MemberForm = {
  cid: '',
  name: '',
  departmentId: '',
  departmentId2: '',
  positionId: '',
  teamId: '',
  role: 'staff',
  rmScope: 'department',
  active: true,
};

function errorMessage(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PersonnelManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [metadata, setMetadata] = useState<Metadata>({ departments: [], positions: [], teams: [], roles: [], rmScopes: [] });
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<Member | null | 'new'>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [membersResponse, metadataResponse] = await Promise.all([
        axios.get('/members'),
        axios.get('/users/metadata'),
      ]);
      setMembers(membersResponse.data);
      setMetadata(metadataResponse.data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const roleName = (role: string) => metadata.roles.find((item) => item.id === role)?.name || role;
  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return members.filter((member) => {
      if (departmentFilter && String(member.departmentId) !== departmentFilter && String(member.departmentId2) !== departmentFilter) return false;
      if (roleFilter && member.role !== roleFilter) return false;
      if (statusFilter === 'active' && !member.active) return false;
      if (statusFilter === 'inactive' && member.active) return false;
      if (!keyword) return true;
      return [member.name, member.cid, member.departmentName, member.positionName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [query, departmentFilter, roleFilter, statusFilter, members]);
  const activeCount = members.filter((member) => member.active).length;
  const hasFilters = Boolean(query.trim() || departmentFilter || roleFilter || statusFilter !== 'all');

  const openCreate = () => {
    setForm(emptyForm);
    setEditing('new');
    setError('');
  };

  const fillEditForm = (member: Member) => {
    setForm({
      cid: member.cid || '',
      name: member.name,
      departmentId: member.departmentId?.toString() || '',
      departmentId2: member.departmentId2?.toString() || '',
      positionId: member.positionId?.toString() || '',
      teamId: member.teamId?.toString() || '',
      role: member.role,
      rmScope: member.rmScope || 'department',
      active: member.active,
    });
    setEditing(member);
    setError('');
  };

  const payloadFromForm = () => ({
    cid: form.cid.trim(),
    name: form.name.trim(),
    departmentId: Number(form.departmentId),
    departmentId2: form.departmentId2 ? Number(form.departmentId2) : 0,
    positionId: Number(form.positionId),
    teamId: form.teamId ? Number(form.teamId) : null,
    role: form.role,
    rmScope: form.role === 'rm_committee' ? form.rmScope : null,
    active: form.active,
  });

  const saveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await axios.post('/members', payloadFromForm());
        setSuccess('สร้างข้อมูลบุคลากรเรียบร้อยแล้ว');
      } else if (editing) {
        await axios.patch(`/members/${editing.id}`, payloadFromForm());
        setSuccess('บันทึกข้อมูลบุคลากรเรียบร้อยแล้ว');
      }
      setEditing(null);
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSuccess(''), 3000);
    }
  };

  const deleteMember = async (member: Member) => {
    if (!window.confirm(`คุณต้องการลบข้อมูลของ ${member.name} ใช่หรือไม่?\nหมายเหตุ: จะลบได้เฉพาะคนที่ยังไม่เคยลงทะเบียนใช้งานระบบเท่านั้น`)) return;
    setError('');
    try {
      await axios.delete(`/members/${member.id}`);
      setSuccess('ลบข้อมูลเรียบร้อยแล้ว');
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-2.5 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              <UsersRound className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">จัดการข้อมูลบุคลากร</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">เตรียมข้อมูลสำหรับให้พนักงานลงทะเบียนเข้าใช้งานระบบ</p>
            </div>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-700">
          <Plus className="h-5 w-5" /> เพิ่มบุคลากร
        </button>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
          {error || success}
        </div>
      )}

      <section aria-label="ภาพรวมบุคลากร" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'บุคลากรทั้งหมด', value: members.length, color: 'text-slate-900 dark:text-white' },
          { label: 'เปิดใช้งาน', value: activeCount, color: 'text-emerald-700 dark:text-emerald-300' },
          { label: 'ระงับการใช้งาน', value: members.length - activeCount, color: 'text-rose-700 dark:text-rose-300' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value.toLocaleString('th-TH')}</p>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><SlidersHorizontal className="h-4 w-4 text-purple-600" /> ค้นหาและกรองรายชื่อ</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">แสดง {filteredMembers.length.toLocaleString('th-TH')} จาก {members.length.toLocaleString('th-TH')} รายการ</p>
            </div>
            <div className="flex gap-2">
              {hasFilters && <button type="button" onClick={() => { setQuery(''); setDepartmentFilter(''); setRoleFilter(''); setStatusFilter('all'); }} className="rounded-xl px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40">ล้างตัวกรอง</button>}
              <button type="button" onClick={() => void loadData()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> โหลดใหม่
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative block">
              <span className="sr-only">ค้นหาบุคลากร</span>
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ เลขบัตร ตำแหน่ง" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="block">
              <span className="sr-only">กรองหน่วยงาน</span>
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <option value="">ทุกหน่วยงาน</option>
                {metadata.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">กรองสิทธิ์</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <option value="">ทุกสิทธิ์</option>
                {metadata.roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">กรองสถานะ</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <option value="all">ทุกสถานะ</option>
                <option value="active">เปิดใช้งาน</option>
                <option value="inactive">ระงับการใช้งาน</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">ข้อมูลบุคลากร</th>
                <th className="px-5 py-3">หน่วยงาน / ตำแหน่ง</th>
                <th className="px-5 py-3">สิทธิ์</th>
                <th className="px-5 py-3">สถานะ</th>
                <th className="px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{member.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">CID: {member.cid || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{member.departmentName || '-'}</p>
                    <p className="text-xs text-slate-500">{member.positionName || '-'}</p>
                    {member.teamName && <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">ทีมนำ: {member.teamName}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {roleName(member.role)}
                    </span>
                    {member.role === 'rm_committee' && (
                      <p className="mt-1 text-xs text-slate-500">{metadata.rmScopes.find((item) => item.id === member.rmScope)?.name || 'เฉพาะหน่วยงาน'}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${member.active ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${member.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {member.active ? 'ใช้งาน' : 'ระงับ'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => fillEditForm(member)} title="แก้ไขข้อมูล" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => void deleteMember(member)} title="ลบข้อมูล" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"><X className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredMembers.length === 0 && <div className="p-12 text-center text-sm text-slate-500">{hasFilters ? 'ไม่พบรายชื่อตามเงื่อนไขที่เลือก' : 'ยังไม่มีข้อมูลบุคลากร'}</div>}
          {loading && <div className="p-12 text-center text-sm text-slate-500">กำลังโหลดข้อมูล…</div>}
        </div>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'เพิ่มบุคลากรใหม่' : `แก้ไขข้อมูล ${typeof editing === 'object' ? editing.name : ''}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveMember} className="space-y-5 p-6">
            <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
              <legend className="px-2 text-sm font-bold text-purple-700 dark:text-purple-300">01 · ข้อมูลส่วนบุคคล</legend>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">ข้อมูลสำหรับระบุตัวบุคลากรและเตรียมการลงทะเบียน</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="เลขประจำตัวประชาชน 13 หลัก" required><input inputMode="numeric" minLength={13} maxLength={13} value={form.cid} onChange={(event) => setForm({ ...form, cid: event.target.value.replace(/\D/g, '') })} required className="form-input" disabled={editing !== 'new'} title={editing !== 'new' ? 'ไม่สามารถเปลี่ยนเลขบัตรได้' : ''} /></Field>
                <Field label="ชื่อ-นามสกุล" required><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="form-input" /></Field>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
              <legend className="px-2 text-sm font-bold text-purple-700 dark:text-purple-300">02 · สังกัดและตำแหน่ง</legend>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">ระบุหน่วยงานหลักก่อน แล้วเพิ่มหน่วยงานรองหรือทีมนำหากมี</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="หน่วยงานหลัก" required><select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} required className="form-input"><option value="">เลือกหน่วยงาน</option>{metadata.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                <Field label="หน่วยงานรอง (ถ้ามี)"><select value={form.departmentId2} onChange={(event) => setForm({ ...form, departmentId2: event.target.value })} className="form-input"><option value="">ไม่มี</option>{metadata.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                <Field label="ตำแหน่ง" required><select value={form.positionId} onChange={(event) => setForm({ ...form, positionId: event.target.value })} required className="form-input"><option value="">เลือกตำแหน่ง</option>{metadata.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                <Field label="ทีมนำที่สังกัด/รับงานร่วมทบทวน (ถ้ามี)"><select value={form.teamId} onChange={(event) => setForm({ ...form, teamId: event.target.value })} className="form-input"><option value="">ไม่สังกัดทีมนำ</option>{metadata.teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
              <legend className="px-2 text-sm font-bold text-purple-700 dark:text-purple-300">03 · สิทธิ์และสถานะ</legend>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">กำหนดบทบาทเริ่มต้นและขอบเขตการเห็นข้อมูล</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="สิทธิ์การใช้งานเบื้องต้น" required><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="form-input">{metadata.roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                {form.role === 'rm_committee' && <Field label="ขอบเขตการมองเห็นของ RM" required><select value={form.rmScope} onChange={(event) => setForm({ ...form, rmScope: event.target.value })} className="form-input">{metadata.rmScopes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
              </div>
              {editing !== 'new' && <label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">เปิดใช้งานบัญชีนี้</span></label>}
            </fieldset>
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">ยกเลิก</button><button disabled={saving} className="rounded-xl bg-purple-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60 hover:bg-purple-700">{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button></div>
          </form>
        </Modal>
      )}

      <style>{`
        .form-input {
          width: 100%;
          border-radius: .75rem;
          border: 1px solid rgb(203 213 225);
          background: rgb(255 255 255) !important;
          color: rgb(15 23 42) !important;
          -webkit-text-fill-color: rgb(15 23 42);
          caret-color: rgb(37 99 235);
          color-scheme: light;
          padding: .65rem .8rem;
          font-size: .875rem;
          outline: none;
        }
        .form-input::placeholder {
          color: rgb(100 116 139) !important;
          -webkit-text-fill-color: rgb(100 116 139);
          opacity: 1;
        }
        .form-input option {
          background: rgb(255 255 255);
          color: rgb(15 23 42);
        }
        .form-input:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(37 99 235 / .14);
        }
        .form-input:disabled {
          background: rgb(241 245 249) !important;
          color: rgb(100 116 139) !important;
          -webkit-text-fill-color: rgb(100 116 139);
          cursor: not-allowed;
        }
        .dark .form-input {
          border-color: rgb(71 85 105);
          background: rgb(15 23 42) !important;
          color: rgb(248 250 252) !important;
          -webkit-text-fill-color: rgb(248 250 252);
          caret-color: rgb(96 165 250);
          color-scheme: dark;
        }
        .dark .form-input::placeholder {
          color: rgb(148 163 184) !important;
          -webkit-text-fill-color: rgb(148 163 184);
        }
        .dark .form-input option {
          background: rgb(15 23 42);
          color: rgb(248 250 252);
        }
        .dark .form-input:disabled {
          background: rgb(30 41 59) !important;
          color: rgb(148 163 184) !important;
          -webkit-text-fill-color: rgb(148 163 184);
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>;
}
