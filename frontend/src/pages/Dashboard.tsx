import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Building2, CheckCircle2, ClipboardList, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DashboardTasks from '../components/DashboardTasks';
import { reviewDue } from '../utils/riskReviewDue';

type Notice = { key: string; title: string; reason: string; relation: string; due?: string; to: string; priority: number };
const day = (value: Date) => value.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const dueSoon = (value?: string) => !!value && Number.isFinite(Date.parse(value)) && new Date(value).getTime() <= Date.now() + 30 * 86400000;

export default function Dashboard() {
  const { user } = useAuth();
  const [risks, setRisks] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<'mine' | 'department' | 'hospital'>('mine');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setErrors([]); setRisks([]); setActions([]); setPersonal(null);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` };
    Promise.allSettled([
      axios.get('/risk-analysis', { headers, signal: controller.signal }),
      axios.get('/capa', { headers, signal: controller.signal }),
      axios.get('/incidents/my-reported', { headers, signal: controller.signal, params: { summary: 'true' } }),
    ]).then(results => {
      if (controller.signal.aborted) return;
      const labels = ['ทะเบียนความเสี่ยง', 'มาตรการ', 'รายงานของฉัน'];
      const setters = [setRisks, setActions, setPersonal];
      const failed: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') setters[index](result.value.data);
        else failed.push(labels[index]);
      });
      setErrors(failed); setLoading(false);
    });
    return () => controller.abort();
  }, [user?.id, attempt]);

  const departments = [user?.department_id, user?.department_id2].filter(Boolean).map(String);
  const ownName = (user?.name || '').trim().normalize('NFC');
  const isOwner = (risk: any) => !!ownName && String(risk.risk_owner_name || '').trim().normalize('NFC') === ownName;
  const openRisks = risks.filter(r => r.status !== 'closed');
  const myRisks = openRisks.filter(isOwner);
  const unitRisks = openRisks.filter(r => r.scope_level !== 'hospital' && departments.includes(String(r.department_id)));
  const hospitalRisks = openRisks.filter(r => r.scope_level === 'hospital');
  const myActions = actions.filter(a => !['CLOSED', 'CANCELLED'].includes(a.status) && Number(a.responsible_user_id) === user?.id);
  const unitActions = actions.filter(a => !['CLOSED', 'CANCELLED'].includes(a.status) && departments.includes(String(a.responsible_department_id)));
  const visibleRisks = view === 'mine' ? myRisks : view === 'department' ? unitRisks : hospitalRisks;
  const visibleActions = view === 'mine' ? myActions : view === 'department' ? unitActions : [];
  const notices: Notice[] = [
    ...visibleRisks.filter(r => dueSoon(r.next_review_date) || !r.next_review_date).map(r => ({
      key: `risk-${r.id}`, title: r.risk_title, reason: reviewDue(r.next_review_date).label,
      relation: isOwner(r) ? 'คุณเป็น Risk Owner (ตามชื่อที่บันทึก)' : r.scope_level === 'hospital' ? 'ทะเบียนระดับโรงพยาบาล' : 'ความเสี่ยงของหน่วยงานคุณ',
      due: r.next_review_date, to: `/reports?view=register&scope=${r.scope_level === 'hospital' ? 'hospital' : 'department'}&risk=${r.id}`,
      priority: !r.next_review_date ? 3 : day(new Date(r.next_review_date)) < day(new Date()) ? 0 : 2,
    })),
    ...visibleActions.filter(a => a.is_overdue || dueSoon(a.active_sla?.due_at || a.due_date) || ['IMPLEMENTED', 'AWAITING_EFFECTIVENESS', 'REWORK'].includes(a.status) || ['INEFFECTIVE', 'REVIEW_REQUIRED'].includes(a.effectiveness_status)).map(a => ({
      key: `action-${a.id}`, title: a.action,
      reason: a.is_overdue ? 'มาตรการเกินกำหนด' : ['INEFFECTIVE', 'REVIEW_REQUIRED'].includes(a.effectiveness_status) ? 'ผลมาตรการต้องทบทวนเพิ่มเติม' : ['IMPLEMENTED', 'AWAITING_EFFECTIVENESS'].includes(a.status) ? 'ต้องประเมินประสิทธิผลมาตรการ' : a.status === 'REWORK' ? 'มาตรการถูกส่งกลับแก้ไข' : 'มาตรการใกล้ถึงกำหนด',
      relation: Number(a.responsible_user_id) === user?.id ? 'คุณรับผิดชอบมาตรการ' : 'มาตรการของหน่วยงานคุณ',
      due: a.active_sla?.due_at || a.due_date, to: `/capa?action=${a.id}`, priority: a.is_overdue ? 0 : 1,
    })),
  ].sort((a, b) => a.priority - b.priority || (Date.parse(a.due || '') || Infinity) - (Date.parse(b.due || '') || Infinity));
  const nextReview = [...visibleRisks].filter(r => r.next_review_date).sort((a,b) => Date.parse(a.next_review_date) - Date.parse(b.next_review_date))[0];
  return <div className="space-y-5 pb-12">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Risk Register · ติดตามอย่างต่อเนื่อง</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">ความเสี่ยงและงานติดตามของคุณ</h1><p className="mt-2 text-sm text-slate-500">{user?.name} · {user?.department_name || user?.departmentName || 'หน่วยงานตามสิทธิ์'}</p></div>
      <Link to="/incidents/new" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4"/>รายงานความเสี่ยง</Link>
    </header>
    <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm dark:border-teal-900 dark:bg-slate-900 sm:p-6" aria-labelledby="risk-followups">
      <div className="flex items-start justify-between gap-3"><div><h2 id="risk-followups" className="flex items-center gap-2 text-lg font-bold dark:text-white"><Bell className="h-5 w-5 text-teal-600"/>เรื่องที่ต้องติดตาม</h2><p className="mt-1 text-xs text-slate-500">ติดตามตามวันนัดและผลมาตรการ แม้ไม่มีอุบัติการณ์ใหม่</p></div><button aria-label="โหลดงานติดตามใหม่" disabled={loading} onClick={() => setAttempt(a => a+1)} className="rounded-lg border p-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button></div>
      <div role="group" aria-label="มุมมองงานติดตาม" className="mt-4 flex flex-wrap gap-2">{([['mine','งานของฉัน'],['department','หน่วยงานฉัน'],['hospital','โรงพยาบาล']] as const).map(([key,label]) => <button key={key} aria-pressed={view===key} onClick={() => setView(key)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view===key ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{label}</button>)}</div>
      {loading ? <p role="status" className="py-8 text-sm text-slate-500">กำลังตรวจสอบงานติดตาม…</p> : <>
        {!!errors.length && <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">โหลด {errors.join(', ')} ไม่สำเร็จ กรุณากดโหลดใหม่ จำนวนงานอาจยังไม่ครบ</div>}
        {!!notices.length ? <div className="mt-4 space-y-3">{notices.slice(0,5).map(n => <Link key={n.key} to={n.to} className="block rounded-xl border border-slate-200 p-4 transition hover:border-teal-400 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-900 dark:text-white">{n.title}</h3><ArrowRight className="h-4 w-4 shrink-0 text-teal-600"/></div><p className="mt-2 text-xs text-slate-500">{n.relation}</p><p className={`mt-2 text-sm font-semibold ${n.priority===0 ? 'text-red-700' : 'text-amber-700'}`}>{n.reason}</p>{n.due && <p className="mt-1 text-xs text-slate-500">กำหนด {new Date(n.due).toLocaleDateString('th-TH', {timeZone:'Asia/Bangkok'})}</p>}<span className="mt-3 inline-block text-xs font-bold text-teal-700">{n.key.startsWith('risk') ? 'เปิดทะเบียนและบันทึกติดตาม' : 'เปิดมาตรการและดำเนินการต่อ'}</span></Link>)}{notices.length>5 && <p className="text-xs text-slate-500">แสดง 5 เรื่องจากงานติดตาม {notices.length} เรื่อง เปิดทะเบียนหรือมาตรการด้านล่างเพื่อดูทั้งหมด</p>}</div> : !errors.length && <div className="mt-4 rounded-xl bg-teal-50 p-5 text-teal-900 dark:bg-teal-950 dark:text-teal-100"><CheckCircle2 className="mb-2 h-6 w-6"/><p className="font-semibold">ไม่มีงานติดตามถึงกำหนดในมุมมองนี้</p>{nextReview && <p className="mt-2 text-sm">รอบถัดไป: {new Date(nextReview.next_review_date).toLocaleDateString('th-TH')} · {nextReview.risk_title}</p>}<p className="mt-2 text-xs">ยังเปิดทะเบียนเพื่อดูความเสี่ยงที่เฝ้าระวังต่อเนื่องได้</p></div>}
        <div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs text-slate-500"><span>ความเสี่ยงที่ยังติดตาม {visibleRisks.length} เรื่อง</span><span>มาตรการที่ยังเปิด {visibleActions.length} รายการ</span></div>
      </>}
    </section>
    <div className="grid gap-3 sm:grid-cols-3">{[
      {to:'/reports?view=register&scope=department', title:'ทะเบียนหน่วยงานฉัน', detail:'มาตรการและผลติดตามของหน่วยงาน', icon:Building2},
      {to:'/reports?view=register&scope=hospital', title:'ทะเบียนโรงพยาบาล', detail:'ความเสี่ยงสำคัญที่ติดตามร่วมกัน', icon:ShieldCheck},
      {to:'/capa', title:'ติดตามมาตรการ', detail:'ความคืบหน้า หลักฐาน และประสิทธิผล', icon:ClipboardList},
    ].map(x => <Link key={x.to} to={x.to} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><x.icon className="h-5 w-5 text-teal-600"/><h2 className="mt-2 font-bold dark:text-white">{x.title}</h2><p className="mt-1 text-xs text-slate-500">{x.detail}</p></Link>)}</div>
    <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><summary className="cursor-pointer font-semibold dark:text-white">งานรายงานและทบทวนอุบัติการณ์</summary><div className="mt-4"><DashboardTasks personal={{ returned: personal?.returnedForEdit, fiscalYear: String(personal?.selectedFiscalYear || ''), failed: errors.includes('รายงานของฉัน'), retry: () => setAttempt(a=>a+1) }}/></div></details>
    <nav aria-label="รายงานและข้อมูลเพิ่มเติม" className="flex flex-wrap gap-3 text-sm text-teal-700 dark:text-teal-300"><Link to="/my-reported">รายงานที่ฉันส่ง</Link><Link to="/reports?view=insights">วิเคราะห์แนวโน้มความเสี่ยง</Link><Link to="/reporting-stats">สถิติและตัวชี้วัดการรายงาน</Link></nav>
  </div>;
}
