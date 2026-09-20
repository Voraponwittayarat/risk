import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import DepartmentResponseMonitor from '../components/DepartmentResponseMonitor';

type Sla = {
  id: number;
  workflow_stage: string;
  due_at: string;
  status: string;
  escalation_level: number;
};

type EffectivenessReview = {
  id: number;
  review_date: string;
  result: string;
  observation: string;
  measured_value?: string | null;
  reviewer_role?: string | null;
};

type Capa = {
  id: number;
  incident_id: number;
  source_type: string;
  action: string;
  action_type: string;
  responsible_display_name?: string | null;
  responsible_department_id?: string | null;
  due_date?: string | null;
  status: string;
  evidence?: string | null;
  effectiveness_criteria?: string | null;
  baseline_value?: string | null;
  target_value?: string | null;
  effectiveness_due_date?: string | null;
  effectiveness_status: string;
  approval_status: string;
  revision: number;
  escalation_level: number;
  is_overdue: boolean;
  overdue_hours: number;
  active_sla?: Sla | null;
  effectiveness_reviews?: EffectivenessReview[];
  incident?: {
    level_id?: string;
    nrls_code?: string;
    nrls_name_snapshot?: string;
    status_risk?: string;
    improvement_status?: string;
  } | null;
};

const statusLabel: Record<string, string> = {
  PENDING: 'รอเริ่มดำเนินการ',
  IN_PROGRESS: 'กำลังดำเนินการ',
  IMPLEMENTED: 'ดำเนินมาตรการแล้ว',
  AWAITING_EFFECTIVENESS: 'รอประเมินประสิทธิผล',
  AWAITING_APPROVAL: 'รอ RM อนุมัติปิด',
  REWORK: 'ส่งกลับแก้ไข',
  CLOSED: 'ปิดวงจรแล้ว',
  CANCELLED: 'ยกเลิก',
};

const statusClass: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IMPLEMENTED: 'bg-indigo-100 text-indigo-700',
  AWAITING_EFFECTIVENESS: 'bg-violet-100 text-violet-700',
  AWAITING_APPROVAL: 'bg-amber-100 text-amber-800',
  REWORK: 'bg-rose-100 text-rose-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const isoDate = (value?: string | null) => value ? value.slice(0, 10) : '';
const thaiDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
  : '-';

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join('\n') : message || 'ไม่สามารถดำเนินการได้';
  }
  return 'ไม่สามารถดำเนินการได้';
}

