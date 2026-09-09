import { useEffect, useState } from 'react';
import axios from 'axios';

type DepartmentResponse = {
  department_id: string;
  department_name: string;
  total: number;
  responded: number;
  pending: number;
  overdue: number;
  average_hours: number | null;
  median_hours: number | null;
  on_time_percent: number | null;
  longest_wait_hours: number | null;
};
type Summary = { rows: DepartmentResponse[]; generated_at: string; invalid_records: number; unassigned_records: number };
const hours = (value: number | null) => value === null ? '—' : `${value.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.`;

export default function DepartmentResponseMonitor() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('overdue');
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    axios.get<Summary>('/capa/department-response', {
      params: { from: from || undefined, to: to || undefined }, signal: controller.signal,
    }).then(({ data: result }) => setData(result)).catch((reason) => {
      if (!controller.signal.aborted) setError(reason.response?.data?.message || 'โหลดข้อมูลการตอบสนองไม่สำเร็จ กรุณาลองใหม่');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [from, to, refresh]);
  const rows = [...(data?.rows || [])].sort((a, b) => {
    if (sort === 'name') return a.department_name.localeCompare(b.department_name, 'th');
    const key = sort as 'overdue' | 'average_hours' | 'longest_wait_hours';
    return (b[key] ?? -1) - (a[key] ?? -1) || a.department_name.localeCompare(b.department_name, 'th');
  });
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
    <div>
      <h2 className="text-lg font-bold text-slate-900">ระยะเวลาตอบสนองแยกตามหน่วยงาน{data ? ` (${data.rows.length} หน่วยงาน)` : ''}</h2>
      <p className="mt-1 text-sm text-slate-600">นับจากเริ่มส่งทบทวนให้หน่วยงาน จนหน่วยงานบันทึกผลทบทวนครั้งแรกในรอบนั้น ตามเวลาที่ระบบบันทึก (ชั่วโมงปฏิทิน)</p>
      <p className="mt-1 text-xs text-slate-500">ใช้รอบ SLA ล่าสุดของแต่ละเรื่องที่มีข้อมูลในระบบเท่านั้น เรื่องเก่าที่ไม่มี SLA ไม่รวมในสถิติ • ค่าเฉลี่ยและมัธยฐานคิดเฉพาะเรื่องที่ตอบแล้ว • ตรงเวลาวัดตามกำหนด SLA ของแต่ละเรื่อง</p>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">เริ่มส่งทบทวนตั้งแต่<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm">ถึงวันที่<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm">เรียงตาม<select value={sort} onChange={e => setSort(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 p-2">
        <option value="overdue">เรื่องรอเกินกำหนดมากที่สุด</option><option value="average_hours">ตอบสนองเฉลี่ยช้าที่สุด</option><option value="longest_wait_hours">รอตอบนานที่สุด</option><option value="name">ชื่อหน่วยงาน</option>
      </select></label>
      <button onClick={() => setRefresh(value => value + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">รีเฟรชสถิติ</button>
    </div>
    {loading ? <p role="status" className="p-4 text-slate-500">กำลังโหลดสถิติ...</p> : error ? <p role="alert" className="p-4 text-rose-700">{error}</p> : <>
      <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-3 text-sm">
        <span>เรื่องทั้งหมด <b>{rows.reduce((sum, row) => sum + row.total, 0)}</b></span>
        <span>ตอบแล้ว <b>{rows.reduce((sum, row) => sum + row.responded, 0)}</b></span>
        <span>รอตอบ <b>{rows.reduce((sum, row) => sum + row.pending, 0)}</b></span>
        <span className="text-rose-700">รอเกินกำหนด <b>{rows.reduce((sum, row) => sum + row.overdue, 0)}</b></span>
      </div>
      <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">เปรียบเทียบการตอบสนองของทุกหน่วยงาน รวมหน่วยงานที่ไม่มีเรื่องในช่วงที่เลือก</caption>
        <thead className="bg-slate-50 text-slate-600"><tr>{['หน่วยงาน', 'ทั้งหมด', 'ตอบแล้ว', 'รอตอบ', 'รอเกินกำหนด', 'เฉลี่ย', 'มัธยฐาน', 'ตอบตรงเวลา', 'รอนานที่สุด'].map(title => <th key={title} scope="col" className="px-3 py-3">{title}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.department_id} className="border-t border-slate-100 hover:bg-slate-50">
          <th scope="row" className="px-3 py-3 font-medium">{row.department_name}</th>
          <td className="px-3 py-3">{row.total}</td><td className="px-3 py-3">{row.responded}</td><td className="px-3 py-3">{row.pending}</td>
          <td className={`px-3 py-3 ${row.overdue ? 'font-bold text-rose-700' : ''}`}>{row.overdue}</td>
          <td className="px-3 py-3">{hours(row.average_hours)}</td><td className="px-3 py-3">{hours(row.median_hours)}</td>
          <td className="px-3 py-3">{row.on_time_percent === null ? '—' : `${row.on_time_percent.toFixed(1)}%`}</td><td className="px-3 py-3">{hours(row.longest_wait_hours)}</td>
        </tr>)}</tbody>
      </table></div>
      {rows.length === 0 && <p className="text-sm text-slate-500">ยังไม่มีหน่วยงานในทะเบียน</p>}
      {data && (data.invalid_records > 0 || data.unassigned_records > 0) && <p className="text-sm text-amber-700">ข้อมูลที่ไม่รวมในตาราง: เวลาไม่สมบูรณ์ {data.invalid_records} เรื่อง / ไม่พบหน่วยงานในทะเบียน {data.unassigned_records} เรื่อง</p>}
      {data && <p className="text-xs text-slate-500">ข้อมูล ณ {new Date(data.generated_at).toLocaleString('th-TH')} • — หมายถึงยังไม่มีข้อมูลสำหรับคำนวณ</p>}
    </>}
  </section>;
}
