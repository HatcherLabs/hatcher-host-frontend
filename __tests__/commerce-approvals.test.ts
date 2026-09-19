import { describe, expect, it } from 'vitest';
import type { CommerceActionRequest } from '@/lib/api';
import { commerceActionLabel, commerceActionNeedsReconciliation } from '@/lib/commerce-approvals';

describe('commerce approval presentation', () => {
  it('uses partner-neutral owner-facing action labels', () => {
    expect(commerceActionLabel('create_order')).toBe('Create physical order');
    expect(commerceActionLabel('pay_order')).toBe('Pay for physical order');
  });

  it('keeps ambiguous payments visibly in reconciliation', () => {
    const action = { status: 'reconciliation_required' } as CommerceActionRequest;
    expect(commerceActionNeedsReconciliation(action)).toBe(true);
  });
});
