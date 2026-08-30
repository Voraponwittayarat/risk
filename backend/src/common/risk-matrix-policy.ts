export type RiskLevel = 'green' | 'yellow' | 'orange' | 'red';

// RiskMatrix5x5_2024: the colour is determined by the L/C coordinate, not by
// score bands alone. For example, L1 x C5 has score 5 but remains red.
const RISK_LEVEL_GRID: RiskLevel[][] = [
  ['green', 'green', 'green', 'yellow', 'yellow'],
  ['green', 'yellow', 'yellow', 'orange', 'orange'],
  ['yellow', 'yellow', 'orange', 'red', 'red'],
  ['orange', 'orange', 'red', 'red', 'red'],
  ['red', 'red', 'red', 'red', 'red'],
];

// The frequent boundary in the hospital reference is approximately daily,
// accumulated for each observation month (30, 60, 91 ... 365).
const FREQUENT_MIN_BY_MONTH = [30, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 365];

export function clampMatrixValue(value: number): number {
  return Math.min(5, Math.max(1, Math.trunc(Number(value) || 1)));
}

export function consequenceFromSeverity(level: string | null | undefined): number {
  const value = String(level || '').trim().toUpperCase();
  if (['A', 'B', '1'].includes(value)) return 1;
  if (['C', 'D', '2'].includes(value)) return 2;
  if (['E', 'F', '3'].includes(value)) return 3;
  if (['G', 'H', '4'].includes(value)) return 4;
  if (['I', '5'].includes(value)) return 5;
  return 1;
}

export function likelihoodFromAnnualCount(count: number, observationMonths: number): number {
  const incidents = Math.max(0, Math.trunc(Number(count) || 0));
  const months = Math.min(12, Math.max(0, Math.trunc(Number(observationMonths) || 0)));
  if (incidents === 0 || months === 0) return 0;
  if (incidents <= months) return 1;
  if (incidents <= (4 * months) - 1) return 2;
  if (incidents <= (7 * months) - 1) return 3;
  if (incidents < FREQUENT_MIN_BY_MONTH[months - 1]) return 4;
  return 5;
}

export function riskLevelFor(likelihood: number, consequence: number): RiskLevel {
  const l = clampMatrixValue(likelihood);
  const c = clampMatrixValue(consequence);
  return RISK_LEVEL_GRID[c - 1][l - 1];
}

export function currentFiscalYear(now = new Date()): number {
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

export function fiscalYearPeriod(fiscalYear: number): { start: Date; end: Date } {
  const year = Math.trunc(Number(fiscalYear));
  return {
    start: new Date(year - 1, 9, 1, 0, 0, 0, 0),
    end: new Date(year, 8, 30, 23, 59, 59, 999),
  };
}

export function elapsedFiscalMonths(fiscalYear: number, now = new Date()): number {
  const { start, end } = fiscalYearPeriod(fiscalYear);
  if (now < start) return 0;
  if (now > end) return 12;
  return Math.min(12, Math.max(1, ((now.getFullYear() - start.getFullYear()) * 12) + now.getMonth() - start.getMonth() + 1));
}

