'use client';

interface Props {
  canEdit: boolean;
}

const KEY_CLASS = 'rounded-md border border-[#d6b177]/28 bg-[#2b2115] px-1.5 py-0.5 text-[10px] font-semibold text-[#f6ead8] shadow-inner';

export function ShortcutHud({ canEdit }: Props) {
  void canEdit;
  return (
    <div
      className="pointer-events-none fixed bottom-20 right-4 z-30 hidden rounded-full border border-[#d6b177]/28 bg-[rgba(21,16,11,0.78)] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f6ead8] shadow-[0_14px_34px_rgba(10,7,4,0.24)] backdrop-blur md:block"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="flex items-center gap-2">
        <kbd className={KEY_CLASS}>E</kbd>
        <span>interact</span>
        <kbd className={KEY_CLASS}>Esc</kbd>
        <span>close</span>
      </div>
    </div>
  );
}
