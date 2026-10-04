import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Choice = { row: number; date_report: string; time_report: string; level_id: string; nrls_code: string; department_id: string; location_id: string; duration_id: string; selected: boolean };
type SourceColumn = { header: string; value: string; excluded: boolean };
type PreviewRow = { row: number; date: string; level: string; shift: string; location: string; stages: string[]; detail: string; problem_basic: string; reporter: string; duplicate: boolean; source_columns: SourceColumn[]; suggested_nrls_code?: string };
type Context = { departments: { id: number; depart_name: string }[]; locations: { id: number; name: string }[]; durations: { id: number; duration_name: string }[]; topics: { nrls_code: string; name: string }[] };
const inputClass = 'border border-slate-300 rounded p-2 w-full bg-white text-slate-900 text-sm';
const blankBulk = { department_id: '', location_id: '', duration_id: '', time_report: '', nrls_code: '' };
const missing = (c: Choice) => [!c.date_report && 'วันที่', !c.time_report && 'เวลา', !c.level_id && 'ระดับ', !c.nrls_code && 'NRLS', !c.department_id && 'หน่วยงาน', !c.location_id && 'สถานที่', !c.duration_id && 'เวร'].filter(Boolean);
const exactId = (items: { id: number; name: string }[], value: string) => {
  const matches = items.filter(i => i.name.trim() === value.trim());
  return matches.length === 1 ? String(matches[0].id) : '';
};

