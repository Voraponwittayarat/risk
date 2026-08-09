import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

interface RiskTopic {
  id: number;
  code: string;
  name: string;
  fullName: string;
  groupId: number | null;
  programId: number | null;
  typeId: number | null;
  levelId: number | null;
  active: boolean;
  references?: number;
}

interface Option { id: number; name: string }
interface LevelOption extends Option { code: string }
interface Metadata { groups: Option[]; programs: Option[]; levels: LevelOption[] }
interface TopicForm {
  code: string;
  name: string;
  groupId: string;
  programId: string;
  typeId: string;
  levelId: string;
  active: boolean;
}

const emptyForm: TopicForm = {
  code: '', name: '', groupId: '', programId: '', typeId: '', levelId: '', active: true,
};

function messageFrom(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
}

export default function RiskTopicManagement() {
  const [topics, setTopics] = useState<RiskTopic[]>([]);
  const [metadata, setMetadata] = useState<Metadata>({ groups: [], programs: [], levels: [] });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RiskTopic | 'new' | null>(null);
  const [form, setForm] = useState<TopicForm>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pageSize = 50;

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [topicResponse, metadataResponse] = await Promise.all([
        axios.get('/risk-topics'),
        axios.get('/risk-topics/metadata'),
      ]);
      setTopics(topicResponse.data);
      setMetadata(metadataResponse.data);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);
  useEffect(() => { setPage(1); }, [query, status]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return topics.filter((topic) => {
      const matchesStatus = status === 'all' || (status === 'active' ? topic.active : !topic.active);
      const matchesQuery = !keyword || topic.fullName.toLowerCase().includes(keyword);
      return matchesStatus && matchesQuery;
    });
  }, [topics, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleTopics = filtered.slice((page - 1) * pageSize, page * pageSize);
  const groupName = (id: number | null) => metadata.groups.find((item) => item.id === id)?.name || '-';
  const programName = (id: number | null) => metadata.programs.find((item) => item.id === id)?.name || '-';

  const openCreate = () => {
    setForm(emptyForm);
    setEditing('new');
    setError('');
  };

  const openEdit = async (topic: RiskTopic) => {
    setError('');
    try {
      const response = await axios.get(`/risk-topics/${topic.id}`);
      const current: RiskTopic = response.data;
      setForm({
        code: current.code,
        name: current.name,
        groupId: current.groupId?.toString() || '',
        programId: current.programId?.toString() || '',
        typeId: current.typeId?.toString() || '',
        levelId: current.levelId?.toString() || '',
        active: current.active,
      });
      setEditing(current);
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  };

  const payload = () => ({
    code: form.code.trim(),
    name: form.name.trim(),
    groupId: form.groupId ? Number(form.groupId) : null,
    programId: form.programId ? Number(form.programId) : null,
    typeId: form.typeId ? Number(form.typeId) : null,
    levelId: form.levelId ? Number(form.levelId) : null,
    active: form.active,
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await axios.post('/risk-topics', payload());
        setSuccess('เพิ่มชื่อความเสี่ยงเรียบร้อยแล้ว');
      } else if (editing) {
        await axios.patch(`/risk-topics/${editing.id}`, payload());
        setSuccess('แก้ไขชื่อความเสี่ยงเรียบร้อยแล้ว');
      }
      setEditing(null);
      await loadData();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSuccess(''), 3500);
    }
  };

  const remove = async (topic: RiskTopic) => {
    if (!window.confirm(`ลบชื่อความเสี่ยง “${topic.fullName}” ใช่หรือไม่?\nรายการที่มีประวัติใช้งานจะถูกปิดใช้งานแทน`)) return;
    setError('');
    try {
      const response = await axios.delete(`/risk-topics/${topic.id}`);
      setSuccess(response.data.message);
      await loadData();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      window.setTimeout(() => setSuccess(''), 4000);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"><ShieldAlert className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">จัดการชื่อความเสี่ยง</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">เพิ่ม แก้ไข ปิดใช้งาน หรือลบหัวข้อความเสี่ยงในแบบรายงาน</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"><Plus className="h-5 w-5" />เพิ่มชื่อความเสี่ยง</button>
      </div>

      {(error || success) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>{error || success}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] dark:border-slate-800">
          <div className="relative"><Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารหัสหรือชื่อความเสี่ยง" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div>
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="active">กำลังใช้งาน</option><option value="inactive">ปิดใช้งาน</option><option value="all">ทั้งหมด</option></select>
          <button onClick={() => void loadData()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />โหลดใหม่</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60"><tr><th className="px-5 py-3">รหัส</th><th className="px-5 py-3">ชื่อความเสี่ยง</th><th className="px-5 py-3">กลุ่ม / โปรแกรม</th><th className="px-5 py-3">สถานะ</th><th className="px-5 py-3 text-right">จัดการ</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleTopics.map((topic) => <tr key={topic.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-5 py-4 font-mono font-bold text-blue-700 dark:text-blue-300">{topic.code}</td><td className="px-5 py-4"><p className="font-semibold text-slate-900 dark:text-white">{topic.name}</p><p className="mt-1 text-xs text-slate-400">ID: {topic.id}</p></td><td className="px-5 py-4"><p className="text-slate-700 dark:text-slate-200">{groupName(topic.groupId)}</p><p className="text-xs text-slate-500">{programName(topic.programId)}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${topic.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{topic.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1.5"><button onClick={() => void openEdit(topic)} title="แก้ไข" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"><Pencil className="h-4 w-4" /></button><button onClick={() => void remove(topic)} title="ลบ" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
            </tbody>
          </table>
          {!loading && visibleTopics.length === 0 && <div className="p-12 text-center text-sm text-slate-500">ไม่พบชื่อความเสี่ยง</div>}
          {loading && <div className="p-12 text-center text-sm text-slate-500">กำลังโหลดข้อมูล…</div>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800"><span className="text-slate-500">ทั้งหมด {filtered.length.toLocaleString()} รายการ</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button><span className="text-slate-600 dark:text-slate-300">หน้า {page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button></div></div>
      </div>

      {editing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-bold text-slate-900 dark:text-white">{editing === 'new' ? 'เพิ่มชื่อความเสี่ยง' : 'แก้ไขชื่อความเสี่ยง'}</h2><button onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div><form onSubmit={save} className="space-y-5 p-6">
        {editing !== 'new' && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"><strong>ข้อมูลเดิม:</strong> {editing.fullName}{editing.references ? ` · ถูกใช้งาน ${editing.references} ครั้ง` : ''}</div>}
        <div className="grid gap-4 sm:grid-cols-2"><Field label="รหัสความเสี่ยง" required><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required placeholder="เช่น IC/01" className="topic-input" /></Field><Field label="ชื่อความเสี่ยง" required><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="topic-input" /></Field><Field label="กลุ่มความเสี่ยง"><select value={form.groupId} onChange={(event) => setForm({ ...form, groupId: event.target.value })} className="topic-input"><option value="">ไม่ระบุ</option>{metadata.groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="โปรแกรมความเสี่ยง"><select value={form.programId} onChange={(event) => setForm({ ...form, programId: event.target.value })} className="topic-input"><option value="">ไม่ระบุ</option>{metadata.programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="ประเภท"><select value={form.typeId} onChange={(event) => setForm({ ...form, typeId: event.target.value })} className="topic-input"><option value="">ไม่ระบุ</option><option value="1">ทั่วไป</option><option value="2">คลินิก</option></select></Field><Field label="ระดับเริ่มต้น"><select value={form.levelId} onChange={(event) => setForm({ ...form, levelId: event.target.value })} className="topic-input"><option value="">ไม่ระบุ</option>{metadata.levels.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></Field></div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">เปิดใช้งานในแบบรายงานความเสี่ยง</span></label>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">ยกเลิก</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button></div>
      </form></div></div>}

      <style>{`.topic-input{width:100%;border-radius:.75rem;border:1px solid rgb(203 213 225);background:white;color:rgb(15 23 42);padding:.65rem .8rem;font-size:.875rem;outline:none}.topic-input:focus{border-color:rgb(37 99 235);box-shadow:0 0 0 3px rgb(37 99 235/.12)}.dark .topic-input{border-color:rgb(71 85 105);background:rgb(15 23 42);color:rgb(248 250 252)}.dark .topic-input option{background:rgb(15 23 42);color:rgb(248 250 252)}`}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>;
}
