import { getContributingFactor, type ContributingFactorSelection } from './contributingFactors.ts';
import type { TimelineItem } from '../components/rca/EventTimeline';

type Row = Record<string, unknown>;
export interface RcaReportData {
  caseId: string; rmNo: string; topic: string; severity: string; incidentDate: string; team: string; department: string;
  whatHappened: string; actualImpact: string; potentialImpact: string;
  timelines: TimelineItem[]; cmps: Row[]; processes: Row[]; capas: Row[]; sessions: Row[]; participants: Row[]; interviews: Row[];
  factors: ContributingFactorSelection[]; legacyFactors: Row[]; barriers: string[];
}
export interface ReportSection { id: string; title: string; html: string; }
const has = (value: unknown) => typeof value === 'string' ? Boolean(value.trim()) : value !== null && value !== undefined && value !== '';
export const escapeReportText = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const text = (value: unknown) => escapeReportText(value).replace(/\r?\n/g, '<br>');
export function reportDate(value: unknown, time = false): string {
  if (!has(value)) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) });
}
const fields = (items: [string, unknown][]) => {
  const filled = items.filter(([, v]) => has(v));
  return filled.length ? `<table><colgroup><col style="width:27%"><col style="width:73%"></colgroup><tbody>${filled.map(([label, value]) => `<tr><th scope="row">${text(label)}</th><td>${text(value)}</td></tr>`).join('')}</tbody></table>` : '';
};
const table = (columns: [string, string][], rows: Row[]) => {
  const filled = rows.filter(row => columns.some(([key]) => has(row[key])));
  if (!filled.length) return '';
  const visible = columns.filter(([key]) => filled.some(row => has(row[key])));
  const weights = visible.map(([key]) => key === 'event_description' ? 5 : ['event_time', 'critical'].includes(key) ? 1 : 2);
  const total = weights.reduce((a, b) => a + b, 0);
  return `<table><colgroup>${weights.map(w => `<col style="width:${100 * w / total}%">`).join('')}</colgroup><thead><tr>${visible.map(([, title]) => `<th>${text(title)}</th>`).join('')}</tr></thead><tbody>${filled.map(row => `<tr>${visible.map(([key]) => `<td>${text(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
};
export function getRcaReportSections(d: RcaReportData): ReportSection[] {
  const sections: ReportSection[] = [];
  const add = (id: string, title: string, html: string) => { if (html) sections.push({ id, title, html }); };
  add('facts', 'ข้อมูลเหตุการณ์และผลกระทบ', fields([
    ['รหัส RCA', d.caseId], ['RM No.', d.rmNo], ['อุบัติการณ์ที่เกิดขึ้น', d.topic], ['วันที่เกิดเหตุการณ์', reportDate(d.incidentDate)],
    ['ระดับความรุนแรง', d.severity], ['หน่วยงาน', d.department], ['ทีมทบทวน', d.team],
    ['รายละเอียดเหตุการณ์', d.whatHappened], ['ผลกระทบที่เกิดขึ้นจริง', d.actualImpact], ['ผลกระทบที่อาจเกิดขึ้น', d.potentialImpact],
  ]));
  add('sessions', 'บันทึกการทบทวน', table([['date', 'วันที่ทบทวน'], ['reviewers', 'ผู้ทบทวน'], ['notes', 'ผลการทบทวน']], d.sessions.filter(s => has(s.reviewers) || has(s.notes) || has(s.review_date_time)).map(s => ({ ...s, date: reportDate(s.review_date_time, true) }))));
  add('timeline', 'รายละเอียดเหตุการณ์ตามลำดับเวลา (Timeline)', table([['date', 'วันที่'], ['event_time', 'เวลา'], ['event_description', 'เหตุการณ์'], ['critical', 'จุดวิกฤต']], d.timelines.filter(t => has(t.event_description)).map(t => ({ ...t, date: reportDate(t.event_date), critical: t.is_critical_point ? 'จุดวิกฤต' : '' }))));
  add('cmps', 'ข้อสังเกตและปัญหาในการดูแล (CMPs)', table([['observation', 'สิ่งที่สังเกต'], ['hypothesis', 'สมมติฐาน / ปัญหาในการดูแล'], ['comment', 'ข้อมูลเพิ่มเติม / ความเห็น']], d.cmps));
  const factors = d.factors.map(f => ({ process_key: f.process_key || '', factor: `${f.code} ${getContributingFactor(f.code)?.labelTh || ''}`, detail: f.detail || '' }));
  const processes: Row[] = d.processes.filter(p => Object.entries(p).some(([key, v]) => key !== 'process_key' && has(v)) || factors.some(f => f.process_key === p.process_key)).map(p => ({
    ...p,
    selected_factors: factors.filter(f => f.process_key === p.process_key).map(f => `${f.factor}${f.detail ? ': ' + f.detail : ''}`).join('\n'),
  }));
  add('processes', 'การวิเคราะห์กระบวนการและสาเหตุ', table([
    ['process_key', 'กระบวนการ'], ['problem', 'ปัญหาในการดูแล (CMPs)'], ['tier1_personnel', '1 บุคลากร'], ['tier2_teamwork', '2 ทีมงาน'], ['tier3_environment', '3 สิ่งแวดล้อม'], ['tier4_policy', '4 นโยบายองค์กร'], ['tier5_external', '5 ภายนอกองค์กร'], ['selected_factors', 'ปัจจัย NRLS / ข้อค้นพบ'], ['corrective_action', 'แนวทางแก้ไข / ป้องกัน'],
  ], processes));
  add('factors', 'ปัจจัยร่วมและข้อค้นพบ', table([['process_key', 'กระบวนการ'], ['factor', 'ปัจจัย NRLS'], ['detail', 'ข้อค้นพบเฉพาะเหตุการณ์']], factors.filter(f => !processes.some(p => p.process_key === f.process_key))));
  add('legacy', 'สาเหตุที่บันทึกไว้เพิ่มเติม', table([['category', 'หมวด'], ['factor', 'สาเหตุ'], ['sub_factor', 'รายละเอียด']], d.legacyFactors));
  add('barriers', 'ช่องโหว่ของแนวป้องกัน (Swiss Cheese)', fields(d.barriers.map((v, i) => [['องค์กรและนโยบาย', 'การกำกับดูแลและหัวหน้างาน', 'สภาพแวดล้อมและเงื่อนไข', 'การกระทำที่ไม่ปลอดภัย'][i], v])));
  add('actions', 'รายงานสรุปมาตรการแก้ไขและป้องกัน', table([
    ['action', 'กิจกรรม / แนวทางแก้ไข / มาตรการป้องกัน'], ['responsible', 'หน่วยงาน / ผู้รับผิดชอบ'], ['date', 'กำหนดเสร็จ'], ['evidence', 'หลักฐาน / ผลดำเนินการ'],
  ], d.capas.filter(c => has(c.action) || has(c.evidence)).map(c => ({ ...c, date: reportDate(c.due_date), evaluation: reportDate(c.effectiveness_due_date) }))));
  add('effectiveness', 'การติดตามประสิทธิผลของมาตรการ', table([
    ['action', 'มาตรการ'], ['effectiveness_criteria', 'เกณฑ์วัดผล'], ['baseline_value', 'ค่าตั้งต้น'], ['target_value', 'เป้าหมาย'], ['evaluation', 'วันประเมิน'],
  ], d.capas.filter(c => ['action', 'effectiveness_criteria', 'baseline_value', 'target_value'].some(k => has(c[k])) && ['effectiveness_criteria', 'baseline_value', 'target_value', 'effectiveness_due_date'].some(k => has(c[k]))).map(c => ({ ...c, evaluation: reportDate(c.effectiveness_due_date) }))));
  const roleNames: Record<string, string> = { OWNER: 'เจ้าของเรื่อง', FACILITATOR: 'ผู้นำการทบทวน', INFORMANT: 'ผู้ให้ข้อมูล', ANALYST: 'ผู้ร่วมวิเคราะห์', APPROVER: 'ผู้อนุมัติ' };
  add('team', 'รายชื่อผู้ร่วมทบทวน', table([['display_name', 'ชื่อ / หน่วยงาน / ทีม'], ['role_name', 'บทบาท'], ['purpose', 'หน้าที่ในการทบทวน']], d.participants.filter(p => has(p.display_name)).map(p => ({ ...p, role_name: roleNames[String(p.role)] || p.role }))));
  add('interviews', 'ข้อมูลการสัมภาษณ์ผู้ปฏิบัติงาน', d.interviews.filter(v => ['work_context', 'key_points', 'contributing_conditions', 'suggestions'].some(k => has(v[k]))).map((v, i) => `<h3>การสัมภาษณ์ครั้งที่ ${i + 1}</h3>${fields([
    ['ผู้ให้สัมภาษณ์', v.interviewee_name], ['บทบาท', v.interviewee_role], ['หน่วยงาน', v.interviewee_department], ['วันที่สัมภาษณ์', reportDate(v.interview_date, true)], ['บริบทการทำงาน', v.work_context], ['ประเด็นสำคัญ', v.key_points], ['เงื่อนไขที่เกี่ยวข้อง', v.contributing_conditions], ['ข้อเสนอแนะ', v.suggestions],
  ])}`).join(''));
  return sections;
}
export function buildRcaReportHtml(sections: ReportSection[], selected: string[], title = 'รายงาน RCA'): string {
  return `<!DOCTYPE html><html lang="th" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeReportText(title)}</title><style>
    @page { size:A4; margin:16mm; } *{box-sizing:border-box} body{font-family:Tahoma,'Leelawadee UI',sans-serif;color:#182333;font-size:12px;line-height:1.55;margin:0;padding:24px;background:white} h1{text-align:center;font-size:19px;margin:0 0 4px} .hospital{text-align:center;margin:0 0 22px} h2{font-size:14px;margin:20px 0 8px;color:#174d59;break-after:avoid} h3{font-size:12px;break-after:avoid} p{margin:5px 0;overflow-wrap:anywhere} table{border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0 14px;font-size:11px} th,td{border:1px solid #aab7be;padding:6px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere} th{background:#edf4f5;color:#183c45;font-weight:bold} thead{display:table-header-group} tr{break-inside:avoid} @media print{body{padding:0} th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><h1>แบบบันทึกการวิเคราะห์ RCA (Root Cause Analysis)</h1><p class="hospital">โรงพยาบาลวังเจ้า</p>${sections.filter(s => selected.includes(s.id)).map((s, i) => `<section><h2>${i + 1}. ${text(s.title)}</h2>${s.html}</section>`).join('')}</body></html>`;
}
export function downloadRcaDoc(html: string, caseId: string) {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `RCA-${(caseId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