export default function MedicationImport() {
  const { user } = useAuth();
  const canImport = user?.role === 'admin' || (user?.role === 'rm_committee' && user?.rmScope === 'hospital');
  const [context, setContext] = useState<Context>();
  const [file, setFile] = useState<File>();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('CPM');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [overview, setOverview] = useState(true);
  const [editingRow, setEditingRow] = useState<number>();
  const [bulk, setBulk] = useState(blankBulk);
  const [replaceFilled, setReplaceFilled] = useState(false);
  const [results, setResults] = useState<{ row: number; status: string; id?: number }[]>([]);
  const headers = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` };
  useEffect(() => {
    if (!canImport) return;
    const controller = new AbortController();
    axios.get('/medication-import/context', { headers, signal: controller.signal }).then(r => setContext(r.data)).catch(e => { if (!axios.isCancel(e)) setError('ไม่สามารถโหลดข้อมูลสำหรับนำเข้าได้ กรุณาเปิดหน้าใหม่'); });
    return () => controller.abort();
  }, [canImport]);
  if (!canImport) return <Navigate to="/dashboard" replace />;
  const update = (row: number, change: Partial<Choice>) => setChoices(old => old.map(c => c.row === row ? { ...c, ...change } : c));
  const preview = async (uploaded: File) => {
    if (!context || busyRef.current) return;
    if (uploaded.size > 5 * 1024 * 1024) { setError('ไฟล์ต้องไม่เกิน 5 MB'); return; }
    busyRef.current = true; setBusy(true); setError(''); setResults([]); setRows([]); setChoices([]); setToken(''); setBulk(blankBulk);
    try {
      const form = new FormData(); form.append('file', uploaded);
      const response = await axios.post('/medication-import/preview', form, { headers });
      const data: PreviewRow[] = response.data.rows;
      setRows(data); setToken(response.data.token);
      setChoices(data.map(r => ({ row: r.row, date_report: r.date, time_report: '', level_id: r.level,
        nrls_code: context.topics.some(t => t.nrls_code === r.suggested_nrls_code) ? r.suggested_nrls_code! : '',
        department_id: exactId(context.departments.map(d => ({ id: d.id, name: d.depart_name })), r.location) || (context.departments.length === 1 ? String(context.departments[0].id) : ''),
        location_id: exactId(context.locations, r.location),
        duration_id: exactId(context.durations.map(d => ({ id: d.id, name: d.duration_name })), r.shift), selected: !r.duplicate })));
    } catch (e: any) { setError(e.response?.data?.message || 'อ่านไฟล์ไม่สำเร็จ'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const selected = choices.filter(c => c.selected);
  const incomplete = selected.filter(c => missing(c).length);
  const availableRows = choices.filter(c => !rows.find(r => r.row === c.row)?.duplicate);
  const applyBulk = () => {
    setChoices(old => old.map(c => {
      if (!c.selected || rows.find(r => r.row === c.row)?.duplicate) return c;
      const patch = Object.fromEntries(Object.entries(bulk).filter(([key, value]) => value && (replaceFilled || !c[key as keyof typeof bulk])));
      return { ...c, ...patch };
    }));
  };
  const commit = async () => {
    if (busyRef.current || !selected.length || incomplete.length) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const response = await axios.post('/medication-import/commit', { token, rows: selected }, { headers });
      setResults(response.data.results);
      const done = new Set(response.data.results.filter((r: { status: string }) => r.status !== 'failed').map((r: { row: number }) => r.row));
      setChoices(old => old.map(c => done.has(c.row) ? { ...c, selected: false } : c));
      setRows(old => old.map(r => done.has(r.row) ? { ...r, duplicate: true } : r));
    } catch (e: any) { setError(e.response?.data?.message || 'นำเข้าไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const topics = context?.topics.filter(t => `${t.nrls_code} ${t.name}`.toLowerCase().includes(search.toLowerCase())) || [];
  const topicOptions = (value: string) => context?.topics.filter(t => topics.includes(t) || t.nrls_code === value) || [];
  const visibleSource = (r: PreviewRow) => r.source_columns.filter(col => !/^(คอลัมน์|column)\s*17$/i.test(col.header.trim()));
  const sourceHeaders = rows[0] ? visibleSource(rows[0]) : [];
  const nameOf = (items: { id: number; name: string }[], value: string) => items.find(i => String(i.id) === value)?.name || 'ต้องเติม';
  const field = (label: string, value: string, onChange: (value: string) => void, options: { id: string | number; name: string }[]) => <label className="block text-xs font-medium">{label}<select aria-label={label} className={inputClass} value={value} onChange={e => onChange(e.target.value)}><option value="">เลือก{label}</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>;
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">นำเข้าความเสี่ยงด้านยา</h1>
    <p className="text-sm text-slate-600">เลือก CSV เดิม → ตรวจตารางและเติมช่องที่ขาด → ยืนยันนำเข้าทั้งชุด</p>
    <div className="rounded-xl border bg-white p-4 space-y-2">
      <input aria-label="ไฟล์ Medication Error" type="file" accept=".csv,text/csv" disabled={busy || !context} onChange={e => { const uploaded = e.target.files?.[0]; setFile(uploaded); if (uploaded) void preview(uploaded); else { setRows([]); setChoices([]); setToken(''); setResults([]); } }} />
      {file && <span className="block text-sm">{file.name} <button disabled={busy || !context} onClick={() => preview(file)} className="ml-3 text-indigo-700 underline disabled:opacity-50">อ่านไฟล์ใหม่</button></span>}
      <p className="text-xs text-slate-600">สูงสุด 500 แถว / 5 MB · ชื่อและลำดับคอลัมน์ใช้ตาม CSV เดิม · ช่องข้อมูลผู้ป่วย รูปภาพ และคอลัมน์ไม่ระบุความหมายแสดงเป็น “ไม่นำเข้า”</p>
    </div>
    {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
    {busy && <p role="status">กำลังดำเนินการ กรุณารอ…</p>}
    {!!rows.length && context && <>
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
        <h2 className="font-semibold">เติมข้อมูลร่วมให้แถวที่เลือก</h2>
        <p className="text-xs">ใช้เมื่อรายการมีข้อมูลเดียวกัน โดยค่าเริ่มต้นเติมเฉพาะช่องว่าง เวลาต้องเป็นเวลาเกิดเหตุจริง ไฟล์เดิมไม่มีเวลาเกิดเหตุ</p>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {field('หน่วยงาน', bulk.department_id, v => setBulk({ ...bulk, department_id: v }), context.departments.map(d => ({ id: d.id, name: d.depart_name })))}
          {field('สถานที่', bulk.location_id, v => setBulk({ ...bulk, location_id: v }), context.locations)}
          {field('เวร', bulk.duration_id, v => setBulk({ ...bulk, duration_id: v }), context.durations.map(d => ({ id: d.id, name: d.duration_name })))}
          <label className="text-xs font-medium">เวลาเกิดเหตุ<input aria-label="เวลาเกิดเหตุร่วม" type="time" className={inputClass} value={bulk.time_report} onChange={e => setBulk({ ...bulk, time_report: e.target.value })} /></label>
          {field('NRLS ร่วม', bulk.nrls_code, v => setBulk({ ...bulk, nrls_code: v }), topicOptions(bulk.nrls_code).map(t => ({ id: t.nrls_code, name: `${t.nrls_code} — ${t.name}` })))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={replaceFilled} onChange={e => setReplaceFilled(e.target.checked)} />แทนค่าที่กรอกแล้วด้วย</label>
        <button disabled={busy || !selected.length || !Object.values(bulk).some(Boolean)} onClick={applyBulk} className="rounded bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">ใช้กับ {selected.length} แถวที่เลือก</button>
      </div>
      <div className="flex flex-wrap gap-4 items-center text-sm">
        <span>ทั้งหมด {rows.length} · ข้าม/ซ้ำ {rows.filter(r => r.duplicate).length} · เลือก {selected.length} · ต้องเติม {incomplete.length}</span>
        <label className="flex gap-2"><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} />แสดงเฉพาะแถวที่ต้องเติม</label>
        <label className="flex items-center gap-2">ค้น NRLS<input className={inputClass} value={search} onChange={e => setSearch(e.target.value)} placeholder="รหัสหรือชื่อหัวข้อ" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button onClick={() => { setOverview(!overview); setEditingRow(undefined); }} className="rounded border bg-white px-3 py-2">{overview ? 'แสดงทุกคอลัมน์ CSV' : 'กลับภาพรวมรายเดือน'}</button>
        <span className="text-xs">ภาพรวมหนึ่งบรรทัดต่อรายการ · กดดู / แก้ไขเพื่อเทียบ CSV · สีเหลืองคือข้อมูลต้นฉบับที่ใช้ประกอบการนำเข้า</span>
      </div>
      {overview && <div className="max-h-[70vh] overflow-auto rounded-xl border bg-white">
        <table className="w-full text-xs whitespace-nowrap border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-100"><tr>{['เลือก / แถว', 'สถานะ', 'วันที่ / เวลา', 'ระดับ', 'หน่วยงาน', 'สถานที่ / เวร', 'ขั้นตอน CSV', 'NRLS', 'รายละเอียด'].map(h => <th key={h} className="p-2 border-b text-left">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, index) => {
            const c = choices[index]; const needs = missing(c); const result = results.find(v => v.row === r.row);
            if (onlyIssues && (!c.selected || !needs.length)) return null;
            return <tr key={r.row} className={r.duplicate ? 'border-b bg-slate-50 text-slate-500' : 'border-b'}>
              <td className="p-2"><label className="flex items-center gap-2"><input aria-label={`เลือกภาพรวมแถว ${r.row}`} type="checkbox" disabled={busy || r.duplicate} checked={c.selected} onChange={e => update(r.row, { selected: e.target.checked })} />{r.row}</label></td>
              <td className="p-2" title={needs.join(', ')}>{result?.status === 'created' ? 'นำเข้าแล้ว' : r.duplicate ? 'ข้ามซ้ำ' : result?.status === 'failed' ? 'ไม่สำเร็จ' : needs.length ? `ต้องเติม ${needs.length} ช่อง` : 'พร้อม'}</td>
              <td className="p-2">{c.date_report || 'ต้องเติม'} / {c.time_report || 'ต้องเติมเวลา'}</td>
              <td className="p-2">{c.level_id || 'ต้องเติม'}</td>
              <td className="p-2 max-w-[180px] truncate">{nameOf(context.departments.map(d => ({ id: d.id, name: d.depart_name })), c.department_id)}</td>
              <td className="p-2 max-w-[180px] truncate">{nameOf(context.locations, c.location_id)} / {nameOf(context.durations.map(d => ({ id: d.id, name: d.duration_name })), c.duration_id)}</td>
              <td className="p-2 max-w-[180px] truncate bg-yellow-50" title={r.stages.join(', ')}>{r.stages.join(', ') || '—'}</td>
              <td className="p-2" title={context.topics.find(t => t.nrls_code === c.nrls_code)?.name}>{c.nrls_code || 'ต้องเลือก'}</td>
              <td className="p-2"><button className="text-indigo-700 underline" onClick={() => setEditingRow(editingRow === r.row ? undefined : r.row)}>{editingRow === r.row ? 'ปิดรายละเอียด' : 'ดู / แก้ไข'}</button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      {overview && editingRow !== undefined && <p className="font-medium text-sm">เทียบข้อมูล CSV แถว {editingRow}</p>}
      {(!overview || editingRow !== undefined) && <div className="max-h-[65vh] overflow-auto rounded-xl border bg-white">
        <table className="text-sm border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-30"><tr><th className="sticky left-0 bg-slate-100 p-3 border-b" rowSpan={2}>แถว / เลือก</th><th colSpan={sourceHeaders.length} className="bg-slate-100 p-3 border-b text-left">ข้อมูลต้นฉบับ CSV</th><th className="lg:sticky lg:right-0 bg-indigo-100 p-3 border-b text-left w-[540px] min-w-[540px]" rowSpan={2}>ข้อมูลที่จะนำเข้า HRMS / NRLS</th></tr><tr>{sourceHeaders.map((col, i) => <th key={i} className="bg-slate-100 p-3 border-b border-r min-w-[180px] max-w-[240px] text-left align-top">{col.header}{col.excluded && <span className="block text-xs font-normal">ไม่นำเข้า</span>}</th>)}</tr></thead>
          <tbody>{rows.map((r, index) => {
            const c = choices[index]; const needs = missing(c); const result = results.find(v => v.row === r.row);
            if (overview && editingRow !== r.row) return null;
            if (onlyIssues && (!c.selected || !needs.length)) return null;
            return <tr key={r.row} className={r.duplicate ? 'bg-slate-50' : ''}>
              <td className="sticky left-0 z-10 border-b border-r p-3 bg-white align-top"><label className="flex gap-2"><input aria-label={`เลือกแถว ${r.row}`} type="checkbox" disabled={busy || r.duplicate} checked={c.selected} onChange={e => update(r.row, { selected: e.target.checked })} />{r.row}</label><span className="block text-xs mt-2">{result?.status === 'created' ? 'นำเข้าแล้ว' : result?.status === 'duplicate' || r.duplicate ? 'ข้ามซ้ำ' : result?.status === 'failed' ? 'นำเข้าไม่สำเร็จ' : needs.length ? 'ต้องเติม' : 'พร้อม'}</span></td>
              {visibleSource(r).map((col, i) => <td key={i} className={`p-3 border-b border-r align-top whitespace-pre-wrap min-w-[180px] max-w-[240px] break-words ${!col.excluded && col.value ? 'bg-yellow-100' : ''}`}>{col.excluded ? <span className="text-slate-400">ไม่นำเข้า</span> : col.value || '—'}</td>)}
              <td className="lg:sticky lg:right-0 z-10 bg-indigo-50 border-b border-l border-indigo-200 p-3 align-top min-w-[540px]">
                <fieldset disabled={busy || r.duplicate} className="grid grid-cols-3 gap-2">
                  <label className="text-xs">วันที่เกิดเหตุ<input aria-label={`วันที่แถว ${r.row}`} type="date" className={inputClass} value={c.date_report} onChange={e => update(r.row, { date_report: e.target.value })} /></label>
                  <label className="text-xs">เวลาเกิดเหตุ<input aria-label={`เวลาแถว ${r.row}`} type="time" className={inputClass} value={c.time_report} onChange={e => update(r.row, { time_report: e.target.value })} /></label>
                  {field(`ระดับแถว ${r.row}`, c.level_id, v => update(r.row, { level_id: v }), 'ABCDEFGHI'.split('').map(v => ({ id: v, name: v })))}
                  {field(`หน่วยงานแถว ${r.row}`, c.department_id, v => update(r.row, { department_id: v }), context.departments.map(d => ({ id: d.id, name: d.depart_name })))}
                  {field(`สถานที่แถว ${r.row}`, c.location_id, v => update(r.row, { location_id: v }), context.locations)}
                  {field(`เวรแถว ${r.row}`, c.duration_id, v => update(r.row, { duration_id: v }), context.durations.map(d => ({ id: d.id, name: d.duration_name })))}
                  <div className="col-span-3">{field(`NRLS แถว ${r.row}`, c.nrls_code, v => update(r.row, { nrls_code: v }), topicOptions(c.nrls_code).map(t => ({ id: t.nrls_code, name: `${t.nrls_code} — ${t.name}` })))}</div>
                </fieldset>
                {r.suggested_nrls_code && <p className="mt-2 text-xs text-indigo-700">เสนอจากขั้นตอนใน CSV: {r.suggested_nrls_code} กรุณาตรวจให้ตรงเหตุการณ์</p>}
                {!!needs.length && !r.duplicate && <p className="mt-2 text-xs text-amber-800">ต้องเติม: {needs.join(', ')}</p>}
                <details className="mt-2 text-xs"><summary className="cursor-pointer text-indigo-700">ข้อความและการแก้ไขที่จะนำเข้า</summary><p className="whitespace-pre-wrap mt-2">{r.detail}</p><p className="whitespace-pre-wrap">การแก้ไขเบื้องต้น: {r.problem_basic || '—'}</p><p>ผู้รายงานต้นฉบับ: {r.reporter || '—'}</p></details>
                {result?.id && <a className="block mt-2 underline text-indigo-700" href={`/incidents/${result.id}`}>ดูอุบัติการณ์ #{result.id}</a>}
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      <div className="sticky bottom-0 z-40 rounded-xl border bg-white p-4 shadow flex flex-wrap items-center justify-between gap-3">
        <div><label className="flex items-center gap-2"><input aria-label="เลือกทั้งหมด" type="checkbox" disabled={busy || !availableRows.length} checked={!!availableRows.length && availableRows.every(c => c.selected)} onChange={e => setChoices(old => old.map(c => rows.find(r => r.row === c.row)?.duplicate ? c : { ...c, selected: e.target.checked }))} />เลือกทุกแถวที่ยังไม่นำเข้า</label><p className="text-xs mt-1">{incomplete.length ? `เหลือ ${incomplete.length} แถวที่ต้องเติม หรือยกเลิกเลือกแถวนั้น` : 'ข้อมูลครบ พร้อมนำเข้า'} · หนึ่งแถวสร้างหนึ่งเหตุการณ์และเข้าสถานะรอยืนยัน</p></div>
        <button onClick={commit} disabled={busy || !token || !selected.length || !!incomplete.length} className="rounded bg-emerald-700 px-5 py-3 text-white font-semibold disabled:opacity-50">ยืนยันนำเข้า {selected.length} รายการ</button>
      </div>
      <p className="text-xs text-slate-500">ตรวจข้อความว่าไม่มีข้อมูลระบุตัวผู้ป่วยก่อนยืนยัน · ตัวอย่างหมดอายุใน 30 นาที · ผู้บันทึกคือบัญชีที่นำเข้า · การนำเข้าไม่ส่ง Telegram</p>
    </>}
    {!!results.length && <div role="status" className="rounded border bg-white p-4">นำเข้าแล้ว {results.filter(r => r.status === 'created').length} · ข้ามซ้ำ {results.filter(r => r.status === 'duplicate').length} · ไม่สำเร็จ {results.filter(r => r.status === 'failed').length} {results.some(r => r.status === 'failed') && '— แถวที่ไม่สำเร็จยังคงเลือกไว้เพื่อแก้และลองใหม่'}</div>}
  </div>;
}
