import { useState } from 'react';
import axios from 'axios';
import { FileUp, X } from 'lucide-react';

type Preview = { preview_hash: string; total: number; new_count: number; duplicate_count: number; rows: Array<{ source_row: number; risk_title: string; score: number; owner_name: string; owner_linked: boolean; next_review_date: string; duplicate_id: number | null }> };
export default function LegacyRegisterImport({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [packet, setPacket] = useState<any>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped_duplicates: number } | null>(null);
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
  async function loadFile(file?: File) {
    setPacket(null); setPreview(null); setResult(null); setError('');
    if (!file) return;
    try {
      if (file.size > 90000) throw new Error('ไฟล์ใหญ่เกิน 90 KB กรุณาแบ่งชุดข้อมูล');
      const input = JSON.parse(await file.text());
      if (input.format !== 'riskhrms-hospital-register-v1' || !Array.isArray(input.records)) throw new Error('กรุณาเลือกไฟล์ทะเบียนที่จัดเตรียมสำหรับนำเข้า');
      setPacket(input);
    } catch (e: any) { setError(e.message || 'อ่านไฟล์ไม่สำเร็จ'); }
  }
  async function inspect() {
    setBusy(true); setError(''); setPreview(null);
    try { setPreview((await axios.post('/risk-analysis/import-legacy/preview', packet, { headers: headers() })).data); }
    catch (e: any) { setError(e.response?.data?.message || 'ตรวจไฟล์ไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!preview || !preview.new_count) return;
    setBusy(true); setError('');
    try {
      const data = (await axios.post('/risk-analysis/import-legacy/commit', { ...packet, preview_hash: preview.preview_hash }, { headers: headers() })).data;
      setResult(data); setPreview(null); onImported();
    } catch (e: any) { setError(e.response?.data?.message || 'นำเข้าไม่สำเร็จ กรุณาตรวจตัวอย่างอีกครั้ง'); setPreview(null); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3" role="dialog" aria-modal="true" aria-labelledby="legacy-import-title">
    <section className="w-full max-w-4xl max-h-[90dvh] overflow-auto rounded-2xl bg-white p-5 text-slate-800 shadow-xl">
      <div className="flex items-start justify-between gap-3"><div><h2 id="legacy-import-title" className="text-xl font-bold">นำเข้าทะเบียนความเสี่ยงโรงพยาบาลเดิม</h2><p className="mt-2 text-sm text-slate-600">คงชื่อ มาตรการ และประวัติจากต้นฉบับ ตรวจรายการซ้ำก่อนบันทึก</p></div><button type="button" aria-label="ปิดหน้านำเข้า" disabled={busy} onClick={onClose} className="rounded-lg p-2 disabled:opacity-40"><X size={22}/></button></div>
      <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">ทะเบียนเดิมยังไม่เชื่อม NRLS และยังไม่ประเมินคะแนนคงเหลือใหม่ ต้องจัดประเภทก่อนนับอุบัติการณ์หรือทบทวนในระบบ วันนัดคำนวณจากวันที่ทบทวนและรอบเดิม จึงอาจเกินกำหนดแล้ว</div>
      {!result && <><label className="block text-sm font-semibold">เลือกไฟล์ทะเบียนที่จัดเตรียม (.json)<input type="file" accept=".json,application/json" disabled={busy} onChange={e => void loadFile(e.target.files?.[0])} className="mt-2 block w-full rounded-lg border p-3 text-sm" /></label>
        {packet && <p className="my-3 text-sm">ชีต: {String(packet.sheet)} · {packet.records.length} เรื่อง · ระดับโรงพยาบาล</p>}
        <button type="button" disabled={busy || !packet} onClick={() => void inspect()} className="my-3 rounded-lg border border-teal-700 px-4 py-2 font-semibold text-teal-800 disabled:opacity-40">{busy ? 'กำลังดำเนินการ...' : 'ตรวจตัวอย่างก่อนนำเข้า'}</button></>}
      {error && <p role="alert" className="my-3 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
      {preview && <><p className="mb-3 font-semibold">รายการใหม่ {preview.new_count} เรื่อง · ซ้ำ {preview.duplicate_count} เรื่อง (ข้ามโดยไม่แก้ข้อมูลเดิม)</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr>{['แถว', 'ความเสี่ยง', 'L × C', 'Risk Owner', 'นัดทบทวน', 'ผลตรวจ'].map(v => <th key={v} className="p-3">{v}</th>)}</tr></thead><tbody>{preview.rows.map(row => <tr key={row.source_row} className="border-b align-top"><td className="p-3">{row.source_row}</td><td className="p-3 min-w-52">{row.risk_title}<span className="mt-1 block text-xs text-amber-700">รอเชื่อม NRLS</span></td><td className="p-3">{row.score}</td><td className="p-3 min-w-36">{row.owner_name}<span className="mt-1 block text-xs text-slate-500">{row.owner_linked ? 'เชื่อมบัญชีตรงชื่อแล้ว' : 'เก็บชื่อเดิม ยังไม่เชื่อมบัญชี'}</span></td><td className="p-3 whitespace-nowrap">{new Date(`${row.next_review_date}T00:00:00Z`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</td><td className="p-3">{row.duplicate_id ? 'ซ้ำ ข้าม' : 'พร้อมนำเข้า'}</td></tr>)}</tbody></table></div>
        <button type="button" disabled={busy || !preview.new_count} onClick={() => void save()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-40"><FileUp size={18}/>{busy ? 'กำลังบันทึก...' : `นำเข้า ${preview.new_count} เรื่องระดับโรงพยาบาล`}</button></>}
      {result && <div role="status" className="my-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-bold text-emerald-800">นำเข้าสำเร็จ {result.imported} เรื่อง</h3><p className="mt-2 text-sm">ข้ามรายการซ้ำ {result.skipped_duplicates} เรื่อง · ข้อมูลเดิมไม่ได้ถูกแก้ไข</p><button type="button" onClick={onClose} className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-white">ดูทะเบียนโรงพยาบาล</button></div>}
    </section>
  </div>;
}
