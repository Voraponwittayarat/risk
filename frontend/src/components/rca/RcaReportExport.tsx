import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildRcaReportHtml, downloadRcaDoc, getRcaReportSections, type RcaReportData } from '../../utils/rcaReport';

export default function RcaReportExport({ data, hasUnsavedChanges }: { data: RcaReportData; hasUnsavedChanges: boolean }) {
  const sections = useMemo(() => getRcaReportSections(data), [data]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => buildRcaReportHtml(sections, selected, `RCA ${data.caseId}`), [sections, selected, data.caseId]);
  const toggle = (id: string) => { setReady(false); setSelected(current => current.includes(id) ? current.filter(v => v !== id) : [...current, id]); };
  return <>
    <button type="button" onClick={() => { setSelected(sections.map(s => s.id)); setReady(false); setOpen(true); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">ส่งออกรายงาน Word / PDF</button>
    {open && createPortal(<div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="rca-export-title">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 id="rca-export-title" className="text-lg font-bold text-slate-900">เลือกข้อมูลและดูตัวอย่างรายงาน RCA</h2><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-2 text-sm">ปิด</button></div>
        <p className="mt-2 text-sm text-slate-600">เลือกเฉพาะส่วนที่มีข้อมูลไว้ให้แล้ว ช่องว่างและเครื่องมือของหน้าเว็บจะไม่อยู่ในรายงาน</p>
        {hasUnsavedChanges && <p className="mt-2 text-sm text-amber-800">รายงานใช้ข้อมูลที่เห็นในแบบฟอร์ม รวมถึงการแก้ไขที่ยังไม่บันทึก กรุณาบันทึกร่างเพื่อเก็บข้อมูลในระบบด้วย</p>}
        <div className="my-4 flex flex-wrap gap-2">{sections.map(s => <label key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />{s.title}</label>)}</div>
        <div className="mb-3 flex flex-wrap gap-3">
          <button type="button" disabled={!selected.length} onClick={() => downloadRcaDoc(html, data.caseId)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">ส่งออก Word (.doc)</button>
          <button type="button" disabled={!selected.length || !ready} onClick={() => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">ส่งออก PDF / พิมพ์</button>
        </div>
        <p className="mb-3 text-xs text-slate-500">PDF: เลือก “บันทึกเป็น PDF” ในหน้าพิมพ์ และปิดหัว/ท้ายกระดาษของเบราว์เซอร์ · Word: ไฟล์ .doc แบบ HTML ที่เปิดและแก้ไขใน Microsoft Word ได้</p>
        {!selected.length && <p role="alert" className="mb-3 text-sm text-amber-800">กรุณาเลือกอย่างน้อยหนึ่งส่วน</p>}
        <iframe ref={frame} title="ตัวอย่างรายงาน RCA" srcDoc={html} onLoad={() => setReady(true)} className="h-[65vh] w-full rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>, document.body)}
  </>;
}
