import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Action approvals',
  description: 'Review MCP action requests, scoped grants, and execution history for your Hatcher agents.',
};

export default function ActionApprovalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
