import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Neural Mesh',
  description: 'Inspect owner-scoped shadow routing decisions across your Hatcher agents.',
};

export default function NeuralMeshLayout({ children }: { children: React.ReactNode }) {
  return children;
}
