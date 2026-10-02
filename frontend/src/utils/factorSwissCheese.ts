import { getContributingFactor, type ContributingFactorSelection } from './contributingFactors.ts';

// Suggested placement only; reviewers choose the barrier implicated by the facts.
export function factorSwissLayer(code: string): string {
  const category = getContributingFactor(code)?.category;
  if (category === 'policies_protocols' || category === 'communication') return 'org';
  if (category === 'supervision_support') return 'supervision';
  return 'precondition';
}

export function factorsToSwissHoles(
  factors: ContributingFactorSelection[], layers: Record<string, string> = {},
): Array<{ layer: string; hole: string }> {
  return factors.flatMap(selection => {
    const factor = getContributingFactor(selection.code);
    if (!factor) return [];
    const requested = layers[selection.code];
    const layer = ['org', 'supervision', 'precondition', 'act'].includes(requested)
      ? requested : factorSwissLayer(selection.code);
    const detail = selection.detail?.trim();
    return [{ layer, hole: `${factor.code} ${factor.labelTh}${detail ? ` — ${detail}` : ''}` }];
  });
}
