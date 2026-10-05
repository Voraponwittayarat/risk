import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

type SourceRow = { row: number; name: string; position: string; group: string; unit: string; employment: string; sourceKey: string; status: string; matchStatus: string; memberId: number | null; errors: string[]; previous: { name: string; position: string; group: string; unit: string; employment: string } | null };
type Preview = { token: string; rows: SourceRow[]; absent: { name: string; unit: string }[]; departments: { id: number; depart_name: string }[]; members: { id: number; name: string; departmentId: number }[]; units: { key: string; group: string; unit: string; departmentId: number | null }[] };
type Latest = { asOf: string; importedAt: string; count: number; source: string };
const statusNames: Record<string, string> = { existing: 'มีแล้วในชุดก่อน', changed: 'ข้อมูลเปลี่ยน', existing_member: 'พบในทะเบียนเดิม', new: 'ใหม่' };
const messageOf = (e: any) => Array.isArray(e.response?.data?.message) ? e.response.data.message.join(', ') : e.response?.data?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่';
const dateLabel = (value: string) => new Date(value).toLocaleDateString('th-TH');
const inputClass = 'rounded border border-slate-300 p-2 text-sm bg-white text-slate-900 w-full';

export default function PersonnelRosterImport() {
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [preview, setPreview] = useState<Preview>();
  const [units, setUnits] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<number, string>>({});
  const [asOf, setAsOf] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingLink, setEditingLink] = useState<number>();
  useEffect(() => { axios.get('/members/roster/latest').then(r => setLatest(r.data)).catch(() => setError('โหลดรายชื่อชุดล่าสุดไม่ได้ กรุณาตรวจว่าระบบอัปเดตแล้ว')); }, []);
  const upload = async (file: File) => {
    if (lock.current) return;
    if (file.size > 5 * 1024 * 1024) { setError('ไฟล์ต้องไม่เกิน 5 MB'); return; }
    lock.current = true; setBusy(true); setError(''); setSuccess(''); setPreview(undefined); setConfirm(false); setAsOf('');
    try {
      const form = new FormData(); form.append('file', file);
      const { data } = await axios.post<Preview>('/members/roster/preview', form);
      setPreview(data); setUnits(Object.fromEntries(data.units.map(u => [u.key, u.departmentId ? String(u.departmentId) : ''])));
      setLinks(Object.fromEntries(data.rows.map(r => [r.row, r.memberId ? String(r.memberId) : r.matchStatus === 'ambiguous' ? '' : 'unlinked'])));
      setQuery(''); setFilter('all'); setEditingLink(undefined);
    } catch (e) { setError(messageOf(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const errors = preview?.rows.filter(r => r.errors.length).length || 0;
  const missingUnits = preview?.units.filter(u => !units[u.key]).length || 0;
  const unresolved = preview?.rows.filter(r => !links[r.row]).length || 0;
  const unlinked = preview?.rows.filter(r => links[r.row] === 'unlinked').length || 0;
  const chosenLinks = Object.values(links).filter(v => v && v !== 'unlinked');
  const duplicateLinks = chosenLinks.length !== new Set(chosenLinks).size;
  const commit = async () => {
    if (!preview || lock.current || !confirm || !asOf || errors || missingUnits || unresolved || duplicateLinks) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const { data } = await axios.post('/members/roster/commit', { token: preview.token, asOf, confirmSnapshot: confirm, rows: preview.rows.map(r => ({ row: r.row, departmentId: Number(units[r.sourceKey]), memberId: links[r.row] === 'unlinked' ? null : Number(links[r.row]) })) });
      setPreview(undefined); setConfirm(false);
      setSuccess(`บันทึกรายชื่อปัจจุบัน ${data.count} คนแล้ว ยังไม่เชื่อมทะเบียนเดิม ${data.unlinked} คน เปิดรายงานใหม่เพื่อโหลดข้อมูลล่าสุด`);
      const response = await axios.get('/members/roster/latest'); setLatest(response.data);
    } catch (e) { setError(messageOf(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const visibleRows = preview?.rows.filter(r => {
    if (!`${r.name} ${r.group} ${r.unit}`.includes(query.trim())) return false;
    if (filter === 'unlinked') return links[r.row] === 'unlinked' || !links[r.row];
    return filter === 'all' || r.status === filter;
  }) || [];
  return <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><h2 className="font-bold">รายชื่อเจ้าหน้าที่ปัจจุบันสำหรับสถิติการรายงาน</h2>
        <p className="text-sm">{latest ? `ล่าสุด ${latest.count} คน • ข้อมูล ณ ${dateLabel(latest.asOf)} • นำเข้า ${dateLabel(latest.importedAt)}` : 'ยังไม่มีชุดรายชื่อปัจจุบัน รายงานใช้ทะเบียนบุคลากรที่เปิดใช้งาน'}</p></div>
      <button className="rounded bg-blue-700 px-4 py-2 text-white" onClick={() => setOpen(!open)}>{open ? 'ย่อส่วนการนำเข้า' : 'นำเข้ารายชื่อ / เทียบของเดิม'}</button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {success && <p role="status" className="text-emerald-800">{success}</p>}
    {open && <>
      <p className="text-sm">ใช้ CSV รายชื่อทั้งโรงพยาบาลตามแบบเดิม สูงสุด 3,000 คน / 5 MB ระบบอ่านชื่อ ตำแหน่ง กลุ่มงาน งาน ประเภทการจ้าง และข้ามตารางสรุปท้ายไฟล์</p>
      <p className="text-sm">รายชื่อชุดนี้ใช้คำนวณรายงาน ไม่สร้างบัญชีหรือเปลี่ยนสิทธิ์เข้าสู่ระบบ ชื่อที่ตรงกันเพียงคนเดียวจะเสนอให้เชื่อมทะเบียนเดิม กรุณาตรวจตัวบุคคลก่อนยืนยัน</p>
      <input aria-label="ไฟล์รายชื่อเจ้าหน้าที่ปัจจุบัน" disabled={busy} type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
      {busy && <p role="status">กำลังดำเนินการ…</p>}
      {preview && <>
        <div className="flex flex-wrap gap-3 text-sm font-medium"><span>ทั้งหมด {preview.rows.length} คน</span>{Object.entries(statusNames).map(([key,label]) => <span key={key}>{label} {preview.rows.filter(r => r.status === key).length}</span>)}<span>ไม่พบในชุดใหม่ {preview.absent.length} คน</span><span>ยังไม่เชื่อมทะเบียนเดิม {unlinked} คน</span></div>
        <details open={!!missingUnits}><summary className="font-medium cursor-pointer">จับคู่หน่วยงาน ({missingUnits} รายการที่ต้องเลือก)</summary>
          <div className="grid gap-2 sm:grid-cols-2 mt-2">{preview.units.map(u => <label key={u.key} className="text-xs">{u.group} / {u.unit || 'ไม่ระบุงาน'}<select className={inputClass} disabled={busy} aria-label={`หน่วยงาน ${u.group} ${u.unit}`} value={units[u.key]} onChange={e => { setUnits({ ...units, [u.key]: e.target.value }); setConfirm(false); }}><option value="">เลือกหน่วยงานในระบบ</option>{preview.departments.map(d => <option key={d.id} value={d.id}>{d.depart_name}</option>)}</select></label>)}</div>
        </details>
        <div className="flex flex-wrap gap-2"><input className="rounded border p-2 text-sm" aria-label="ค้นรายชื่อที่นำเข้า" placeholder="ค้นชื่อ / งาน" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="กรองสถานะรายชื่อ" className="rounded border p-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">ทุกรายการ</option>{Object.entries(statusNames).map(([v,label]) => <option key={v} value={v}>{label}</option>)}<option value="unlinked">ยังไม่เชื่อม / ต้องเลือก</option></select><span className="text-sm">แสดง {visibleRows.length} คน</span></div>
        <div className="max-h-[60vh] overflow-auto bg-white rounded border"><table className="w-full text-xs min-w-[1000px]"><thead className="sticky top-0 bg-slate-100"><tr>{['แถว / สถานะ', 'ชื่อใน CSV', 'ตำแหน่ง / ประเภทจ้าง', 'งานใน CSV → หน่วยงาน', 'ข้อมูลเดิม', 'เชื่อมทะเบียนบุคลากรเดิม'].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{visibleRows.map(r => <tr key={r.row} className="border-b align-top">
          <td className="p-2">{r.row} / {statusNames[r.status]}{r.errors.map(e => <p key={e} className="text-red-700">{e}</p>)}</td>
          <td className="p-2 bg-yellow-50">{r.name}</td><td className="p-2">{r.position}<br />{r.employment}</td>
          <td className="p-2">{r.unit || r.group}<br /><span className="text-blue-700">→ {preview.departments.find(d => String(d.id) === units[r.sourceKey])?.depart_name || 'ต้องเลือก'}</span></td>
          <td className="p-2">{r.previous ? `${r.previous.name} / ${r.previous.position} / ${r.previous.unit || r.previous.group} / ${r.previous.employment}` : 'ไม่มีในชุดก่อน'}</td>
          <td className="p-2 min-w-[240px]"><select aria-label={`เชื่อมทะเบียนแถว ${r.row}`} disabled={busy} className={inputClass} value={links[r.row]} onChange={e => { setLinks({ ...links, [r.row]: e.target.value }); setConfirm(false); setEditingLink(undefined); }}><option value="">ต้องตรวจเลือก (ชื่อซ้ำ)</option><option value="unlinked">ยังไม่มีทะเบียน / ไม่เชื่อม</option>{preview.members.filter(m => editingLink === r.row || String(m.id) === links[r.row]).map(m => <option key={m.id} value={m.id}>{m.name} — {preview.departments.find(d => d.id === m.departmentId)?.depart_name || 'ไม่ระบุหน่วยงาน'}</option>)}</select><button disabled={busy} className="mt-1 underline text-blue-700" aria-label={`เลือกจากทะเบียนทั้งหมดแถว ${r.row}`} onClick={() => setEditingLink(editingLink === r.row ? undefined : r.row)}>{editingLink === r.row ? 'ย่อรายชื่อที่เลือก' : 'เลือกจากทะเบียนทั้งหมด'}</button>{links[r.row] === 'unlinked' && <p className="mt-1 text-amber-800">นับในยอดเจ้าหน้าที่ แต่ยังนับการรายงานรายบุคคลไม่ได้</p>}</td>
        </tr>)}</tbody></table></div>
        {!!preview.absent.length && <details><summary className="cursor-pointer">รายชื่อจากชุดก่อนที่ไม่พบในไฟล์ใหม่ {preview.absent.length} คน (จะไม่นับในยอดปัจจุบัน)</summary><ul className="text-sm mt-2">{preview.absent.map((r,i) => <li key={i}>{r.name} — {r.unit}</li>)}</ul></details>}
        <p className="text-sm">รายชื่อทั้งหมด รวมถึงคนที่ยังไม่ลงทะเบียน จะนับในยอดเจ้าหน้าที่ รายชื่อที่ไม่อยู่ชุดใหม่จะไม่นับในยอดปัจจุบัน บัญชีและประวัติเดิมคงอยู่ รายงานทุกปีที่เลือกจะใช้ฐานรายชื่อปัจจุบันนี้</p>
        <div className="sticky bottom-0 rounded border bg-white p-3 space-y-2">
          <label className="text-sm">ข้อมูล ณ วันที่<input aria-label="วันที่รายชื่อปัจจุบัน" className="ml-2 border rounded p-1" type="date" disabled={busy} value={asOf} onChange={e => { setAsOf(e.target.value); setConfirm(false); }} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={confirm} onChange={e => setConfirm(e.target.checked)} />ตรวจรายชื่อและการเชื่อมโยงแล้ว และยืนยันว่าไฟล์เป็นรายชื่อปัจจุบันครบทั้งโรงพยาบาล</label>
          {!!(errors || missingUnits || unresolved || duplicateLinks) && <p className="text-sm text-red-700">ต้องแก้: แถวผิด {errors} · หน่วยงานไม่ครบ {missingUnits} · คนที่ต้องเลือก {unresolved} {duplicateLinks && '· เชื่อมคนเดิมซ้ำ'}</p>}
          <button className="rounded bg-emerald-700 text-white px-4 py-2 disabled:opacity-50" disabled={busy || !confirm || !asOf || !!errors || !!missingUnits || !!unresolved || duplicateLinks} onClick={commit}>ยืนยันใช้รายชื่อชุดนี้ {preview.rows.length} คน</button>
        </div>
      </>}
    </>}
  </section>;
}
