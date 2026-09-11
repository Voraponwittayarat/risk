import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardTasks() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const canConfirm = ['admin', 'head', 'rm_committee'].includes(user?.role || '');
  useEffect(() => {
    let active = true;
    setCounts(null);
    setFailed(false);
    const token = localStorage.getItem('token');
    axios.get('/incidents/tab-counts', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(({ data }) => { if (active) setCounts(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [user?.id, attempt]);

  const tasks = [
    ...(canConfirm ? [{ title: 'ตรวจสอบและยืนยันความเสี่ยง', description: 'ตรวจข้อเท็จจริงของเรื่องใหม่ ก่อนส่งให้หน่วยงานทบทวน', to: '/incidents/pending', count: counts?.pending }] : []),
    { title: 'ทบทวนความเสี่ยงของหน่วยงาน', description: 'วิเคราะห์สาเหตุและบันทึกแนวทางป้องกันการเกิดซ้ำ', to: '/incidents/dept?tab=ตรวจสอบ', count: counts?.verified },
    { title: 'เรื่องที่ส่งกลับให้แก้ไข', description: 'ตรวจข้อเสนอแนะและปรับข้อมูลให้ครบถ้วน', to: '/incidents/dept?tab=แก้ไข', count: counts?.returnedForEdit },
  ];
  const nextTask = tasks.find((task) => (task.count ?? 0) > 0);
  return (
    <section aria-labelledby="today-tasks" className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900 dark:bg-slate-800 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">เริ่มต้นตรงนี้</p>
          <h2 id="today-tasks" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">งานที่ควรดำเนินการวันนี้</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {failed ? 'ยังโหลดจำนวนงานไม่ได้ คุณยังเปิดรายการเพื่อตรวจสอบได้' : !counts ? 'กำลังตรวจสอบงานในขอบเขตที่คุณรับผิดชอบ…' : nextTask ? `แนะนำให้เริ่มจาก “${nextTask.title}” และตรวจเรื่องเร่งด่วนก่อน` : 'ขอบคุณที่ร่วมดูแลความปลอดภัย ขณะนี้ไม่มีงานค้างในรายการด้านล่าง'}
          </p>
        </div>
        {failed && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-lg border px-4 py-2 text-sm text-blue-600 dark:text-blue-300">โหลดจำนวนงานอีกครั้ง</button>}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {tasks.map((task) => (
          <Link key={task.to} to={task.to} className={`flex flex-col rounded-xl border p-4 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 ${nextTask?.to === task.to ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{task.count === undefined ? '—' : task.count.toLocaleString()} <span className="text-xs font-normal">เรื่อง</span></span>
              {nextTask?.to === task.to && <span className="rounded-full bg-blue-600 px-2 py-1 text-xs text-white">แนะนำให้เริ่ม</span>}
            </div>
            <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{task.title}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-300">{task.description}</p>
            <span className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">เปิดรายการ <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Link to="/my-reported" className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"><CheckCircle2 className="h-4 w-4" />ติดตามความเสี่ยงของฉัน</Link>
        {(user?.teamId || user?.role === 'admin') && <Link to="/incidents/team" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200">งานทบทวนของทีม</Link>}
      </div>
    </section>
  );
}
