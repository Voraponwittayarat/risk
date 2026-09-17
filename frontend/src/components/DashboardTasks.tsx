import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardCheck, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type PersonalQueue = { returned?: number; fiscalYear: string; failed: boolean; retry: () => void };

export default function DashboardTasks({ personal }: { personal: PersonalQueue }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const canConfirm = ['head', 'rm_committee'].includes(user?.role || '');
  const canBrowseQueue = canConfirm || user?.role === 'admin';
  const scopeLabel = user?.role === 'admin' || user?.rmScope === 'hospital' ? 'ทั้งโรงพยาบาล' : user?.rmScope === 'group' ? 'กลุ่มงานที่ดูแล' : 'หน่วยงานที่ดูแล';
  useEffect(() => {
    const controller = new AbortController();
    setCounts(null);
    setFailed(false);
    if (!canBrowseQueue) return () => controller.abort();
    const token = localStorage.getItem('token');
    axios.get('/incidents/tab-counts', { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(({ data }) => { if (!controller.signal.aborted) setCounts(data); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [user?.id, user?.role, canBrowseQueue, attempt]);

  const tasks = [
    {
      title: 'รายงานของฉันที่ต้องแก้ไข', description: `เฉพาะเรื่องที่คุณรายงาน · ปีงบประมาณ ${personal.fiscalYear ? Number(personal.fiscalYear) + 543 : 'ที่เลือก'}`, to: `/my-reported?followup=returned&fiscalYear=${encodeURIComponent(personal.fiscalYear)}`, count: personal.returned,
      icon: RotateCcw, cardClass: 'border-rose-200 border-l-rose-500 bg-rose-50/80 dark:border-rose-900 dark:border-l-rose-500 dark:bg-rose-950/25',
      iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300', linkClass: 'text-rose-700 dark:text-rose-300',
    },
    ...(canBrowseQueue ? [{
      title: canConfirm ? 'ตรวจสอบและยืนยันความเสี่ยง' : 'เปิดดูเรื่องรอยืนยัน', description: `${scopeLabel} · ตรวจข้อเท็จจริงและสิทธิ์ดำเนินการในแต่ละเรื่อง`, to: '/incidents/pending', count: counts?.pending,
      icon: ShieldCheck, cardClass: 'border-amber-200 border-l-amber-500 bg-amber-50/80 dark:border-amber-900 dark:border-l-amber-500 dark:bg-amber-950/25',
      iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300', linkClass: 'text-amber-700 dark:text-amber-300',
    },
    {
      title: canConfirm ? 'ทบทวนเรื่องที่ยืนยันแล้ว' : 'เปิดดูเรื่องรอทบทวน', description: `${scopeLabel} · วิเคราะห์สาเหตุและแนวทางป้องกัน`, to: '/incidents/dept?tab=ตรวจสอบ', count: counts?.verified,
      icon: ClipboardCheck, cardClass: 'border-blue-200 border-l-blue-500 bg-blue-50/80 dark:border-blue-900 dark:border-l-blue-500 dark:bg-blue-950/25',
      iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300', linkClass: 'text-blue-700 dark:text-blue-300',
    },
    {
      title: 'ติดตามเรื่องที่ส่งกลับในขอบเขตดูแล', description: `${scopeLabel} · อาจเป็นรายงานของผู้อื่น`, to: '/incidents/dept?tab=แก้ไข', count: counts?.returnedForEdit,
      icon: RotateCcw, cardClass: 'border-rose-200 border-l-rose-500 bg-rose-50/80 dark:border-rose-900 dark:border-l-rose-500 dark:bg-rose-950/25',
      iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300', linkClass: 'text-rose-700 dark:text-rose-300',
    }] : []),
  ];
  const nextTask = tasks.find((task) => (task.count ?? 0) > 0);
  const incomplete = tasks.some(task => task.count === undefined);
  return (
    <section aria-labelledby="today-tasks" className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-white p-4 shadow-sm dark:border-blue-900 dark:from-blue-950/20 dark:to-slate-800 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">เริ่มต้นตรงนี้</p>
          <h2 id="today-tasks" className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">งานที่ฉันต้องทำต่อ</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
            {failed || personal.failed ? 'โหลดจำนวนงานบางส่วนไม่สำเร็จ ยังเปิดรายการเพื่อตรวจสอบได้' : incomplete ? 'กำลังตรวจสอบงานในขอบเขตที่คุณรับผิดชอบ…' : nextTask ? `เปิด “${nextTask.title}” เพื่อดูรายละเอียดและขั้นตอนถัดไป` : 'ไม่มีงานในรายการที่นับด้านล่าง ยังติดตามงานทีมและมาตรการได้ตามสิทธิ์ของคุณ'}
          </p>
          <p className="mt-1 text-xs text-slate-500">รายการช่วยเริ่มงาน ไม่ใช่การจัดลำดับความเร่งด่วนทางคลินิก · งานในขอบเขตดูแลนับทุกปี ส่วนรายงานของฉันใช้ปีงบประมาณที่เลือก</p>
        </div>
        {failed && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-lg border px-4 py-2 text-sm text-blue-600 dark:text-blue-300">โหลดจำนวนงานอีกครั้ง</button>}
        {personal.failed && <button type="button" onClick={personal.retry} className="rounded-lg border px-4 py-2 text-sm text-blue-600 dark:text-blue-300">โหลดงานของฉันอีกครั้ง</button>}
      </div>
      <div className="mt-4 grid gap-2.5 md:grid-cols-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
          <Link key={task.to} to={task.to} className={`flex flex-col rounded-xl border border-l-4 p-3 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 ${task.cardClass} ${nextTask?.to === task.to ? 'ring-2 ring-blue-500/40' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`rounded-lg p-2 ${task.iconClass}`}><Icon className="h-4 w-4" /></span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{task.count === undefined ? '—' : task.count.toLocaleString()} <span className="text-[11px] font-normal">เรื่อง</span></span>
              </div>
              {nextTask?.to === task.to && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">มีงานรอ</span>}
            </div>
            <h3 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">{task.title}</h3>
            <p className="mt-0.5 flex-1 text-xs text-slate-600 dark:text-slate-300">{task.description}</p>
            <span className={`mt-2.5 flex items-center gap-1.5 text-xs font-semibold ${task.linkClass}`}>เปิดรายการ <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-blue-100 pt-3 dark:border-slate-700">
        <Link to="/my-reported" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />ติดตามความเสี่ยงของฉัน</Link>
        {(user?.teamId || user?.role === 'admin') && <Link to="/incidents/team" className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300">งานทบทวนของทีม</Link>}
        {user?.role === 'rm_committee' && user.rmScope === 'hospital' && <Link to="/capa" className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300">ติดตามมาตรการและกำหนดประเมินผล</Link>}
      </div>
    </section>
  );
}
