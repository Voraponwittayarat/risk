import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, ArrowRight, ClipboardPaste } from 'lucide-react';
import type { TimelineItem } from './EventTimeline';
import { parseTimelinePaste } from '../../utils/timelinePaste';

function dateLabel(value?: string) {
  if (!value) return 'ไม่ระบุวันที่';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${Number(year) + 543}`;
}

export default function TimelineEditor({ items, onChange, defaultDate }: { items: TimelineItem[]; onChange: (items: TimelineItem[]) => void; defaultDate: string }) {
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<TimelineItem[]>([]);
  const [error, setError] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const events = items.filter(item => item.event_description.trim());
  function readPaste(value: string) {
    setPaste(value); setError(''); setPreview([]);
    if (!value.trim()) return;
    try { setPreview(parseTimelinePaste(value)); }
    catch (cause) { setError((cause as Error).message); }
  }
  function change(index: number, field: keyof TimelineItem, value: string | boolean) {
    onChange(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  const input = 'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-bold text-slate-900 dark:text-white">ลำดับเหตุการณ์ RCA</h3><p className="text-xs text-slate-500">กรอกในตาราง หรือวางเซลล์จาก Excel ลงช่องเหตุการณ์ได้โดยตรง</p></div>
      <div className="flex gap-2 print:hidden">
        <button type="button" onClick={() => setShowPaste(value => !value)} aria-expanded={showPaste} className="flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700"><ClipboardPaste size={15} /> วางตารางจาก Excel</button>
        <button type="button" onClick={() => onChange([...items, { event_date: defaultDate, event_time: '', event_description: '', is_critical_point: false }])} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white"><Plus size={15} /> เพิ่มแถว</button>
      </div>
    </div>
    {showPaste && <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:bg-indigo-950/20 print:hidden">
      <p className="text-xs text-indigo-800 dark:text-indigo-200">รองรับ 2 คอลัมน์: เวลา/วันเวลา | เหตุการณ์ หรือ 3–4 คอลัมน์: วันที่ | เวลา | เหตุการณ์ | จุดวิกฤต (ใช่/ไม่) · วันที่ใช้ พ.ศ. หรือ ค.ศ. ได้</p>
      <textarea aria-label="ตาราง Timeline จาก Excel" rows={3} value={paste} onChange={event => readPaste(event.target.value)} placeholder={'วางเซลล์ที่คัดลอกจาก Excel ที่นี่ — เห็นตัวอย่างทันที'} className={input} />
    </div>}
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
    {preview.length > 0 && <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 print:hidden">
      <p className="text-sm font-bold text-emerald-800">ตรวจข้อมูลก่อนเพิ่ม {preview.length} แถว</p>
      <div className="max-h-56 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-1">วันที่</th><th className="p-1">เวลา</th><th className="p-1">เหตุการณ์</th><th className="p-1">จุดวิกฤต</th></tr></thead><tbody>{preview.map((item, index) => <tr key={index} className="border-t border-emerald-100"><td className="p-1">{item.event_date ? dateLabel(item.event_date) : 'ไม่ระบุ'}</td><td className="p-1">{item.event_time}</td><td className="whitespace-pre-wrap p-1">{item.event_description}</td><td className="p-1">{item.is_critical_point ? 'ใช่' : 'ไม่'}</td></tr>)}</tbody></table></div>
      <button type="button" onClick={() => { onChange([...items.filter(item => item.event_description.trim() || item.event_time.trim() || item.event_date), ...preview]); setPreview([]); setPaste(''); setShowPaste(false); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">เพิ่ม {preview.length} แถว (เก็บข้อมูลเดิม)</button>
      <button type="button" onClick={() => { setPreview([]); setPaste(''); setError(''); }} className="ml-2 text-sm text-slate-500">ยกเลิกการวาง</button>
    </div>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[640px] table-fixed text-left text-sm print:min-w-0"><colgroup><col className="w-9" /><col className="w-36" /><col className="w-24" /><col /><col className="w-20" /><col className="w-9" /></colgroup>
        <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr>{['#', 'วันที่', 'เวลา / ช่วงเวลา', 'เหตุการณ์ที่เกิดขึ้น', 'จุดวิกฤต', ''].map((label, index) => <th key={index} className="px-1.5 py-2">{label}</th>)}</tr></thead>
        <tbody>{items.map((item, index) => <tr key={index} className={`border-t border-slate-200 align-top dark:border-slate-700 ${item.is_critical_point ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}`}>
          <td className="px-1.5 py-2 text-center text-xs text-slate-400">{index + 1}</td>
          <td className="p-1"><input type="date" aria-label={`วันที่เหตุการณ์ ${index + 1}`} value={item.event_date?.slice(0, 10) || ''} onChange={event => change(index, 'event_date', event.target.value)} className={input} /></td>
          <td className="p-1"><input aria-label={`เวลาเหตุการณ์ ${index + 1}`} value={item.event_time} onChange={event => change(index, 'event_time', event.target.value)} placeholder="08:30" className={input} /></td>
          <td className="p-1"><textarea aria-label={`เหตุการณ์ ${index + 1}`} rows={2} value={item.event_description} onChange={event => change(index, 'event_description', event.target.value)} onPaste={event => { const text = event.clipboardData.getData('text/plain'); if (text.includes('\t')) { event.preventDefault(); setShowPaste(true); readPaste(text); } }} placeholder="ระบุเหตุการณ์ หรือวางหลายเซลล์จาก Excel" className={`${input} min-h-14 resize-y`} /></td>
          <td className="px-1 py-3 text-center"><input type="checkbox" aria-label={`จุดวิกฤต ${index + 1}`} checked={item.is_critical_point || false} onChange={event => change(index, 'is_critical_point', event.target.checked)} className="accent-rose-600" /></td>
          <td className="px-1 py-2 print:hidden"><button type="button" aria-label={`ลบเหตุการณ์ ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <style>{`@media print { .rca-event-strip { grid-template-rows: auto !important; gap: 8px; } .rca-event-step { grid-column: auto !important; grid-row: auto !important; break-inside: avoid; } }`}</style>
    <section aria-label="ภาพสรุปลำดับเหตุการณ์" className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-teal-50/60 p-3 dark:border-indigo-900 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-slate-900 dark:text-white">ภาพสรุปลำดับเหตุการณ์</h4><p className="text-xs text-slate-500">{events.length} เหตุการณ์ · <span className="text-rose-600">{events.filter(item => item.is_critical_point).length} จุดวิกฤต</span></p></div>
      {!events.length ? <p className="py-5 text-center text-sm text-slate-400">กรอกเหตุการณ์ในตาราง ภาพสรุปจะขึ้นอัตโนมัติ</p> : <>
        <p className="mb-3 text-xs text-slate-500">เรียงตามแถวที่กรอก · ระยะห่างบนเส้นไม่แทนระยะเวลาจริง · สีแดงคือจุดวิกฤต</p>
        <div className="overflow-x-auto pb-2 print:overflow-visible"><div className="rca-event-strip relative grid min-w-max auto-cols-[220px] grid-flow-col gap-x-3 print:min-w-0 print:grid-flow-row print:grid-cols-2" style={{ gridTemplateRows: 'auto 44px auto' }}>
          {events.map((item, index) => {
            const colors = item.is_critical_point ? 'border-rose-200 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100' : index % 3 === 0 ? 'border-sky-200 bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100' : index % 3 === 1 ? 'border-teal-200 bg-teal-50 text-teal-950 dark:bg-teal-950/40 dark:text-teal-100' : 'border-violet-200 bg-violet-50 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100';
            return <div key={index} className="rca-event-step grid grid-rows-subgrid print:block" style={{ gridColumn: index + 1, gridRow: '1 / 4' }}>
              <article className={`relative rounded-xl border p-3 ${colors} ${index % 2 === 0 ? 'row-start-1 self-end' : 'row-start-3 self-start'} print:row-auto print:mb-2`}>
                <p className="flex items-center gap-1 text-xs font-bold">{item.is_critical_point && <AlertTriangle size={14} />} {index + 1}. {dateLabel(item.event_date)} · {item.event_time || 'ไม่ระบุเวลา'}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.event_description}</p>
                <div className={`absolute left-5 h-5 w-px bg-slate-300 print:hidden ${index % 2 === 0 ? '-bottom-5' : '-top-5'}`} />
              </article>
              <div className="relative row-start-2 flex items-center print:hidden"><div className="absolute -left-2 -right-2 h-1 bg-gradient-to-r from-indigo-300 to-teal-300" /><span className={`relative ml-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${item.is_critical_point ? 'bg-rose-500' : 'bg-indigo-500'}`}>{index + 1}</span>{index === events.length - 1 && <ArrowRight className="absolute right-0 text-teal-400" size={20} />}</div>
            </div>;
          })}
        </div></div>
      </>}
    </section>
  </div>;
}
