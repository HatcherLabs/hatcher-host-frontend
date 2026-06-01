'use client';

interface Props {
  canEdit: boolean;
}

const KEY_CLASS = 'rounded bg-[#3a281a] px-1.5 py-0.5 text-[10px] text-[#f6ead8]';

export function ShortcutHud({ canEdit }: Props) {
  void canEdit;
  return (
    <div
      className="pointer-events-none fixed bottom-20 right-4 z-30 hidden rounded-lg border border-[#d6b177]/30 bg-[#1c130c]/78 px-3 py-2 text-[11px] text-[#e8d3b4] backdrop-blur md:block"
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
