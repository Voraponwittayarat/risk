import type { TimelineItem } from '../components/rca/EventTimeline';
import { parseTimelinePaste } from './timelinePaste.ts';

export interface TimelineEvidence extends TimelineItem {
  source_text: string;
  source_line: number;
  issues: string[];
}

const normalizeDigits = (value: string) => value.replace(/[๐-๙]/g, c => String(c.charCodeAt(0) - 0x0e50));
function dateValue(raw: string): string {
  const parts = raw.includes('/') ? raw.split('/').reverse() : raw.split('-');
  let year = Number(parts[0]);
  if (year >= 2400) year -= 543;
  const value = `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : '';
}

// Extract only verbatim evidence. This deliberately does not infer dates, harm,
// clinical facts, critical points or an order that is absent from the source.
export function extractTimelineEvidence(text: string): TimelineEvidence[] {
  if (!text.trim()) throw new Error('กรุณาวางข้อมูลต้นฉบับ');
  if (text.length > 30000) throw new Error('รองรับครั้งละไม่เกิน 30,000 ตัวอักษร กรุณาแบ่งข้อมูลเป็นช่วง');
  let rows: TimelineEvidence[];
  if (text.includes('\t')) {
    const records = timelineSourceRecords(text);
    const header = /^(วันที่|date|เวลา|time|วันเวลา|วันที่และเวลา)\t/i.test(records[0] || '') && /เหตุการณ์|event|รายละเอียด|description/i.test(records[0] || '');
    if (header) records.shift();
    rows = parseTimelinePaste(text).map((row, index) => ({ ...row, source_text: records[index], source_line: index + 1 + Number(header), issues: [] }));
  } else {
    rows = [];
    let explicitDate = '', dateEvidence = '';
    text.split(/\r?\n/).forEach((source, index) => {
      if (!source.trim()) return;
      const normalized = normalizeDigits(source);
      const dates = [...normalized.matchAll(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/g)];
      const times = [...normalized.matchAll(/\b\d{1,2}[:.]\d{2}\b/g)];
      const issues: string[] = [];
      const foundDate = dates.length === 1 ? dateValue(dates[0][0]) : '';
      const dateOnly = dates.length === 1 && normalized.replace(dates[0][0], '').replace(/วันที่|วัน|[:\s]/g, '') === '';
      if (dateOnly && foundDate) { explicitDate = foundDate; dateEvidence = source; return; }
      if (dates.length) { explicitDate = ''; dateEvidence = ''; }
      if (dates.length > 1) issues.push('มีหลายวันที่ในบรรทัด กรุณาแยกเหตุการณ์');
      else if (dates.length && !foundDate) issues.push('วันที่ไม่ถูกต้อง');
      let time = '';
      if (times.length === 1) {
        const [h, m] = times[0][0].split(/[:.]/).map(Number);
        if (h < 24 && m < 60) time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        else issues.push('เวลาไม่ถูกต้อง');
      } else if (times.length > 1) issues.push('มีหลายเวลา/ช่วงเวลา กรุณาตรวจและแยกเหตุการณ์');
      rows.push({ event_date: foundDate || explicitDate, event_time: time, event_description: source.trim(), is_critical_point: false, source_text: dateEvidence ? `${dateEvidence}\n${source}` : source, source_line: index + 1, issues });
    });
  }
  if (!rows.length || rows.length > 200) throw new Error('รองรับครั้งละ 1–200 เหตุการณ์');
  rows.forEach(row => {
    if (!row.event_date) row.issues.push('ไม่ระบุวันที่ — เว้นไว้ได้');
    if (!row.event_time) row.issues.push('ไม่ระบุเวลา — เว้นไว้ได้');
    else {
      const clocks = [...normalizeDigits(row.event_time).matchAll(/\b(\d{1,2})[:.](\d{2})\b/g)];
      if (clocks.some(match => Number(match[1]) > 23 || Number(match[2]) > 59)) row.issues.push('เวลาไม่ถูกต้อง');
    }
    if (row.event_date && row.event_time && rows.some(other => other !== row && other.event_date === row.event_date && other.event_time === row.event_time && other.event_description !== row.event_description)) row.issues.push('วันเวลาเดียวกันมีข้อความต่างกัน กรุณาตรวจสอบ');
  });
  let previous = '';
  rows.forEach(row => {
    if (!row.event_date || !/^\d{2}:\d{2}$/.test(row.event_time)) return;
    const stamp = `${row.event_date}T${row.event_time}`;
    if (previous && stamp < previous) row.issues.push('วันเวลาย้อนจากรายการก่อนหน้า ระบบคงลำดับต้นฉบับ');
    previous = stamp;
  });
  return rows;
}

export function importTimeline(current: TimelineItem[], incoming: TimelineItem[], mode: 'append' | 'replace'): TimelineItem[] {
  const clean = incoming.map(({ event_date, event_time, event_description, is_critical_point }) => ({ event_date, event_time, event_description, is_critical_point }));
  return mode === 'replace' ? clean : [...current, ...clean];
}
export function timelineSourceRecords(text: string): string[] {
  const records: string[] = [];
  let start = 0, quoted = false, cellStart = true;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && (quoted || cellStart)) {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && c === '\n') {
      records.push(text.slice(start, i).replace(/\r$/, ''));
      start = i + 1; cellStart = true; continue;
    }
    if (!quoted) cellStart = c === '\t';
  }
  records.push(text.slice(start));
  return records.filter(record => record.trim());
}
