export interface StatusInfo {
  dbStatus: string;
  label: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  dotClass: string;
  stepIndex: number;
  description: string;
}

export const STATUS_MAP: Record<string, StatusInfo> = {
  'รายงาน': {
    dbStatus: 'รายงาน',
    label: 'รอยืนยัน',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-600',
    bgLight: 'bg-amber-50 dark:bg-amber-900/30',
    textColor: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700',
    dotClass: 'bg-amber-500 animate-pulse',
    stepIndex: 1,
    description: 'รายงานเข้าระบบแล้ว รอหัวหน้างาน/ผู้รับผิดชอบตรวจสอบ',
  },
  'แก้ไข': {
    dbStatus: 'แก้ไข',
    label: 'ส่งกลับแก้ไข',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-400 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-600',
    bgLight: 'bg-orange-50 dark:bg-orange-900/30',
    textColor: 'text-orange-800 dark:text-orange-300',
    borderColor: 'border-orange-300 dark:border-orange-700',
    dotClass: 'bg-orange-500 animate-pulse',
    stepIndex: 1,
    description: 'ส่งกลับโดยหัวหน้างาน/RM เพื่อให้ผู้รายงานแก้ไขรายละเอียดเพิ่มเติม',
  },
  'ตรวจสอบ': {
    dbStatus: 'ตรวจสอบ',
    label: 'รอทบทวน',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700',
    dotClass: 'bg-blue-500',
    stepIndex: 2,
    description: 'ยืนยันข้อเท็จจริงแล้ว อยู่ในคิวรอการวิเคราะห์สาเหตุ/แก้ไข',
  },
  'ทบทวน': {
    dbStatus: 'ทบทวน',
    label: 'อยู่ระหว่างทบทวน / RCA',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-600',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/30',
    textColor: 'text-indigo-800 dark:text-indigo-300',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    dotClass: 'bg-indigo-500 animate-pulse',
    stepIndex: 3,
    description: 'อยู่ระหว่างดำเนินการทบทวน RCA หรือปรับปรุงกระบวนการ',
  },
  'จำหน่าย': {
    dbStatus: 'จำหน่าย',
    label: 'ปิดเคส / เสร็จสิ้น',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/30',
    textColor: 'text-emerald-800 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    dotClass: 'bg-emerald-500',
    stepIndex: 4,
    description: 'แก้ไขเสร็จสิ้นและมีมาตรการป้องกันความเสี่ยงเรียบร้อยแล้ว',
  },
  'ไม่ใช่ความเสี่ยง': {
    dbStatus: 'ไม่ใช่ความเสี่ยง',
    label: 'ไม่ใช่ความเสี่ยง / ยกเลิก',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    bgLight: 'bg-slate-100 dark:bg-slate-800/50',
    textColor: 'text-slate-700 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
    stepIndex: 0,
    description: 'ตรวจสอบแล้วไม่เข้าข่ายอุบัติการณ์ความเสี่ยง',
  },
};

export function getStatusInfo(status?: string | null): StatusInfo {
  if (!status) return STATUS_MAP['รายงาน'];
  return STATUS_MAP[status] || {
    dbStatus: status,
    label: status,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    bgLight: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    stepIndex: 1,
    description: status,
  };
}

export function isSentinelEvent(level?: string | null, riskstoreId?: number | string | null): boolean {
  if (!level) return false;
  const l = level.toUpperCase().trim();
  const isGeneralSentinel = ['G', 'H', 'I', '4', '5'].includes(l);
  
  const rid = Number(riskstoreId);
  const isFallSentinel = ['E', 'F'].includes(l) && [297, 298, 300, 302].includes(rid);
  const isSuicideSentinel = rid === 2000071;

  return isGeneralSentinel || isFallSentinel || isSuicideSentinel;
}

export function getSeverityBadge(level?: string | null, riskstoreId?: number | string | null): { label: string; badgeClass: string; isSentinel: boolean } {
  if (!level) return { label: '-', badgeClass: 'bg-slate-100 text-slate-700', isSentinel: false };
  const l = level.toUpperCase().trim();
  const isSentinel = isSentinelEvent(l, riskstoreId);

  if (['H', 'I', '5'].includes(l)) {
    return { label: l, badgeClass: 'bg-red-600 text-white font-bold shadow-sm ring-2 ring-red-300 dark:ring-red-900', isSentinel };
  }
  if (['G', '4'].includes(l)) {
    return { label: l, badgeClass: 'bg-red-500 text-white font-bold shadow-sm', isSentinel };
  }
  if (['E', 'F', '3'].includes(l)) {
    // If it's a fall with Level E/F or suicide attempt, it will have isSentinel = true and can show as sentinel alert badge
    return { 
      label: l, 
      badgeClass: isSentinel 
        ? 'bg-red-500 text-white font-bold shadow-sm animate-pulse' 
        : 'bg-amber-500 text-white font-bold shadow-sm', 
      isSentinel 
    };
  }
  if (['C', 'D', '2'].includes(l)) {
    // If suicide attempt is Level C/D/other, it is still Sentinel, so we can give it special badge styling
    return {
      label: l,
      badgeClass: isSentinel
        ? 'bg-red-500 text-white font-bold shadow-sm animate-pulse'
        : 'bg-yellow-500 text-white font-bold shadow-sm',
      isSentinel
    };
  }
  if (['B'].includes(l)) {
    return { label: l, badgeClass: 'bg-slate-500 text-white font-medium', isSentinel: false };
  }
  return { label: l, badgeClass: 'bg-emerald-500 text-white font-medium', isSentinel: false };
}
