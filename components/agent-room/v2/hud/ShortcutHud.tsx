'use client';

interface Props {
  canEdit: boolean;
}

const KEY_CLASS = 'rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-white';

export function ShortcutHud({ canEdit }: Props) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-30 hidden rounded-lg border border-white/10 bg-black/65 px-3 py-2 text-[11px] text-neutral-300 backdrop-blur md:block"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="flex items-center gap-2">
        <kbd className={KEY_CLASS}>E</kbd>
        <span>interact</span>
        <kbd className={KEY_CLASS}>P</kbd>
        <span>passport</span>
        {canEdit && (
          <>
            <kbd className={KEY_CLASS}>M</kbd>
            <span>mail</span>
          </>
        )}
        <kbd className={KEY_CLASS}>Esc</kbd>
        <span>close</span>
      </div>
    </div>
  );
}
