import {
  consequenceFromSeverity,
  currentFiscalYear,
  elapsedFiscalMonths,
  fiscalYearPeriod,
  likelihoodFromAnnualCount,
  riskLevelFor,
} from './risk-matrix-policy';

describe('RiskMatrix5x5_2024 policy', () => {
  it('maps hospital severity levels to consequence 1-5', () => {
    expect(consequenceFromSeverity('A')).toBe(1);
    expect(consequenceFromSeverity('D')).toBe(2);
    expect(consequenceFromSeverity('F')).toBe(3);
    expect(consequenceFromSeverity('H')).toBe(4);
    expect(consequenceFromSeverity('I')).toBe(5);
  });

  it('uses the monthly cumulative likelihood boundaries', () => {
    expect([1, 2, 4, 7, 30].map((count) => likelihoodFromAnnualCount(count, 1))).toEqual([1, 2, 3, 4, 5]);
    expect([3, 4, 12, 21, 91].map((count) => likelihoodFromAnnualCount(count, 3))).toEqual([1, 2, 3, 4, 5]);
    expect([12, 13, 48, 84, 365].map((count) => likelihoodFromAnnualCount(count, 12))).toEqual([1, 2, 3, 4, 5]);
    expect(likelihoodFromAnnualCount(0, 12)).toBe(0);
  });

  it('uses the coordinate colour table instead of generic score bands', () => {
    expect(riskLevelFor(1, 5)).toBe('red');
    expect(riskLevelFor(1, 4)).toBe('orange');
    expect(riskLevelFor(4, 3)).toBe('red');
    expect(riskLevelFor(3, 1)).toBe('green');
  });

  it('uses the Thai fiscal year from October to September', () => {
    expect(currentFiscalYear(new Date(2026, 7, 25))).toBe(2026);
    expect(currentFiscalYear(new Date(2026, 9, 1))).toBe(2027);
    const period = fiscalYearPeriod(2027);
    expect([period.start.getFullYear(), period.start.getMonth(), period.start.getDate()]).toEqual([2026, 9, 1]);
    expect([period.end.getFullYear(), period.end.getMonth(), period.end.getDate()]).toEqual([2027, 8, 30]);
    expect(elapsedFiscalMonths(2027, new Date(2026, 11, 15))).toBe(3);
    expect(elapsedFiscalMonths(2027, new Date(2026, 7, 25))).toBe(0);
  });
});
