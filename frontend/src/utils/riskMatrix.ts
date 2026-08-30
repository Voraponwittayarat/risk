export type RiskMatrixLevel = 'green' | 'yellow' | 'orange' | 'red';

const levelGrid: RiskMatrixLevel[][] = [
  ['green', 'green', 'green', 'yellow', 'yellow'],
  ['green', 'yellow', 'yellow', 'orange', 'orange'],
  ['yellow', 'yellow', 'orange', 'red', 'red'],
  ['orange', 'orange', 'red', 'red', 'red'],
  ['red', 'red', 'red', 'red', 'red'],
];

const clamp = (value: number) => Math.min(5, Math.max(1, Math.trunc(Number(value) || 1)));

export const getRiskMatrixLevel = (likelihood: number, consequence: number): RiskMatrixLevel => (
  levelGrid[clamp(consequence) - 1][clamp(likelihood) - 1]
);

export const getRiskMatrixClass = (likelihood: number, consequence: number): string => {
  const level = getRiskMatrixLevel(likelihood, consequence);
  if (level === 'red') return 'bg-red-600 text-white border-red-700';
  if (level === 'orange') return 'bg-orange-500 text-white border-orange-600';
  if (level === 'yellow') return 'bg-amber-400 text-amber-950 border-amber-500';
  return 'bg-green-600 text-white border-green-700';
};

