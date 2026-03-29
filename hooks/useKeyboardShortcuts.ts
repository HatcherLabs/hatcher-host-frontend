'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutHandlers {
  onNewAgent?: () => void;
  onTemplates?: () => void;
  onSearch?: () => void;
  onHelp?: () => void;
  onAgentSelect?: (index: number) => void;
}

export const SHORTCUTS = [
  { key: 'n', label: 'New agent', category: 'Navigation' },
  { key: 't', label: 'Templates', category: 'Navigation' },
  { key: '/', label: 'Focus search', category: 'Navigation' },
  { key: '?', label: 'Show shortcuts', category: 'General' },
  { key: '1-9', label: 'Select agent by index', category: 'Agents' },
  { key: 'Escape', label: 'Close modal', category: 'General' },
] as const;

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const isEditable =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;

      // Allow Escape anywhere
      if (e.key === 'Escape') return;

      // Skip shortcuts when typing in form fields
      if (isEditable) return;

      // Skip if modifier keys are held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'n':
          e.preventDefault();
          if (handlers.onNewAgent) handlers.onNewAgent();
          else router.push('/dashboard/agents/new');
          break;
        case 't':
          e.preventDefault();
          if (handlers.onTemplates) handlers.onTemplates();
          else router.push('/dashboard/templates');
          break;
        case '/':
          e.preventDefault();
          handlers.onSearch?.();
          break;
        case '?':
          e.preventDefault();
          handlers.onHelp?.();
          break;
        default:
          // Number keys 1-9 for agent selection
          if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            handlers.onAgentSelect?.(parseInt(e.key) - 1);
          }
          break;
      }
    },
    [handlers, router]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
