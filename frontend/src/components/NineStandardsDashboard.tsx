import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { summarizeStandardDepartments } from '../utils/standardSignals';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Siren,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type Standard = {
  id: number;
  number: number;
  name: string;
  category: string | null;
  mappedCodes: string[];
  incidents: { code: string; name: string }[];
  total: number;
  withMeasures: number;
  proactive: number;
  profiles: { id: number; title: string; department: string; source: string | null }[];
};

type Priority = {
  code: string;
  name: string;
  count: number;
  previous: number;
  delta: number;
  severe: number;
  nearMiss: number;
  unsafeConditions: number;
  repeatDepartments: number;
  departments: { id: string; name: string; count: number; severe: number }[];
};

type DecisionData = {
  generatedAt: string;
  scope: string;
  period: { days: number; start: string; end: string; previousStart: string; previousEnd: string };
  priorities: Priority[];
  backlog: {
    rcaItems: { id: number; code: string | null; due: string | null; overdue: boolean }[];
    capaItems: {
      id: number;
      incidentId: number;
      code: string;
      status: string;
      due: string | null;
      overdue: boolean;
      effectivenessStatus: string;
      effectivenessDue: string | null;
      effectivenessOverdue: boolean;
    }[];
  };
  effectiveness: {
    items: { id: number; code: string; status: string; due: string | null; overdue: boolean }[];
  };
};

const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800';
const count = (values: number[]) => values.reduce((total, value) => total + value, 0);
const thaiDate = (value: string) => new Date(value).toLocaleDateString('th-TH', {
  timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric',
});

