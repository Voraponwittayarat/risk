export const NRLS_CUTOVER_DATE = '2026-10-01';
export const NRLS_CUTOVER_DATE_THAI = '1 ตุลาคม 2569';

function toDateKey(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

export function isNrlsRequired(value: string | Date): boolean {
  return toDateKey(value) >= NRLS_CUTOVER_DATE;
}

export function maxWithNrlsCutover(value: Date): Date {
  const cutover = new Date(`${NRLS_CUTOVER_DATE}T00:00:00.000Z`);
  return value < cutover ? cutover : value;
}
