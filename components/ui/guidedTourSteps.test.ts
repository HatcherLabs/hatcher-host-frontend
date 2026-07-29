import { describe, expect, it } from 'vitest';
import { findResolvableStep } from '@/components/ui/guidedTourSteps';

const steps = [
  { target: '#create' },
  { target: '#workspace' },
  { target: '#import' },
  { target: '#user-menu' },
];

const only = (...targets: string[]) => (target: string) => targets.includes(target);

describe('findResolvableStep', () => {
  it('returns the starting index when it resolves', () => {
    expect(findResolvableStep(steps, 0, 1, () => true)).toBe(0);
    expect(findResolvableStep(steps, 2, -1, () => true)).toBe(2);
  });

  it('skips forward over unresolvable steps', () => {
    expect(findResolvableStep(steps, 1, 1, only('#create', '#user-menu'))).toBe(3);
  });

  it('skips backward over unresolvable steps', () => {
    expect(findResolvableStep(steps, 2, -1, only('#create'))).toBe(0);
  });

  it('returns -1 when nothing resolves in the direction of travel', () => {
    expect(findResolvableStep(steps, 1, 1, only('#create'))).toBe(-1);
    expect(findResolvableStep(steps, 1, -1, only('#user-menu'))).toBe(-1);
    expect(findResolvableStep(steps, 0, 1, () => false)).toBe(-1);
  });

  it('handles out-of-range start indexes', () => {
    expect(findResolvableStep(steps, 4, 1, () => true)).toBe(-1);
    expect(findResolvableStep(steps, -1, -1, () => true)).toBe(-1);
    expect(findResolvableStep([], 0, 1, () => true)).toBe(-1);
  });
});