export default function CapaWorkspace() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Capa[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [due, setDue] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({
    evidence: '', effectiveness_criteria: '', baseline_value: '', target_value: '',
    due_date: '', effectiveness_due_date: '',
  });
  const [effectiveness, setEffectiveness] = useState({
    review_date: new Date().toISOString().slice(0, 10), result: 'EFFECTIVE', measured_value: '', observation: '', evidence: '',
  });
  const [createForm, setCreateForm] = useState({
    incident_id: '', action: '', action_type: 'CORRECTIVE', responsible_department_id: '',
    responsible_display_name: '', due_date: '', effectiveness_criteria: '', baseline_value: '',
    target_value: '', effectiveness_due_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get<Capa[]>('/capa', { params: { status: status || undefined, due: due || undefined } });
      setRows(response.data);
      setSelectedId((current) => current && response.data.some((row) => row.id === current)
        ? current
        : response.data[0]?.id || null);
    } catch (error) {
      void Swal.fire('โหลดข้อมูลไม่สำเร็จ', errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [status, due]);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) || null, [rows, selectedId]);
  useEffect(() => {
    if (!selected) return;
    setProgress({
      evidence: selected.evidence || '',
      effectiveness_criteria: selected.effectiveness_criteria || '',
      baseline_value: selected.baseline_value || '',
      target_value: selected.target_value || '',
      due_date: isoDate(selected.due_date),
      effectiveness_due_date: isoDate(selected.effectiveness_due_date),
    });
  }, [selected]);

  const patchProgress = async (nextStatus?: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await axios.patch(`/capa/${selected.id}/progress`, { ...progress, status: nextStatus });
      await load();
      void Swal.fire({ icon: 'success', title: 'บันทึกมาตรการแล้ว', timer: 1300, showConfirmButton: false });
    } catch (error) {
      void Swal.fire('บันทึกไม่สำเร็จ', errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitEffectiveness = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await axios.post(`/capa/${selected.id}/effectiveness-reviews`, {
        ...effectiveness,
        followup_required: effectiveness.result !== 'EFFECTIVE',
      });
      await load();
      setEffectiveness((current) => ({ ...current, measured_value: '', observation: '', evidence: '' }));
      void Swal.fire({ icon: 'success', title: 'บันทึกผลประเมินแล้ว', timer: 1300, showConfirmButton: false });
    } catch (error) {
      void Swal.fire('ประเมินไม่สำเร็จ', errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const decideClosure = async (decision: 'APPROVE' | 'RETURN') => {
    if (!selected) return;
    let note = '';
    if (decision === 'RETURN') {
      const result = await Swal.fire({ title: 'เหตุผลที่ส่งกลับ', input: 'textarea', inputAttributes: { minlength: '10' }, showCancelButton: true });
      if (!result.isConfirmed) return;
      note = String(result.value || '');
    }
    try {
      await axios.post(`/capa/${selected.id}/closure-decision`, { decision, note: note || undefined });
      await load();
      void Swal.fire('บันทึกแล้ว', decision === 'APPROVE' ? 'ปิดการติดตามมาตรการเรียบร้อยแล้ว' : 'ส่งกลับให้ผู้รับผิดชอบแก้ไขแล้ว', 'success');
    } catch (error) {
      void Swal.fire('ดำเนินการไม่สำเร็จ', errorMessage(error), 'error');
    }
  };

  const createCapa = async () => {
    setSaving(true);
    try {
      await axios.post('/capa', { ...createForm, incident_id: Number(createForm.incident_id) });
      setShowCreate(false);
      await load();
      void Swal.fire('สร้างมาตรการแล้ว', 'มาตรการเข้าสู่ระบบติดตามระยะเวลาดำเนินการ', 'success');
    } catch (error) {
      void Swal.fire('สร้างมาตรการไม่สำเร็จ', errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => ({
    open: rows.filter((row) => !['CLOSED', 'CANCELLED'].includes(row.status)).length,
    overdue: rows.filter((row) => row.is_overdue).length,
    awaiting: rows.filter((row) => ['IMPLEMENTED', 'AWAITING_EFFECTIVENESS', 'AWAITING_APPROVAL'].includes(row.status)).length,
    closed: rows.filter((row) => row.status === 'CLOSED').length,
  }), [rows]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2"><ClipboardCheck className="text-violet-600" /><h1 className="text-2xl font-black text-slate-900">ศูนย์ติดตามมาตรการแก้ไขและป้องกัน</h1></div>
          <p className="mt-1 text-sm text-slate-500">สำหรับ RM โรงพยาบาล • ติดตามการทบทวนความเสี่ยงและมาตรการแก้ไข</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><RefreshCw size={18} /></button>
          {user?.role !== 'admin' && <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"><Plus size={18} />สร้างมาตรการนอก RCA</button>}
        </div>
      </div>

      <DepartmentResponseMonitor />

      <h2 className="text-lg font-bold text-slate-900">ติดตามมาตรการแก้ไขและป้องกัน</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'กำลังติดตาม', value: totals.open, Icon: Clock3, color: 'text-blue-600' },
          { label: 'เกิน SLA', value: totals.overdue, Icon: AlertTriangle, color: 'text-rose-600' },
          { label: 'รอพิสูจน์/อนุมัติ', value: totals.awaiting, Icon: ShieldCheck, color: 'text-amber-600' },
          { label: 'ปิดวงจร', value: totals.closed, Icon: CheckCircle2, color: 'text-emerald-600' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon className={color} size={20} /><div className="mt-2 text-2xl font-black">{value}</div><div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">ทุกสถานะ</option>
          {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={due} onChange={(event) => setDue(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">ทุกกำหนดเวลา</option><option value="overdue">เกิน SLA</option><option value="soon">ครบกำหนดใน 7 วัน</option>
        </select>
        {user?.role === 'admin' && <span className="self-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">Admin ดูข้อมูลได้ แต่ไม่มีสิทธิ์ตัดสินใจทางคลินิก</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {loading && <div className="rounded-2xl bg-white p-8 text-center text-slate-500">กำลังโหลด...</div>}
          {!loading && rows.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">ไม่พบมาตรการที่ต้องติดตามในขอบเขตของคุณ</div>}
          {rows.map((row) => (
            <button key={row.id} onClick={() => setSelectedId(row.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === row.id ? 'border-violet-400 bg-violet-50 shadow-sm' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
              <div className="flex items-start justify-between gap-3"><span className="text-xs font-bold text-slate-500">มาตรการ #{row.id} · อุบัติการณ์ #{row.incident_id}</span>{row.is_overdue && <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">เกินกำหนด {row.overdue_hours} ชม.</span>}</div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{row.action}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass[row.status] || 'bg-slate-100'}`}>{statusLabel[row.status] || row.status}</span><span className="text-[11px] text-slate-500">ครบกำหนด {thaiDate(row.due_date)}</span></div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div><div className="text-xs font-bold text-violet-600">{selected.source_type === 'NON_RCA' ? 'มาตรการนอกกระบวนการ RCA' : `มาตรการจากเอกสาร RCA: ${selected.source_type}`}</div><h2 className="mt-1 text-lg font-black text-slate-900">{selected.action}</h2></div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass[selected.status] || 'bg-slate-100'}`}>{statusLabel[selected.status] || selected.status}</span>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Owner</div><div className="mt-1 font-bold">{selected.responsible_display_name || '-'}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">SLA ปัจจุบัน</div><div className={`mt-1 font-bold ${selected.is_overdue ? 'text-rose-600' : ''}`}>{selected.active_sla ? `${selected.active_sla.workflow_stage} · ${thaiDate(selected.active_sla.due_at)}` : 'ไม่มี SLA ที่เปิดอยู่'}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Escalation</div><div className="mt-1 font-bold">ระดับ {selected.escalation_level || 0}</div></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">หลักฐานการดำเนินงาน<textarea value={progress.evidence} onChange={(event) => setProgress({ ...progress, evidence: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">เกณฑ์ประเมินประสิทธิผล<textarea value={progress.effectiveness_criteria} onChange={(event) => setProgress({ ...progress, effectiveness_criteria: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">Baseline<input value={progress.baseline_value} onChange={(event) => setProgress({ ...progress, baseline_value: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">Target<input value={progress.target_value} onChange={(event) => setProgress({ ...progress, target_value: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">กำหนดดำเนินการ<input type="date" value={progress.due_date} onChange={(event) => setProgress({ ...progress, due_date: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">กำหนดประเมินผล<input type="date" value={progress.effectiveness_due_date} onChange={(event) => setProgress({ ...progress, effectiveness_due_date: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal" /></label>
            </div>

            {!['CLOSED', 'AWAITING_EFFECTIVENESS', 'IMPLEMENTED', 'AWAITING_APPROVAL'].includes(selected.status) && user?.role !== 'admin' && (
              <div className="flex flex-wrap justify-end gap-2">
                <button disabled={saving} onClick={() => void patchProgress()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold">บันทึกรายละเอียด</button>
                {['PENDING', 'REWORK'].includes(selected.status) && <button disabled={saving} onClick={() => void patchProgress('IN_PROGRESS')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">เริ่มดำเนินการ</button>}
                {selected.status === 'IN_PROGRESS' && <button disabled={saving} onClick={() => void patchProgress('IMPLEMENTED')} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">ยืนยันดำเนินมาตรการแล้ว</button>}
              </div>
            )}

            {['IMPLEMENTED', 'AWAITING_EFFECTIVENESS'].includes(selected.status) && user?.role !== 'admin' && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <h3 className="font-black text-violet-900">Effectiveness review (ต้องเป็นผู้ทบทวนอิสระ)</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="date" value={effectiveness.review_date} onChange={(event) => setEffectiveness({ ...effectiveness, review_date: event.target.value })} className="rounded-xl border border-violet-200 p-2.5" />
                  <select value={effectiveness.result} onChange={(event) => setEffectiveness({ ...effectiveness, result: event.target.value })} className="rounded-xl border border-violet-200 p-2.5"><option value="EFFECTIVE">Effective</option><option value="PARTIALLY_EFFECTIVE">Partially effective</option><option value="INEFFECTIVE">Ineffective</option></select>
                  <input placeholder="ค่าที่วัดได้" value={effectiveness.measured_value} onChange={(event) => setEffectiveness({ ...effectiveness, measured_value: event.target.value })} className="rounded-xl border border-violet-200 p-2.5" />
                  <input placeholder="หลักฐานประกอบ" value={effectiveness.evidence} onChange={(event) => setEffectiveness({ ...effectiveness, evidence: event.target.value })} className="rounded-xl border border-violet-200 p-2.5" />
                  <textarea placeholder="ผลการสังเกต/เหตุผล อย่างน้อย 10 ตัวอักษร" value={effectiveness.observation} onChange={(event) => setEffectiveness({ ...effectiveness, observation: event.target.value })} className="min-h-24 rounded-xl border border-violet-200 p-2.5 md:col-span-2" />
                </div>
                <button disabled={saving} onClick={() => void submitEffectiveness()} className="mt-3 rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">บันทึกผลประเมิน</button>
              </div>
            )}

            {selected.status === 'AWAITING_APPROVAL' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-black text-amber-900">ผลประเมินมีประสิทธิผล — รอ RM อนุมัติปิด</h3>
                {user?.role === 'rm_committee' && <div className="mt-3 flex gap-2"><button onClick={() => void decideClosure('APPROVE')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">อนุมัติปิดการติดตาม</button><button onClick={() => void decideClosure('RETURN')} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700">ส่งกลับแก้ไข</button></div>}
              </div>
            )}

            {selected.effectiveness_reviews && selected.effectiveness_reviews.length > 0 && <div><h3 className="mb-2 font-black">ประวัติ Effectiveness review</h3><div className="space-y-2">{selected.effectiveness_reviews.map((review) => <div key={review.id} className="rounded-xl border border-slate-200 p-3 text-sm"><div className="flex justify-between"><span className="font-bold">{review.result} · {review.reviewer_role || 'Reviewer'}</span><span className="text-slate-500">{thaiDate(review.review_date)}</span></div><p className="mt-1 text-slate-600">{review.observation}</p></div>)}</div></div>}
          </div>
        ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">เลือกมาตรการเพื่อดูรายละเอียด</div>}
      </div>

      {showCreate && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">สร้างมาตรการนอกกระบวนการ RCA</h2><button onClick={() => setShowCreate(false)}><X /></button></div><div className="mt-4 grid gap-3 md:grid-cols-2">
        <input required type="number" placeholder="Incident ID" value={createForm.incident_id} onChange={(event) => setCreateForm({ ...createForm, incident_id: event.target.value })} className="rounded-xl border border-slate-200 p-3" />
        <select value={createForm.action_type} onChange={(event) => setCreateForm({ ...createForm, action_type: event.target.value })} className="rounded-xl border border-slate-200 p-3"><option value="CORRECTIVE">Corrective action</option><option value="PREVENTIVE">Preventive action</option></select>
        <textarea placeholder="มาตรการ (อย่างน้อย 10 ตัวอักษร)" value={createForm.action} onChange={(event) => setCreateForm({ ...createForm, action: event.target.value })} className="min-h-24 rounded-xl border border-slate-200 p-3 md:col-span-2" />
        <input placeholder="รหัสหน่วยงานรับผิดชอบ" value={createForm.responsible_department_id} onChange={(event) => setCreateForm({ ...createForm, responsible_department_id: event.target.value })} className="rounded-xl border border-slate-200 p-3" />
        <input placeholder="ชื่อผู้/หน่วยรับผิดชอบ" value={createForm.responsible_display_name} onChange={(event) => setCreateForm({ ...createForm, responsible_display_name: event.target.value })} className="rounded-xl border border-slate-200 p-3" />
        <label className="text-xs font-bold text-slate-600">กำหนดดำเนินการ<input type="date" value={createForm.due_date} onChange={(event) => setCreateForm({ ...createForm, due_date: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
        <label className="text-xs font-bold text-slate-600">กำหนดประเมินผล<input type="date" value={createForm.effectiveness_due_date} onChange={(event) => setCreateForm({ ...createForm, effectiveness_due_date: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>
        <textarea placeholder="เกณฑ์ประเมินประสิทธิผล" value={createForm.effectiveness_criteria} onChange={(event) => setCreateForm({ ...createForm, effectiveness_criteria: event.target.value })} className="min-h-20 rounded-xl border border-slate-200 p-3 md:col-span-2" />
        <input placeholder="Baseline" value={createForm.baseline_value} onChange={(event) => setCreateForm({ ...createForm, baseline_value: event.target.value })} className="rounded-xl border border-slate-200 p-3" />
        <input placeholder="Target" value={createForm.target_value} onChange={(event) => setCreateForm({ ...createForm, target_value: event.target.value })} className="rounded-xl border border-slate-200 p-3" />
      </div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2">ยกเลิก</button><button disabled={saving} onClick={() => void createCapa()} className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">สร้างและเริ่ม SLA</button></div></div></div>}
    </div>
  );
}
