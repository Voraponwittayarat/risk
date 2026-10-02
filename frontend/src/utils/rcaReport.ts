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
const table = (columns: [string, string][], rows: Row[], mergeDates = false) => {
  const filled = rows.filter(row => columns.some(([key]) => has(row[key])));
  if (!filled.length) return '';
  const visible = columns.filter(([key]) => filled.some(row => has(row[key])));
  const weights = visible.map(([key]) => key === 'event_description' ? 5 : ['event_time', 'critical'].includes(key) ? 1 : 2);
  const total = weights.reduce((a, b) => a + b, 0);
  return `<table><colgroup>${weights.map(w => `<col style="width:${100 * w / total}%">`).join('')}</colgroup><thead><tr>${visible.map(([, title]) => `<th>${text(title)}</th>`).join('')}</tr></thead><tbody>${filled.map((row, index) => `<tr>${visible.map(([key]) => {
    if (mergeDates && key === 'date' && has(row.date)) {
      if (index > 0 && filled[index - 1].date === row.date) return '';
      let span = 1;
      while (index + span < filled.length && filled[index + span].date === row.date) span++;
      return `<td rowspan="${span}" class="date-group">${text(row.date)}</td>`;
    }
    return `<td>${text(row[key])}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
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
  add('timeline', 'รายละเอียดเหตุการณ์ตามลำดับเวลา (Timeline)', table([['date', 'วันที่'], ['event_time', 'เวลา'], ['event_description', 'เหตุการณ์'], ['critical', 'จุดวิกฤต']], d.timelines.filter(t => has(t.event_description)).map(t => ({ ...t, date: reportDate(t.event_date), critical: t.is_critical_point ? 'จุดวิกฤต' : '' })), true));
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
export function buildRcaReportHtml(sections: ReportSection[], selected: string[], title = 'รายงาน RCA', assets?: { logo: string; regular: string; bold: string }): string {
  const fontFaces = assets ? `@font-face{font-family:'TH SarabunPSK';src:url('${assets.regular}')} @font-face{font-family:'TH SarabunPSK';font-weight:700;src:url('${assets.bold}')}` : '';
  const reference = title.replace(/^RCA\s*/, '') || 'DRAFT';
  return `<!DOCTYPE html><html lang="th" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeReportText(title)}</title><style>
    ${fontFaces} @page { size:A4; margin:12mm 12mm 16mm; } *{box-sizing:border-box} body{font-family:'TH SarabunPSK','TH Sarabun New',sans-serif;color:#111827;font-size:14pt;line-height:1.2;margin:0;padding:12mm;background:white} h1{font-size:14pt;margin:2mm 0 0} h2{font-size:14pt;margin:5mm 0 2mm;color:#064e3b;break-after:avoid} h3{font-size:14pt;break-after:avoid} p{margin:1mm 0;overflow-wrap:anywhere} table{border-collapse:collapse;width:100%;table-layout:fixed;margin:2mm 0 4mm;font-size:14pt} th,td{border:0.2mm solid #aab7be;padding:1.5mm 2mm;text-align:left;vertical-align:top;overflow-wrap:anywhere} th{background:#edf4f5;color:#183c45;font-weight:bold} thead{display:table-header-group} tr{break-inside:avoid} .date-group{vertical-align:middle;text-align:center} .brand{border-bottom:1mm double #065f46;margin:0 0 4mm;break-inside:avoid} .brand td{border:0;padding:0 2mm 3mm;vertical-align:middle} .brand .heading{text-align:center} .hospital{font-weight:bold;color:#064e3b} .reference{border:0.2mm solid #334155;padding:2mm;font-size:14pt} .logo{width:23mm;height:23mm;object-fit:contain} @media print{body{padding:0} th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><table class="brand"><colgroup><col style="width:17%"><col style="width:55%"><col style="width:28%"></colgroup><tbody><tr><td>${assets ? `<img class="logo" width="87" height="87" src="${assets.logo}" alt="ตราสัญลักษณ์โรงพยาบาลวังเจ้า">` : ''}</td><td class="heading"><div class="hospital">โรงพยาบาลวังเจ้า</div><div>WANG CHAO HOSPITAL</div><h1>แบบวิเคราะห์สาเหตุรากเหง้าเชิงระบบ</h1><div>Root Cause Analysis Report</div></td><td><div class="reference"><strong>รหัสเอกสาร</strong><br>RM-RCA-FM-01<br><strong>เลขที่อ้างอิง</strong><br>${text(reference)}</div></td></tr></tbody></table>${sections.filter(s => selected.includes(s.id)).map((s, i) => `<section><h2>${i + 1}. ${text(s.title)}</h2>${s.html}</section>`).join('')}</body></html>`;
}
export function buildRcaWordDocument(html: string): string {
  const logo = html.match(/src="data:(image\/png);base64,([A-Za-z0-9+/=]+)"/);
  if (!logo) return '\ufeff' + html;
  const boundary = '----RiskHRMSRcaReport';
  const location = 'file:///C:/RCA-report-assets/logo.png';
  const body = html.replace(logo[0], `src="${location}"`);
  const base64 = btoa(Array.from(new TextEncoder().encode(body), byte => String.fromCharCode(byte)).join(''));
  const wrap = (value: string) => value.match(/.{1,76}/g)?.join('\r\n') || '';
  return `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/RCA-report.html\r\n\r\n${wrap(base64)}\r\n--${boundary}\r\nContent-Type: image/png\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ${location}\r\n\r\n${wrap(logo[2])}\r\n--${boundary}--\r\n`;
}
export function downloadRcaDoc(html: string, caseId: string) {
  const blob = new Blob([buildRcaWordDocument(html)], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `RCA-${(caseId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
