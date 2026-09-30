import { Link } from 'react-router-dom';

const steps = [
  ['confirm', '1. ยืนยันความเสี่ยง', '/incidents/pending'],
  ['review', '2. ทบทวนหน่วยงาน', '/incidents/dept'],
  ['rca', '3. วิเคราะห์สาเหตุ / RCA', '/rca/list'],
  ['capa', '4. ติดตามมาตรการ', '/capa'],
  ['register', '5. ทะเบียนความเสี่ยง', '/reports'],
];

export default function RiskWorkflowNav({ current }: { current: string }) {
  return <nav aria-label="กระบวนการจัดการความเสี่ยง" className="print:hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
    <div className="flex flex-wrap gap-1">
      {steps.map(([key, label, to]) => <Link key={key} to={to} aria-current={key === current ? 'step' : undefined}
        className={`rounded-lg px-3 py-2 text-sm font-medium ${key === current ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</Link>)}
    </div>
    <p className="px-3 pt-1 text-xs text-slate-500">เลือกขั้นตอนเพื่อดูรายการในขอบเขตสิทธิ์ของคุณ • เปิดเหตุการณ์เดิมเพื่อทบทวนหรือทำ RCA ต่อได้</p>
  </nav>;
}
