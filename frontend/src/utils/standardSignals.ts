type DepartmentSignal = { id: string; name: string; count: number; severe: number };

// Match the API's repeat signal: the same NRLS code is reported at least twice
// within a department. Adding unrelated codes together does not establish repeat.
export function summarizeStandardDepartments(priorities: { departments: DepartmentSignal[] }[]) {
  const departments = new Map<string, DepartmentSignal>();
  const repeated = new Set<string>();
  for (const priority of priorities) {
    for (const item of priority.departments) {
      const current = departments.get(item.id) ?? { ...item, count: 0, severe: 0 };
      departments.set(item.id, { ...current, count: current.count + item.count, severe: current.severe + item.severe });
      if (item.count >= 2) repeated.add(item.id);
    }
  }
  return {
    departments: [...departments.values()].sort((a, b) => b.severe - a.severe || b.count - a.count),
    repeatedDepartments: repeated.size,
  };
}
