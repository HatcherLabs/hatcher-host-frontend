export interface ResolvableStep {
  target: string;
}

/**
 * Walk the step list from `from` in `direction` and return the index of the
 * first step whose target resolves, or -1 when none does. Lets the tour skip
 * steps whose anchor element is missing instead of dying silently.
 */
export function findResolvableStep(
  steps: ResolvableStep[],
  from: number,
  direction: 1 | -1,
  resolves: (target: string) => boolean,
): number {
  for (let i = from; i >= 0 && i < steps.length; i += direction) {
    if (resolves(steps[i].target)) return i;
  }
  return -1;
}
