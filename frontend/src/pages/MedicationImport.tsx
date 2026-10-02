import { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Choice = { row: number; date_report: string; time_report: string; level_id: string; nrls_code: string; department_id: string; location_id: string; duration_id: string; selected: boolean };
type PreviewRow = { row: number; date: string; level: string; shift: string; location: string; stages: string[]; detail: string; problem_basic: string; reporter: string; duplicate: boolean };
type Context = { departments: { id: number; depart_name: string }[]; locations: { id: number; name: string }[]; durations: { id: number; duration_name: string }[]; topics: { nrls_code: string; name: string }[] };
const inputClass = 'border rounded p-2 w-full bg-white text-slate-900';

export default function MedicationImport() {
  const { user } = useAuth();
  const canImport = user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital');
  const [context, setContext] = useState<Context>();
  const [file, setFile] = useState<File>();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('ยา');
  const [results, setResults] = useState<{ row: number; status: string; id?: number }[]>([]);
  const headers = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` };
  useEffect(() => {
    if (!canImport) return;
    axios.get('/medication-import/context', { headers }).then(r => setContext(r.data)).catch(() => setError('ไม่สามารถโหลดข้อมูลสำหรับนำเข้าได้'));
  }, [canImport]);
  if (!canImport) return <Navigate to="/dashboard" replace />;
  const update = (row: number, change: Partial<Choice>) => setChoices(old => old.map(c => c.row === row ? { ...c, ...change } : c));
  const preview = async () => {
    if (!file || !context) return;
    setBusy(true); setError(''); setResults([]); setRows([]); setChoices([]); setToken('');
    try {
      const form = new FormData(); form.append('file', file);
      const response = await axios.post('/medication-import/preview', form, { headers });
      const data: PreviewRow[] = response.data.rows;
      setRows(data); setToken(response.data.token);
      setChoices(data.map(r => ({ row: r.row, date_report: r.date, time_report: '', level_id: r.level, nrls_code: '',
        department_id: context.departments.length === 1 ? String(context.departments[0].id) : '',
        location_id: String(context.locations.find(l => l.name.trim() === r.location.trim())?.id || ''),
        duration_id: String(context.durations.find(d => d.duration_name.trim() === r.shift.trim())?.id || ''), selected: !r.duplicate })));
    } catch (e: any) { setError(e.response?.data?.message || 'อ่านไฟล์ไม่สำเร็จ'); }
    finally { setBusy(false); }
  };
  const ready = (c: Choice) => c.date_report && c.time_report && c.level_id && c.nrls_code && c.department_id && c.location_id && c.duration_id;
  const selected = choices.filter(c => c.selected);
  const commit = async () => {
    if (!selected.length || !selected.every(ready)) { setError('กรุณาตรวจและกรอกข้อมูลที่จำเป็นของรายการที่เลือกให้ครบ'); return; }
    if (!window.confirm(`ยืนยันนำเข้า ${selected.length} อุบัติการณ์เข้าสถานะรอยืนยัน?`)) return;
    setBusy(true); setError('');
    try {
      const response = await axios.post('/medication-import/commit', { token, rows: selected }, { headers });
      setResults(response.data.results);
      const done = new Set(response.data.results.filter((r: { status: string }) => r.status !== 'failed').map((r: { row: number }) => r.row));
      setChoices(old => old.map(c => done.has(c.row) ? { ...c, selected: false } : c));
      setRows(old => old.map(r => done.has(r.row) ? { ...r, duplicate: true } : r));
    } catch (e: any) { setError(e.response?.data?.message || 'นำเข้าไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง ระบบตรวจรายการซ้ำก่อนบันทึก'); }
    finally { setBusy(false); }
  };
  const topics = context?.topics.filter(t => `${t.nrls_code} ${t.name}`.toLowerCase().includes(search.toLowerCase())) || [];
  return <div className="space-y-5 max-w-6xl mx-auto">
    <h1 className="text-2xl font-bold">นำเข้าความเสี่ยงด้านยา</h1>
    <p>สำหรับ Admin และคณะกรรมการบริหารความเสี่ยงระดับโรงพยาบาล • CSV UTF-8 จากแบบฟอร์ม Medication Error • สูงสุด 500 รายการ / 5 MB</p>
    <div className="bg-amber-50 border border-amber-200 p-4 rounded text-amber-900">
      หนึ่งแถวจะสร้างหนึ่งอุบัติการณ์และรอการยืนยันตามขั้นตอน HRMS กรุณาเลือก NRLS จากทะเบียนของโรงพยาบาลตามข้อเท็จจริง ไม่จับคู่หัวข้อโดยอัตโนมัติ
      <p className="mt-2">ไม่นำเข้าช่อง HN/AN/ชื่อผู้ป่วยและลิงก์รูปภาพ กรุณาตรวจข้อความรายละเอียดว่าไม่มีข้อมูลระบุตัวผู้ป่วยก่อนนำเข้า เวลาที่เกิดเหตุไม่มีในไฟล์ จึงต้องกรอกเอง ไม่ใช้เวลาที่ส่งแบบฟอร์มแทน</p>
      <p className="mt-2">ผู้บันทึกในระบบคือบัญชีที่นำเข้า ชื่อผู้รายงานต้นฉบับเก็บในหมายเหตุ ตัวอย่างหมดอายุใน 30 นาที และไม่มีการส่งการแจ้งเตือน Telegram จากงานนำเข้านี้</p>
    </div>
    <div className="bg-white border p-4 rounded space-y-3">
      <input aria-label="ไฟล์ Medication Error" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { setFile(e.target.files?.[0]); setRows([]); setChoices([]); setToken(''); setResults([]); }} />
      <button className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50" disabled={busy || !file || !context} onClick={preview}>{busy ? 'กำลังดำเนินการ…' : 'ตรวจไฟล์และแสดงตัวอย่าง'}</button>
    </div>
    {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}
    {!!rows.length && <>
      <label className="block">ค้นหาหัวข้อ NRLS เพื่อจำกัดตัวเลือก (ล้างคำค้นเพื่อดูทั้งหมด)<input className={inputClass} value={search} onChange={e => setSearch(e.target.value)} /></label>
      <p>ทั้งหมด {rows.length} แถว • ซ้ำ {rows.filter(r => r.duplicate).length} • เลือกนำเข้า {selected.length} • กรุณาตรวจหน่วยงานต้นทางของแต่ละแถว</p>
      {rows.map((r, index) => {
        const c = choices[index];
        const available = context?.topics.filter(t => topics.includes(t) || t.nrls_code === c.nrls_code) || [];
        return <section key={r.row} className="bg-white border rounded p-4 space-y-3">
          <label className="font-bold flex gap-2"><input type="checkbox" disabled={busy || r.duplicate} checked={c.selected} onChange={e => update(r.row, { selected: e.target.checked })} />แถว {r.row} {r.duplicate && '— มีรายการนี้แล้ว / ซ้ำ'}</label>
          <p className="text-sm">เวร: {r.shift || 'ไม่ระบุ'} • สถานที่: {r.location || 'ไม่ระบุ'}</p>
          <p className="whitespace-pre-wrap text-sm">{r.stages.join('\n')}</p>
          <details><summary className="cursor-pointer text-blue-700">ตรวจรายละเอียดและการแก้ไขเบื้องต้น</summary><p className="whitespace-pre-wrap mt-2">{r.detail}</p><p className="whitespace-pre-wrap">การแก้ไข: {r.problem_basic}</p><p>ผู้รายงานต้นฉบับ: {r.reporter || 'ไม่ระบุ'}</p></details>
          <fieldset disabled={busy || r.duplicate} className="grid md:grid-cols-3 gap-3">
            <label>วันที่เกิดเหตุ<input type="date" className={inputClass} value={c.date_report} onChange={e => update(r.row, { date_report: e.target.value })} /></label>
            <label>เวลาที่เกิดเหตุ<input type="time" className={inputClass} value={c.time_report} onChange={e => update(r.row, { time_report: e.target.value })} /></label>
            <label>ระดับความรุนแรง<select className={inputClass} value={c.level_id} onChange={e => update(r.row, { level_id: e.target.value })}><option value="">เลือกระดับ</option>{'ABCDEFGHI'.split('').map(v => <option key={v}>{v}</option>)}</select></label>
            <label>หน่วยงานต้นทาง<select className={inputClass} value={c.department_id} onChange={e => update(r.row, { department_id: e.target.value })}><option value="">เลือกหน่วยงาน</option>{context?.departments.map(d => <option key={d.id} value={d.id}>{d.depart_name}</option>)}</select></label>
            <label>สถานที่<select className={inputClass} value={c.location_id} onChange={e => update(r.row, { location_id: e.target.value })}><option value="">เลือกสถานที่</option>{context?.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            <label>เวร<select className={inputClass} value={c.duration_id} onChange={e => update(r.row, { duration_id: e.target.value })}><option value="">เลือกเวร</option>{context?.durations.map(d => <option key={d.id} value={d.id}>{d.duration_name}</option>)}</select></label>
            <label className="md:col-span-3">หัวข้อความเสี่ยง NRLS<select className={inputClass} value={c.nrls_code} onChange={e => update(r.row, { nrls_code: e.target.value })}><option value="">เลือกหัวข้อที่ตรงกับเหตุการณ์</option>{available.map(t => <option key={t.nrls_code} value={t.nrls_code}>{t.nrls_code} — {t.name}</option>)}</select></label>
          </fieldset>
        </section>;
      })}
      <button onClick={commit} disabled={busy || !selected.length || !selected.every(ready)} className="bg-emerald-700 text-white px-5 py-3 rounded disabled:opacity-50">ยืนยันนำเข้า {selected.length} รายการ</button>
    </>}
    {!!results.length && <div role="status" className="border bg-white rounded p-4"><p>สร้าง {results.filter(r => r.status === 'created').length} • ซ้ำ {results.filter(r => r.status === 'duplicate').length} • ไม่สำเร็จ {results.filter(r => r.status === 'failed').length}</p>{results.map(r => <p key={r.row}>แถว {r.row}: {r.status === 'created' ? 'นำเข้าแล้ว' : r.status === 'duplicate' ? 'ข้ามรายการซ้ำ' : 'ไม่สำเร็จ กรุณาตรวจหัวข้อ NRLS และระดับความรุนแรงแล้วลองใหม่'} {r.id && <a className="text-blue-700 underline" href={`/incidents/${r.id}`}>ดูอุบัติการณ์ #{r.id}</a>}</p>)}</div>}
  </div>;
}