export default function NineStandardsDashboard({
  standards,
  departments,
  department,
  onDepartmentChange,
  onOpenRisk,
  refreshKey,
}: {
  standards: Standard[];
  departments: { id: number; depart_name: string }[];
  department: string;
  onDepartmentChange: (value: string) => void;
  onOpenRisk: (id: number) => void;
  refreshKey: number;
}) {
  const [days, setDays] = useState('90');
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DecisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    axios.get<DecisionData>('/incidents/reports/decision-support', {
      params: { days, department_id: department },
      signal: controller.signal,
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    }).then(response => setData(response.data))
      .catch(reason => {
        if (!axios.isCancel(reason)) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, department, refreshKey, revision]);

  const rows = useMemo(() => {
    if (!data) return [];
    return standards.map(standard => {
      const codes = new Set(standard.mappedCodes || []);
      const priorities = data.priorities.filter(item => codes.has(item.code));
      const current = count(priorities.map(item => item.count));
      const previous = count(priorities.map(item => item.previous));
      const departmentSignals = summarizeStandardDepartments(priorities);
      const rcaItems = data.backlog.rcaItems.filter(item => item.code && codes.has(item.code));
      const capaItems = data.backlog.capaItems.filter(item => codes.has(item.code));
      const effectivenessItems = data.effectiveness.items.filter(item => codes.has(item.code));
      return {
        ...standard,
        current,
        previous,
        delta: current - previous,
        severe: count(priorities.map(item => item.severe)),
        nearMiss: count(priorities.map(item => item.nearMiss)),
        unsafeConditions: count(priorities.map(item => item.unsafeConditions)),
        repeatedDepartments: departmentSignals.repeatedDepartments,
        departments: departmentSignals.departments,
        rcaPending: rcaItems.length,
        rcaOverdue: rcaItems.filter(item => item.overdue).length,
        capaPending: capaItems.length,
        capaOverdue: capaItems.filter(item => item.overdue).length,
        effective: effectivenessItems.filter(item => item.status === 'EFFECTIVE').length,
        partial: effectivenessItems.filter(item => item.status === 'PARTIALLY_EFFECTIVE').length,
        ineffective: effectivenessItems.filter(item => item.status === 'INEFFECTIVE').length,
        effectivenessPending: effectivenessItems.filter(item => !['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE'].includes(item.status)).length,
        effectivenessOverdue: effectivenessItems.filter(item => item.overdue).length,
      };
    }).sort((a, b) => b.severe - a.severe || b.rcaOverdue - a.rcaOverdue || b.capaOverdue - a.capaOverdue
      || b.delta - a.delta || b.current - a.current || a.number - b.number);
  }, [data, standards]);

  const summary = useMemo(() => ({
    incidents: count(rows.map(row => row.current)),
    severe: count(rows.map(row => row.severe)),
    nearMiss: count(rows.map(row => row.nearMiss)),
    unsafeConditions: count(rows.map(row => row.unsafeConditions)),
    rising: rows.filter(row => row.delta > 0).length,
    repeated: rows.filter(row => row.repeatedDepartments > 0).length,
    proactive: count(rows.map(row => row.proactive || 0)),
    rcaPending: count(rows.map(row => row.rcaPending)),
    overdue: count(rows.map(row => row.rcaOverdue + row.capaOverdue + row.effectivenessOverdue)),
    monitoredWithoutIncident: rows.filter(row => row.current === 0 && row.total > 0).length,
  }), [rows]);

  const maxVolume = Math.max(1, ...rows.map(row => Math.max(row.current, row.previous)));
  const attention = rows.filter(row => row.severe > 0 || row.delta > 0 || row.repeatedDepartments > 0
    || row.rcaOverdue > 0 || row.capaOverdue > 0 || row.effectivenessOverdue > 0);

  if (loading) return <div className={`${panel} p-8 text-sm text-slate-500`} role="status">กำลังคำนวณ Dashboard 9 มาตรฐานจากข้อมูลจริง…</div>;
  if (error || !data) return <div className={`${panel} p-8 text-sm text-red-700`}>โหลดข้อมูลติดตาม 9 มาตรฐานไม่สำเร็จ กรุณาลองใหม่</div>;

  return (
    <section className="space-y-5">
      <div className={`${panel} overflow-hidden`}>
        <div className="bg-slate-950 px-5 py-5 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">9 Essential Standards Monitor</p>
              <h2 className="mt-1 text-xl font-bold">ติดตามมาตรฐานสำคัญจากอุบัติการณ์ RCA และมาตรการแก้ไข</h2>
              <p className="mt-1 text-xs text-slate-300">{data.scope} · {thaiDate(data.period.start)}–{thaiDate(data.period.end)} · เทียบช่วงก่อนหน้าเท่ากัน</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={department} onChange={event => onDepartmentChange(event.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white">
                <option value="all">ทุกหน่วยงานตามสิทธิ์</option>
                {departments.map(item => <option key={item.id} value={item.id}>{item.depart_name}</option>)}
              </select>
              <select value={days} onChange={event => setDays(event.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white">
                <option value="30">30 วัน</option><option value="90">90 วัน</option><option value="180">180 วัน</option>
              </select>
              <button type="button" onClick={() => setRevision(value => value + 1)} className="rounded-lg border border-slate-600 p-2 text-slate-200 hover:bg-slate-800" aria-label="โหลดข้อมูลใหม่"><RefreshCw className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-5 dark:bg-slate-700">
          {[
            { label: 'Incident ใน 9 มาตรฐาน', value: summary.incidents, detail: `รุนแรงสูง ${summary.severe}`, icon: Activity, tone: 'text-indigo-700' },
            { label: 'Near Miss / Unsafe condition', value: summary.nearMiss + summary.unsafeConditions, detail: `Near Miss ${summary.nearMiss} · สภาวะไม่ปลอดภัย ${summary.unsafeConditions}`, icon: ShieldAlert, tone: 'text-cyan-700' },
            { label: 'Proactive Risk', value: summary.proactive, detail: 'FMEA · Safety Walkround · Proactive Risk Assessment', icon: CheckCircle2, tone: 'text-emerald-700' },
            { label: 'มาตรฐานที่ต้องเร่งติดตาม', value: attention.length, detail: `เพิ่มขึ้น ${summary.rising} · เกิดซ้ำ ${summary.repeated}`, icon: Siren, tone: attention.length ? 'text-red-700' : 'text-emerald-700' },
            { label: 'งานค้าง/เกินกำหนด', value: summary.rcaPending + count(rows.map(row => row.capaPending)), detail: `เกินกำหนด ${summary.overdue} · ไม่มี Incident ใหม่แต่ยังติดตาม ${summary.monitoredWithoutIncident}`, icon: Clock3, tone: summary.overdue ? 'text-amber-700' : 'text-emerald-700' },
          ].map(item => <div key={item.label} className="bg-white p-5 dark:bg-slate-800">
            <div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{item.value}</p></div><item.icon className={`h-5 w-5 ${item.tone}`} /></div>
            <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
          </div>)}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        จำนวนรายงานที่เพิ่มหรือลดเป็นสัญญาณให้ทบทวน ยังสรุปไม่ได้ว่าปลอดภัยขึ้นหรือลดลง ควรดูความรุนแรง Near Miss การเกิดซ้ำ ปริมาณบริการ และผลประเมินมาตรการร่วมกัน
        <p className="mt-1 text-xs">สัญญาณซ้ำ: มีรายงานรหัส NRLS เดียวกันอย่างน้อย 2 รายการในหน่วยงานเดียวกันภายในช่วงที่เลือก ยังไม่ยืนยันว่าเกิดจากสาเหตุเดียวกัน</p>
      </div>

      {attention.length > 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">ควรทบทวนก่อนการประชุม RM: {attention.slice(0, 3).map(row => `ข้อ ${row.number}`).join(', ')}</p><p className="mt-1 text-xs opacity-80">จัดลำดับจากเหตุรุนแรง งานเกินกำหนด แนวโน้มเพิ่ม และการเกิดซ้ำในหน่วยงาน</p></div></div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5" /><p>ไม่พบสัญญาณเร่งด่วนในช่วงที่เลือก ควรติดตามทะเบียนความเสี่ยงที่ยังเปิดต่อเนื่อง</p></div></div>
      )}

      <div className={`${panel} overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700"><h3 className="font-bold text-slate-900 dark:text-white">ตารางตัดสินใจ 9 มาตรฐาน</h3><p className="mt-1 text-xs text-slate-500">เรียงเรื่องที่ต้องใช้การสนับสนุนก่อน คลิกชื่อมาตรฐานเพื่อดูรหัสและทะเบียนติดตาม</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"><tr>
              <th className="p-3 text-left">มาตรฐาน</th><th className="p-3 text-center">ช่วงนี้</th><th className="p-3 text-center">แนวโน้ม</th><th className="p-3 text-center">รุนแรง</th><th className="p-3 text-center">Near Miss / สภาวะไม่ปลอดภัย</th><th className="p-3 text-center">หน่วยงานเกิดซ้ำ</th><th className="p-3 text-center">RCA ค้าง</th><th className="p-3 text-center">มาตรการค้าง</th><th className="p-3 text-left">มาตรการได้ผลหรือไม่</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map(row => <tr key={row.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                <td className="p-3"><details><summary className="cursor-pointer font-semibold text-slate-900 dark:text-white">ข้อ {row.number} · {row.name}</summary><div className="mt-2 space-y-2 text-xs text-slate-500"><p>{row.incidents.map(item => item.code).join(', ')}</p>{row.profiles.map(profile => <button type="button" key={profile.id} onClick={() => onOpenRisk(profile.id)} className="block text-left text-indigo-700 underline dark:text-indigo-300">{profile.title} · {profile.department}</button>)}</div></details></td>
                <td className="p-3 text-center"><strong className="text-lg">{row.current}</strong><div className="mx-auto mt-2 h-1.5 w-20 rounded bg-slate-100"><div className="h-1.5 rounded bg-indigo-500" style={{ width: `${(row.current / maxVolume) * 100}%` }} /></div><p className="mt-1 text-[10px] text-slate-400">ก่อนหน้า {row.previous}</p></td>
                <td className="p-3 text-center" aria-label={`จำนวนรายงานเปลี่ยนแปลง ${row.delta > 0 ? '+' : ''}${row.delta}`}>
                  {row.delta > 0 ? <span className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300"><TrendingUp className="h-4 w-4" />+{row.delta}</span> : row.delta < 0 ? <span className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300"><TrendingDown className="h-4 w-4" />{row.delta}</span> : <span className="text-slate-500">คงที่</span>}
                  <p className="mt-1 text-[10px] text-slate-500">จำนวนรายงาน</p>
                </td>
                <td className="p-3 text-center"><span className={row.severe ? 'font-bold text-red-700' : 'text-slate-500'}>{row.severe}</span></td>
                <td className="p-3 text-center">{row.nearMiss} / {row.unsafeConditions}</td>
                <td className="p-3 text-center">{row.repeatedDepartments}<p className="mt-1 text-[10px] text-slate-400">{row.departments.slice(0, 2).map(item => item.name).join(', ') || '—'}</p></td>
                <td className="p-3 text-center"><strong>{row.rcaPending}</strong>{row.rcaOverdue > 0 && <p className="text-[10px] font-bold text-red-700">เกิน {row.rcaOverdue}</p>}</td>
                <td className="p-3 text-center"><strong>{row.capaPending}</strong>{row.capaOverdue > 0 && <p className="text-[10px] font-bold text-red-700">เกิน {row.capaOverdue}</p>}</td>
                <td className="p-3 text-xs"><p className="text-emerald-700">ได้ผล {row.effective}</p><p className="text-amber-700">บางส่วน {row.partial}</p><p className="text-red-700">ไม่ได้ผล {row.ineffective}</p><p className="text-slate-500">รอประเมิน {row.effectivenessPending}{row.effectivenessOverdue ? ` · เกิน ${row.effectivenessOverdue}` : ''}</p></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...rows].sort((a, b) => a.number - b.number).map(row => {
          const measures = row.total ? Math.round((row.withMeasures / row.total) * 100) : null;
          return <article key={row.id} className={`${panel} p-4`}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">ข้อ {row.number} · {row.category || 'ยังไม่ระบุหมวด'}</p><h4 className="mt-1 font-bold text-slate-900 dark:text-white">{row.name}</h4></div><Building2 className="h-5 w-5 shrink-0 text-slate-400" /></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50"><strong className="block text-lg">{row.current}</strong>Incident</div><div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50"><strong className="block text-lg">{row.total}</strong>ทะเบียน</div><div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50"><strong className="block text-lg">{measures === null ? '—' : `${measures}%`}</strong>มีมาตรการ</div></div>
            <p className="mt-2 text-xs text-slate-500">“มีมาตรการ” หมายถึงมีข้อมูลบันทึกไว้ ผลว่าได้ผลหรือไม่ดูจากการประเมินประสิทธิผล</p>
            {row.current === 0 && row.total > 0 && <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">ยังไม่มี Incident ใหม่ แต่มีทะเบียนที่ต้องติดตามต่อ {row.total} เรื่อง</p>}
            <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">รหัส NRLS {row.incidents.length} รายการ</summary><ul className="mt-2 space-y-1 text-slate-500">{row.incidents.map(item => <li key={item.code}><span className="font-mono font-bold text-indigo-700">{item.code}</span> · {item.name}</li>)}</ul></details>
          </article>;
        })}
      </div>
    </section>
  );
}
