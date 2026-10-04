import { useEffect, useRef, useState } from 'react';
import type { TimelineItem } from './EventTimeline';
import { extractTimelineEvidence, importTimeline, type TimelineEvidence } from '../../utils/timelineEvidence';

export default function TimelineAssistantModal({ isOpen, onClose, initialText, items, onChange }: { isOpen: boolean; onClose: () => void; initialText: string; items: TimelineItem[]; onChange: (items: TimelineItem[]) => void }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<TimelineEvidence[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<{ before: TimelineItem[]; after: string } | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    opener.current = document.activeElement as HTMLElement;
    setText(initialText); setRows([]); setSelected([]); setMode('append'); setConfirmed(false); setError('');
    container.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    return () => opener.current?.focus();
    // Initialize once on opening; background form changes must not erase pasted text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  if (!isOpen) return null;
  const input = 'w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-white';
  const count = selected.filter(Boolean).length;
  const canUndo = undo && JSON.stringify(items) === undo.after;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
    <div ref={container} role="dialog" aria-modal="true" aria-labelledby="timeline-assistant-title" onKeyDown={e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const controls = [...(container.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea,input,select') || [])];
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }} className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-900">
      <header className="flex items-center justify-between border-b p-4"><div><h2 id="timeline-assistant-title" className="font-bold text-lg">ช่วยจัด Timeline จากข้อมูล</h2><p className="text-xs text-slate-500">จัดข้อมูลในเครื่องนี้ · ไม่ส่งออกไป AI ภายนอก · ไม่สร้างเวลาและเหตุการณ์เพิ่ม</p></div><button type="button" aria-label="ปิดตัวช่วย Timeline" onClick={onClose} className="rounded-lg border px-3 py-2">ปิด</button></header>
      <div className="space-y-4 overflow-y-auto p-4">
        <label className="block text-sm font-semibold">ข้อมูลต้นฉบับ<textarea aria-label="ข้อมูลต้นฉบับ Timeline" rows={5} value={text} onChange={e => { setText(e.target.value); setRows([]); setConfirmed(false); setError(''); }} className={`${input} mt-2`} /></label>
        <p className="text-xs text-slate-500">{text.length.toLocaleString()} / 30,000 ตัวอักษร · ข้อความหนึ่งเหตุการณ์ต่อบรรทัด หรือวางตาราง Excel วันที่ | เวลา | เหตุการณ์ · วันที่ใช้ วัน/เดือน/ปี 4 หลัก หรือ YYYY-MM-DD · เวลา 08:30 หรือ 08.30 · รองรับเลขไทย · ถ้ามีหลายเวลาในบรรทัด ระบบให้ตรวจเอง</p>
        <button type="button" onClick={() => { try { const result = extractTimelineEvidence(text); setRows(result); setSelected(result.map(row => !row.issues.length)); setConfirmed(false); setError(''); } catch (cause) { setRows([]); setError((cause as Error).message); } }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">จัดข้อมูลและดูตัวอย่าง</button>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {rows.length > 0 && <>
          <p className="text-sm font-semibold">ตรวจ {rows.length} รายการ · เลือกแล้ว {count} · รายการมีข้อสังเกตต้องเลือกเองหลังตรวจ · คงลำดับต้นฉบับ</p>
          <div className="space-y-3">{rows.map((row, index) => <section key={index} className={`rounded-xl border p-3 ${row.issues.length ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200'}`}>
            <label className="flex gap-2 text-sm font-bold"><input type="checkbox" checked={selected[index] || false} onChange={e => { setSelected(old => old.map((v, i) => i === index ? e.target.checked : v)); setConfirmed(false); }} /> นำเข้ารายการ {index + 1}</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[150px_110px_1fr]">
              <label className="text-xs">วันที่<input type="date" aria-label={`วันที่นำเข้า ${index + 1}`} value={row.event_date || ''} onChange={e => { setRows(old => old.map((v, i) => i === index ? { ...v, event_date: e.target.value } : v)); setConfirmed(false); }} className={input} /></label>
              <label className="text-xs">เวลา<input aria-label={`เวลานำเข้า ${index + 1}`} value={row.event_time} onChange={e => { setRows(old => old.map((v, i) => i === index ? { ...v, event_time: e.target.value } : v)); setConfirmed(false); }} className={input} placeholder="ไม่ระบุเวลา" /></label>
              <label className="text-xs">เหตุการณ์<textarea aria-label={`เหตุการณ์นำเข้า ${index + 1}`} rows={2} value={row.event_description} onChange={e => { setRows(old => old.map((v, i) => i === index ? { ...v, event_description: e.target.value } : v)); setConfirmed(false); }} className={input} /></label>
            </div>
            {row.issues.length > 0 && <p className="mt-2 text-xs text-amber-800">ต้องตรวจ: {row.issues.join(' · ')}</p>}
            <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer">เทียบหลักฐานต้นฉบับ (บรรทัด/แถว {row.source_line})</summary><blockquote className="mt-1 whitespace-pre-wrap border-l-2 pl-2">{row.source_text}</blockquote></details>
          </section>)}</div>
          <label className="block text-sm">วิธีนำเข้า<select aria-label="วิธีนำเข้า Timeline" value={mode} onChange={e => { setMode(e.target.value as 'append' | 'replace'); setConfirmed(false); }} className={`${input} mt-1`}><option value="append">เพิ่มต่อท้าย — เก็บรายการเดิม {items.length} รายการ</option><option value="replace">แทนที่ Timeline เดิมทั้งหมด {items.length} รายการ</option></select></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />ฉันตรวจรายการที่เลือกกับต้นฉบับแล้ว{mode === 'replace' ? ' และยืนยันแทนที่ Timeline เดิมทั้งหมด' : ''}</label>
          <button type="button" disabled={!confirmed || !count || rows.some((r, i) => selected[i] && !r.event_description.trim())} onClick={() => { const result = importTimeline(items, rows.filter((_, i) => selected[i]), mode); setUndo({ before: items, after: JSON.stringify(result) }); onChange(result); setRows([]); setConfirmed(false); }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">ยืนยันนำเข้า {count} รายการ</button>
        </>}
        {undo && <div role="status" className="rounded-xl border border-emerald-200 p-3 text-sm">นำเข้าแล้ว — ยังเป็นข้อมูลในแบบฟอร์ม ระบบบันทึกร่างตามปกติ <button type="button" disabled={!canUndo} onClick={() => { onChange(undo.before); setUndo(null); }} className="ml-2 rounded-lg border px-3 py-1 disabled:opacity-40">ย้อนกลับการนำเข้าครั้งล่าสุด</button>{!canUndo && <p className="text-xs text-slate-500">มีการแก้ไข Timeline ต่อแล้ว จึงปิดการย้อนกลับเพื่อป้องกันข้อมูลใหม่หาย</p>}</div>}
      </div>
    </div>
  </div>;
}
