'use client';

import {
  AVATAR_VARIANTS,
  ROOM_EMOTES,
  type AvatarVariant,
  type RoomEmoteId,
} from '../stations/AgentBody';

interface Props {
  selectedAvatarVariant: AvatarVariant | null;
  onAvatarChange: (variant: AvatarVariant) => void | Promise<void>;
  onEmote: (emote: RoomEmoteId) => void;
}

const EMOTE_SHORT: Record<RoomEmoteId, string> = {
  wave: 'Wave',
  dance: 'Dance',
  think: 'Think',
  celebrate: 'Cheer',
  alert: 'Alert',
};

export function AvatarEmoteHud({ selectedAvatarVariant, onAvatarChange, onEmote }: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-xl border border-[#d6b177]/35 bg-[#1c130c]/86 p-2 text-[#f6ead8] shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d6b177] sm:inline">
          Avatar
        </span>
        <select
          value={selectedAvatarVariant ?? ''}
          onChange={(event) => void onAvatarChange(event.target.value as AvatarVariant)}
          className="h-9 min-w-0 flex-1 rounded-md border border-[#5a3a20] bg-[#2b1d12] px-2 text-sm text-[#fff7e8] outline-none transition focus:border-[#d6b177]"
        >
          <option value="" disabled>
            Auto
          </option>
          {AVATAR_VARIANTS.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.name}
            </option>
          ))}
        </select>
      </label>

      <div className="h-8 w-px bg-[#5a3a20]" />

      <div className="flex shrink-0 items-center gap-1">
        {ROOM_EMOTES.map((emote) => (
          <button
            key={emote.id}
            type="button"
            onClick={() => onEmote(emote.id)}
            className="h-9 rounded-md border border-[#5a3a20] bg-[#2b1d12] px-2 text-xs font-semibold text-[#f6ead8] transition hover:border-[#d6b177] hover:bg-[#3a281a] sm:min-w-16"
          >
            {EMOTE_SHORT[emote.id]}
          </button>
        ))}
      </div>
    </div>
  );
}
