import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Automation Center',
  description: 'Run recurring work and trigger Hatcher agents from external events.',
};

export default function AutomationCenterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
