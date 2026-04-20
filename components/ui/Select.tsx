'use client';

// ============================================================
// Custom <Select> — replaces native <select> on dark-themed pages.
// ------------------------------------------------------------
// The native dropdown popup on Linux Chrome renders white-on-white
// even with `color-scheme: dark` set on the element (GTK picker
// ignores it). This component renders its own menu using CSS vars,
// so it always respects our theme tokens.
//
// A11y: aria-haspopup + aria-expanded on the trigger, role="listbox"
// on the menu, role="option" + aria-selected on each item. Keyboard:
// Enter/Space/ArrowDown open; ArrowUp/ArrowDown move; Enter selects;
// Escape closes and returns focus to the trigger.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className = '',
  disabled,
  ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value) ?? options[0];

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keep the keyboard-highlighted index in sync when the value changes
  // externally (e.g. the parent form resets state).
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setActiveIdx(idx);
  }, [value, options]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      if (!open) {
        e.preventDefault();
        setOpen(true);
        return;
      }
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, i + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[activeIdx];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-60"
      >
        <span className="truncate text-left">{current?.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-xl overflow-hidden"
        >
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className={`w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] transition-colors ${
                i === activeIdx ? 'bg-[var(--color-accent)]/10' : ''
              } ${opt.value === value ? 'font-medium text-[var(--color-accent)]' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
