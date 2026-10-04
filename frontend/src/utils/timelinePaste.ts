export function parseTimelinePaste(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && (quoted || cell === '')) {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (char === '\t' || char === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = '';
      if (char === '\n') { rows.push(row); row = []; }
    } else cell += char;
  }
  if (quoted) throw new Error('เครื่องหมายคำพูดในตารางปิดไม่ครบ');
  row.push(cell.replace(/\r$/, '')); rows.push(row);
  const data = rows.filter(r => r.some(c => c.trim()));
  if (/^(วันที่|date|เวลา|time|วันเวลา|วันที่และเวลา)$/i.test(data[0]?.[0]?.trim() || '') && /เหตุการณ์|event|รายละเอียด|description/i.test(data[0]?.join(' ') || '')) data.shift();
  if (!data.length || data.length > 200) throw new Error('วางตารางครั้งละ 1–200 แถว');
  return data.map((r, index) => {
    if (r.length === 2) {
      const combined = r[0].trim().match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?:[ T]+(.*))?$/);
      r = combined ? [combined[1], combined[2] || '', r[1]] : ['', r[0], r[1]];
    }
    if (r.length < 3 || r.length > 4) throw new Error(`แถว ${index + 1}: ใช้ เวลา–เหตุการณ์ (2 คอลัมน์) หรือ วันที่–เวลา–เหตุการณ์ และจุดวิกฤต (3–4 คอลัมน์)`);
    let date = r[0].trim();
    if (date) {
      const thai = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (thai) { let year = Number(thai[3]); if (year >= 2400) year -= 543; date = `${year}-${thai[2].padStart(2, '0')}-${thai[1].padStart(2, '0')}`; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error(`แถว ${index + 1}: วันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD หรือ วัน/เดือน/ปี 4 หลัก`);
    }
    const time = r[1].trim(), description = r[2].trim(), critical = r[3]?.trim() || '';
    if (!description || time.length > 100) throw new Error(`แถว ${index + 1}: ต้องระบุเหตุการณ์ และเวลาไม่เกิน 100 ตัวอักษร`);
    if (critical && !/^(1|0|true|false|yes|no|ใช่|ไม่|จุดวิกฤต)$/i.test(critical)) throw new Error(`แถว ${index + 1}: จุดวิกฤตใช้ ใช่/ไม่ หรือ 1/0`);
    return { event_date: date, event_time: time, event_description: description, is_critical_point: /^(1|true|yes|ใช่|จุดวิกฤต)$/i.test(critical) };
  });
}
