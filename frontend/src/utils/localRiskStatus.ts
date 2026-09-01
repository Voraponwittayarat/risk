export function isSelectableLocalRisk(localRisk: any): boolean {
  return String(localRisk?.status ?? '').trim() !== '0';
}
