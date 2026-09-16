export function getImprovementProgress(status?: string | null) {
  switch (status) {
    case 'MONITORING':
      return { label: 'กำลังติดตามมาตรการ', detail: 'เปิดดูงานแก้ไขและผลประเมินที่บันทึกไว้', className: 'text-blue-700 dark:text-blue-300' };
    case 'CLOSED':
      return { label: 'ปิดการติดตามมาตรการแล้ว', detail: 'อ่านมาตรการและผลประเมินในรายละเอียด', className: 'text-slate-700 dark:text-slate-300' };
    case 'NOT_REQUIRED':
      return { label: 'ไม่มีมาตรการที่อยู่ระหว่างติดตาม', detail: 'ตรวจเหตุผลและผลการทบทวนในรายละเอียด', className: 'text-slate-500 dark:text-slate-400' };
    case 'NOT_STARTED':
      return { label: 'ยังไม่เริ่มติดตามมาตรการ', detail: 'ติดตามความคืบหน้าการทบทวนเหตุการณ์', className: 'text-slate-500 dark:text-slate-400' };
    default:
      return { label: 'ยังไม่มีข้อมูลการติดตามมาตรการ', detail: 'เปิดรายละเอียดเพื่อตรวจสอบข้อมูลที่มี', className: 'text-slate-500 dark:text-slate-400' };
  }
}
