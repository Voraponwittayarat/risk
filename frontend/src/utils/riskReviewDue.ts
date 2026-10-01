// Compare calendar days in the hospital's timezone, including date-only API values.
export function reviewDue(value?: string | null, now = new Date()) {
  const day = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day')) / 86400000;
  };
  if (!value || !Number.isFinite(Date.parse(value))) return { label: 'ยังไม่กำหนดวันทบทวน', className: 'text-slate-600' };
  const remaining = day(new Date(value)) - day(now);
  if (remaining < 0) return { label: `เกินกำหนด ${-remaining} วัน`, className: 'text-red-700' };
  if (remaining === 0) return { label: 'ครบกำหนดวันนี้', className: 'text-amber-700' };
  if (remaining <= 30) return { label: `ใกล้ถึงกำหนด อีก ${remaining} วัน`, className: 'text-amber-700' };
  return { label: `อีก ${remaining} วัน`, className: 'text-slate-600' };
}
