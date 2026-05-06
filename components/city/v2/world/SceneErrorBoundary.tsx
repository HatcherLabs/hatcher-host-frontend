'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label for console diagnostics. */
  label?: string;
}
interface State {
  hasError: boolean;
}

/**
 * Scene-local error boundary — swallows render errors from optional
 * pieces (missing assets, failed GLB decode) so one broken component
 * doesn't take down the whole Canvas. Use sparingly and only around
 * pieces that are genuinely optional.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: Error): void {
    console.warn(`[SceneErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, err.message);
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
