type EffectivenessReview = {
  id: number;
  review_date: string;
  result: string;
  measured_value?: string | null;
  observation?: string | null;
};

type ImprovementAction = {
  id: number;
  action: string;
  status: string;
  responsible_display_name?: string | null;
  due_date?: string | null;
  evidence?: string | null;
  effectiveness_criteria?: string | null;
  baseline_value?: string | null;
  target_value?: string | null;
  effectiveness_due_date?: string | null;
  effectiveness_reviews?: EffectivenessReview[];
};

const statusLabels: Record<string, string> = {
  PENDING: 'รอเริ่มดำเนินการ', IN_PROGRESS: 'กำลังดำเนินการ',
  IMPLEMENTED: 'ดำเนินมาตรการแล้ว', AWAITING_EFFECTIVENESS: 'รอประเมินประสิทธิผล',
  AWAITING_APPROVAL: 'รออนุมัติปิด', REWORK: 'ส่งกลับปรับปรุง',
  CLOSED: 'ปิดการติดตามแล้ว', CANCELLED: 'ยกเลิกมาตรการ',
};
const resultLabels: Record<string, string> = {
  EFFECTIVE: 'ได้ผล', PARTIALLY_EFFECTIVE: 'ได้ผลบางส่วน', INEFFECTIVE: 'ไม่ได้ผล',
};
const date = (value?: string | null) => {
  if (!value || Number.isNaN(Date.parse(value))) return 'ยังไม่ระบุ';
  return new Date(value).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' });
};

// Read-only feedback from the actions already authorized and returned by the
// incident-detail API. No extra requests or permission changes are needed.
export default function IncidentImprovementFeedback({ actions }: { actions?: ImprovementAction[] }) {
  return (
    <section id="improvement-feedback" aria-labelledby="improvement-feedback-title" className="scroll-mt-24 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900 dark:bg-slate-800">
      <h2 id="improvement-feedback-title" className="text-lg font-bold text-slate-900 dark:text-white">สิ่งที่ดำเนินการจากรายงานนี้</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">ติดตามมาตรการ ผู้รับผิดชอบ และผลที่ทีมบันทึกไว้ การปิดเหตุการณ์หรือไม่มีรายงานใหม่ไม่ได้ยืนยันว่ามาตรการได้ผล</p>
      {!actions?.length ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900/50">ยังไม่มีข้อมูลมาตรการที่เชื่อมโยงในรายงานนี้ ดูความคืบหน้าเพิ่มเติมได้จากประวัติการทบทวนด้านล่าง</p> : (
        <div className="mt-4 space-y-3">
          {actions.map(action => {
            const latest = [...(action.effectiveness_reviews || [])].sort((a, b) => b.review_date.localeCompare(a.review_date) || b.id - a.id)[0];
            return (
              <article key={action.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 whitespace-pre-wrap break-words font-semibold text-slate-900 dark:text-white">{action.action || 'ยังไม่ระบุรายละเอียดมาตรการ'}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">{statusLabels[action.status] || 'ยังไม่ระบุสถานะ'}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">ผู้รับผิดชอบ: {action.responsible_display_name || 'ยังไม่ระบุ'} · กำหนดดำเนินการ: {date(action.due_date)}</p>
                <p className="mt-2 font-medium text-blue-800 dark:text-blue-200">{latest ? `ผลประเมินที่บันทึกล่าสุด: ${resultLabels[latest.result] || 'ยังไม่ระบุ'} (${date(latest.review_date)})` : `ยังไม่มีรายละเอียดผลประเมิน · นัดประเมิน: ${date(action.effectiveness_due_date)}`}</p>
                <details className="mt-3">
                  <summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">อ่านมาตรการและหลักฐานการติดตาม</summary>
                  <dl className="mt-3 grid gap-3 whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                    <div><dt className="font-semibold">เกณฑ์ประเมิน</dt><dd>{action.effectiveness_criteria || 'ยังไม่ระบุ'}</dd></div>
                    <div><dt className="font-semibold">ผลดำเนินการ / หลักฐานที่บันทึก</dt><dd>{action.evidence || 'ยังไม่มีข้อมูล'}</dd></div>
                    <div><dt className="font-semibold">ข้อมูลก่อนปรับปรุง</dt><dd>{action.baseline_value || 'ยังไม่ระบุ'}</dd></div>
                    <div><dt className="font-semibold">เป้าหมายที่กำหนด</dt><dd>{action.target_value || 'ยังไม่ระบุ'}</dd></div>
                    {latest && <><div><dt className="font-semibold">ค่าที่วัดได้ล่าสุด</dt><dd>{latest.measured_value || 'ยังไม่ระบุ'}</dd></div><div><dt className="font-semibold">ข้อสังเกตจากการประเมิน</dt><dd>{latest.observation || 'ยังไม่มีข้อมูล'}</dd></div></>}
                  </dl>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
