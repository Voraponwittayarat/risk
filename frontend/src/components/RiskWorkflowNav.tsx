import { Link } from 'react-router-dom';

const steps = [
  ['confirm', '1. ยืนยันความเสี่ยง', '/incidents/pending'],
  ['review', '2. ทบทวนหน่วยงาน', '/incidents/dept'],
  ['rca', '3. วิเคราะห์สาเหตุ / RCA', '/rca/list'],
  ['register', '4. ทะเบียนความเสี่ยง', '/reports'],
  ['capa', '5. ติดตามมาตรการ', '/capa'],
];

export default function RiskWorkflowNav({ current }: { current: string }) {
  return <nav aria-label="กระบวนการจัดการความเสี่ยง" className="print:hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
    <div className="flex gap-1 overflow-x-auto">
      {steps.map(([key, label, to]) => <Link key={key} to={to} aria-current={key === current ? 'step' : undefined}
        className={`rounded-lg whitespace-nowrap px-3 py-1.5 text-xs font-medium ${key === current ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</Link>)}
    </div>
  </nav>;
}
