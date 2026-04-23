import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing',
  description: 'Manage payments, subscriptions, credits, and view transaction history.',
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
