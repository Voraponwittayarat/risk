export function reviewSummary(process: string, results: string, causes: string) {
  return [
    `การปฏิบัติตามมาตรการ (Process):\n${process.trim()}`,
    `ผลลัพธ์และแนวโน้ม (Results):\n${results.trim()}`,
    `สาเหตุ / RCA และสิ่งที่ต้องปรับ:\n${causes.trim()}`,
  ].join('\n\n');
}

export function reviewPeriodStart(lastReviewed: string | null | undefined, today: string) {
  if (lastReviewed && Number.isFinite(Date.parse(lastReviewed))) return lastReviewed.slice(0, 10);
  const [year, month, day] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  return `${year - 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function reviewEvidence(snapshot: unknown): string {
  try {
    const parsed = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
    return parsed && typeof parsed === 'object' && 'effectiveness_evidence' in parsed && typeof parsed.effectiveness_evidence === 'string'
      ? parsed.effectiveness_evidence : '';
  } catch { return ''; }
}
