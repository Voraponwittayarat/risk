import { BadRequestException } from '@nestjs/common';

const DAY = 86400000;
export function analyticsPeriod(daysInput: unknown, now = new Date()) {
  const days = Number(daysInput ?? 30);
  if (![30, 90, 180].includes(days))
    throw new BadRequestException('ช่วงเวลาต้องเป็น 30, 90 หรือ 180 วัน');
  // MySQL DATE values are UTC date keys; the reporting day is Bangkok time.
  const today = new Date(now.getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end.getTime() - (days - 1) * DAY);
  const previousStart = new Date(start.getTime() - days * DAY);
  return {
    days,
    start,
    end,
    previousStart,
    previousEnd: new Date(start.getTime() - DAY),
  };
}

export type AnalyticsIncident = {
  id: number;
  id_risk: number;
  date_report: Date;
  department_id: string;
  nrls_code: string | null;
  classification_status: string | null;
  level_id: string;
  rca_required: boolean | null;
  rca_status: string | null;
  rca_due_at: Date | null;
};

export function summarizeSignals(
  rows: AnalyticsIncident[],
  period: ReturnType<typeof analyticsPeriod>,
) {
  const current = rows.filter(
    (r) => r.date_report >= period.start && r.date_report <= period.end,
  );
  const previous = rows.filter(
    (r) =>
      r.date_report >= period.previousStart && r.date_report < period.start,
  );
  const confirmed = (r: AnalyticsIncident) =>
    r.classification_status === 'CONFIRMED' && !!r.nrls_code;
  const severe = (r: AnalyticsIncident) =>
    ['G', 'H', 'I', '4', '5'].includes(r.level_id.trim().toUpperCase());
  const codes = [
    ...new Set(
      [...current, ...previous].filter(confirmed).map((r) => r.nrls_code!),
    ),
  ];
  const priorities = codes
    .map((code) => {
      const items = current.filter((r) => confirmed(r) && r.nrls_code === code);
      const before = previous.filter(
        (r) => confirmed(r) && r.nrls_code === code,
      ).length;
      const groups = new Map<string, number>();
      items.forEach((r) =>
        groups.set(r.department_id, (groups.get(r.department_id) || 0) + 1),
      );
      return {
        code,
        count: items.length,
        previous: before,
        delta: items.length - before,
        percent: before
          ? Math.round(((items.length - before) / before) * 100)
          : null,
        severe: items.filter(severe).length,
        nearMiss: items.filter(
          (r) => r.level_id.trim().toUpperCase() === 'B',
        ).length,
        unsafeConditions: items.filter(
          (r) => r.level_id.trim().toUpperCase() === 'A',
        ).length,
        repeatDepartments: [...groups.values()].filter((n) => n >= 2).length,
        departments: [...groups.entries()]
          .map(([id, count]) => ({
            id,
            count,
            severe: items.filter(
              (r) => r.department_id === id && severe(r),
            ).length,
          }))
          .sort((a, b) => b.severe - a.severe || b.count - a.count),
      };
    })
    .sort(
      (a, b) =>
        b.severe - a.severe ||
        b.delta - a.delta ||
        b.count - a.count ||
        a.code.localeCompare(b.code),
    );
  return {
    current,
    priorities,
    summary: {
      total: current.length,
      severe: current.filter(severe).length,
      nearMiss: current.filter((r) => r.level_id.trim().toUpperCase() === 'B')
        .length,
      unsafeConditions: current.filter(
        (r) => r.level_id.trim().toUpperCase() === 'A',
      ).length,
      unclassified: current.filter((r) => !confirmed(r)).length,
      rising: priorities.filter((r) => r.delta > 0).length,
      repeated: priorities.filter((r) => r.repeatDepartments > 0).length,
    },
  };
}
