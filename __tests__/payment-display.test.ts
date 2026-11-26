import { describe, expect, it } from 'vitest';
import { paymentAmount } from '../lib/payment-display';
describe('payment amount display', () => {
  it('shows the original Play currency instead of zero USD', () => {
    expect(paymentAmount({ usdAmount: null, originalAmount: '39.99', originalCurrency: 'RON' })).toMatch(/RON\s*39\.99/);
  });
  it('keeps existing USD payment formatting', () => {
    expect(paymentAmount({ usdAmount: 8 })).toBe('$8.00');
  });
  it('does not invent an amount for unavailable data', () => {
    expect(paymentAmount({ usdAmount: null })).toBe('—');
  });
});
