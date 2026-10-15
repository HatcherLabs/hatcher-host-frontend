type Amount = { usdAmount: number | string | null; originalAmount?: number | string | null; originalCurrency?: string | null };
export function paymentAmount(payment: Amount): string {
  if (payment.originalCurrency && payment.originalAmount != null) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: payment.originalCurrency }).format(Number(payment.originalAmount));
  }
  return payment.usdAmount == null ? '—' : `$${Number(payment.usdAmount).toFixed(2)}`;
}
