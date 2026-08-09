import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundX,
  UsersRound,
  X,
} from 'lucide-react';

type Role = 'admin' | 'rm_committee' | 'head' | 'staff';

interface ManagedUser {
  id: number;
  username: string;
  email: string;
  cid: string | null;
  name: string;
  departmentId: number | null;
  departmentId2: number | null;
  departmentName: string | null;
  positionId: number | null;
  positionName: string | null;
  teamId: number | null;
  role: Role;
  active: boolean;
  lastLoginAt: number | null;
  createdAt: number;
}

interface Option { id: number; name: string }
interface RoleOption { id: Role; name: string }
interface Metadata { departments: Option[]; positions: Option[]; roles: RoleOption[] }

interface UserForm {
  username: string;
  password: string;
  email: string;
  cid: string;
  name: string;
  departmentId: string;
  departmentId2: string;
  positionId: string;
  teamId: string;
  role: Role;
  active: boolean;
}

const emptyForm: UserForm = {
  username: '',
  password: '',
  email: '',
  cid: '',
  name: '',
  departmentId: '',
  departmentId2: '',
  positionId: '',
  teamId: '',
  role: 'staff',
  active: true,
};

const roleStyles: Record<Role, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  rm_committee: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  head: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  staff: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
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

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [metadata, setMetadata] = useState<Metadata>({ departments: [], positions: [], roles: [] });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<ManagedUser | null | 'new'>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, metadataResponse] = await Promise.all([
        axios.get('/users'),
        axios.get('/users/metadata'),
      ]);
      setUsers(usersResponse.data);
      setMetadata(metadataResponse.data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const roleName = (role: Role) => metadata.roles.find((item) => item.id === role)?.name || role;
  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      [user.username, user.name, user.email, user.cid, user.departmentName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [query, users]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing('new');
    setError('');
  };

  const fillEditForm = (user: ManagedUser) => {
    setForm({
      username: user.username,
      password: '',
      email: user.email,
      cid: user.cid || '',
      name: user.name,
      departmentId: user.departmentId?.toString() || '',
      departmentId2: user.departmentId2?.toString() || '',
      positionId: user.positionId?.toString() || '',
      teamId: user.teamId?.toString() || '',
      role: user.role,
      active: user.active,
    });
    setEditing(user);
    setError('');
  };

  const openEdit = async (user: ManagedUser) => {
    setLoadingEditId(user.id);
    setError('');
    try {
      const response = await axios.get(`/users/${user.id}`);
      fillEditForm(response.data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoadingEditId(null);
    }
  };

  const payloadFromForm = () => ({
    username: form.username.trim(),
    email: form.email.trim(),
    cid: form.cid.trim(),
    name: form.name.trim(),
    departmentId: Number(form.departmentId),
    departmentId2: form.departmentId2 ? Number(form.departmentId2) : 0,
    positionId: Number(form.positionId),
    teamId: form.teamId ? Number(form.teamId) : null,
    role: form.role,
    active: form.active,
  });

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await axios.post('/users', { ...payloadFromForm(), password: form.password });
        setSuccess('สร้างผู้ใช้งานเรียบร้อยแล้ว');
      } else if (editing) {
        await axios.patch(`/users/${editing.id}`, payloadFromForm());
        setSuccess('บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
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

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordUser) return;
    setSaving(true);
    setError('');
    try {
      await axios.patch(`/users/${passwordUser.id}/password`, { password: newPassword });
      setPasswordUser(null);
      setNewPassword('');
      setSuccess(`ตั้งรหัสผ่านใหม่ให้ ${passwordUser.username} เรียบร้อยแล้ว`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSuccess(''), 3000);
    }
  };

  const toggleActive = async (user: ManagedUser) => {
    if (!window.confirm(`${user.active ? 'ระงับ' : 'เปิด'}บัญชี ${user.username} ใช่หรือไม่?`)) return;
    setError('');
    try {
      await axios.patch(`/users/${user.id}`, { active: !user.active });
      setSuccess(user.active ? 'ระงับบัญชีเรียบร้อยแล้ว' : 'เปิดบัญชีเรียบร้อยแล้ว');
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
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <UsersRound className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">จัดการผู้ใช้งาน</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">ชื่อผู้ใช้ รหัสผ่าน สถานะบัญชี และสิทธิ์การเข้าถึง</p>
            </div>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
          <Plus className="h-5 w-5" /> เพิ่มผู้ใช้งาน
        </button>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
          {error || success}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ Username อีเมล เลขบัตร หรือหน่วยงาน" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <button onClick={() => void loadData()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> โหลดใหม่
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">ผู้ใช้งาน</th>
                <th className="px-5 py-3">หน่วยงาน / ตำแหน่ง</th>
                <th className="px-5 py-3">สิทธิ์</th>
                <th className="px-5 py-3">สถานะ</th>
                <th className="px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.username} · {user.email}</p>
                    <p className="mt-1 text-[11px] text-slate-400">CID: {user.cid || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{user.departmentName || '-'}</p>
                    <p className="text-xs text-slate-500">{user.positionName || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${roleStyles[user.role]}`}>{roleName(user.role)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.active ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {user.active ? 'ใช้งาน' : 'ระงับ'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button disabled={loadingEditId === user.id} onClick={() => void openEdit(user)} title="แก้ไขข้อมูล" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-40 dark:hover:bg-blue-950/40">{loadingEditId === user.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}</button>
                      <button onClick={() => { setPasswordUser(user); setNewPassword(''); setError(''); }} title="ตั้งรหัสผ่านใหม่" className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"><KeyRound className="h-4 w-4" /></button>
                      <button onClick={() => void toggleActive(user)} title={user.active ? 'ระงับบัญชี' : 'เปิดบัญชี'} className={`rounded-lg p-2 ${user.active ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}`}>
                        {user.active ? <UserRoundX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredUsers.length === 0 && <div className="p-12 text-center text-sm text-slate-500">ไม่พบผู้ใช้งาน</div>}
          {loading && <div className="p-12 text-center text-sm text-slate-500">กำลังโหลดข้อมูล…</div>}
        </div>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'เพิ่มผู้ใช้งาน' : `แก้ไข ${editing.username}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveUser} className="space-y-5 p-6">
            {editing !== 'new' && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300">
                  <ShieldCheck className="h-4 w-4" /> ข้อมูลปัจจุบันก่อนแก้ไข
                </div>
                <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4 dark:text-slate-300">
                  <div><span className="block text-slate-400">Username</span><strong>{editing.username}</strong></div>
                  <div><span className="block text-slate-400">ชื่อผู้ใช้งาน</span><strong>{editing.name}</strong></div>
                  <div><span className="block text-slate-400">หน่วยงาน</span><strong>{editing.departmentName || 'ยังไม่กำหนด'}</strong></div>
                  <div><span className="block text-slate-400">สิทธิ์ / สถานะ</span><strong>{roleName(editing.role)} · {editing.active ? 'ใช้งาน' : 'ระงับ'}</strong></div>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อผู้ใช้" required><input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required className="form-input" /></Field>
              <Field label="อีเมล" required><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required className="form-input" /></Field>
              {editing === 'new' && <Field label="รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัว)" required><input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required className="form-input" /></Field>}
              <Field label="เลขประจำตัวประชาชน 13 หลัก" required><input inputMode="numeric" minLength={13} maxLength={13} value={form.cid} onChange={(event) => setForm({ ...form, cid: event.target.value.replace(/\D/g, '') })} required className="form-input" /></Field>
              <Field label="ชื่อ-นามสกุล" required><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="form-input" /></Field>
              <Field label="สิทธิ์การใช้งาน" required><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="form-input">{metadata.roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="หน่วยงานหลัก" required><select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} required className="form-input"><option value="">เลือกหน่วยงาน</option>{metadata.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="หน่วยงานรอง"><select value={form.departmentId2} onChange={(event) => setForm({ ...form, departmentId2: event.target.value })} className="form-input"><option value="">ไม่มี</option>{metadata.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="ตำแหน่ง" required><select value={form.positionId} onChange={(event) => setForm({ ...form, positionId: event.target.value })} required className="form-input"><option value="">เลือกตำแหน่ง</option>{metadata.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="รหัสทีม (ถ้ามี)"><input type="number" min="1" value={form.teamId} onChange={(event) => setForm({ ...form, teamId: event.target.value })} className="form-input" /></Field>
            </div>
            {editing !== 'new' && <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">เปิดใช้งานบัญชีนี้</span></label>}
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">ยกเลิก</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button></div>
          </form>
        </Modal>
      )}

      {passwordUser && (
        <Modal title={`ตั้งรหัสผ่านใหม่: ${passwordUser.username}`} onClose={() => setPasswordUser(null)}>
          <form onSubmit={resetPassword} className="space-y-5 p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">การตั้งรหัสผ่านใหม่จะเปลี่ยน Auth Key ของบัญชี ควรแจ้งรหัสผ่านผ่านช่องทางที่ปลอดภัย</div>
            <Field label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)" required><input type="password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required autoFocus className="form-input" /></Field>
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setPasswordUser(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">ยกเลิก</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60"><KeyRound className="h-4 w-4" />{saving ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านใหม่'}</button></div>
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
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>;
}
