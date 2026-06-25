'use client';

import {
  AVATAR_VARIANTS,
  ROOM_EMOTES,
  SELECTABLE_AVATAR_VARIANTS,
  type AvatarVariant,
  type RoomEmoteId,
} from '../stations/AgentBody';
import {
  AVATAR_SELECT_CLASSNAME,
  AVATAR_SELECT_OPTION_CLASSNAME,
  AVATAR_SELECT_STYLE,
} from './avatarSelectTheme';

interface Props {
  selectedAvatarVariant: AvatarVariant | null;
  onAvatarChange: (variant: AvatarVariant) => void | Promise<void>;
  onEmote: (emote: RoomEmoteId) => void;
}

interface ControlsProps extends Props {
  layout?: 'bar' | 'menu';
}

const EMOTE_SHORT: Record<RoomEmoteId, string> = {
  wave: 'Wave',
  dance: 'Dance',
  think: 'Think',
  scan: 'Scan',
  work: 'Work',
  celebrate: 'Cheer',
  alert: 'Alert',
};

const EMOTE_TONE: Record<RoomEmoteId, string> = {
  wave: 'border-[#9ed5e7]/38 bg-[#142126] text-[#d7eff5]',
  dance: 'border-[#ff5fa2]/45 bg-[#311728] text-[#ffe1ef]',
  think: 'border-[#b088ff]/45 bg-[#211633] text-[#eadcff]',
  scan: 'border-[#9ed5e7]/38 bg-[#142126] text-[#d7eff5]',
  work: 'border-[#ffd166]/45 bg-[#2a2110] text-[#fff1c7]',
  celebrate: 'border-[#ffd166]/55 bg-[#302411] text-[#fff2c9]',
  alert: 'border-[#ff6b8a]/55 bg-[#32131a] text-[#ffe1e8]',
};

function selectedVariantName(variant: AvatarVariant | null): string {
  return AVATAR_VARIANTS.find((item) => item.id === variant)?.name ?? 'Auto';
}

export function AvatarEmoteControls({
  selectedAvatarVariant,
  onAvatarChange,
  onEmote,
  layout = 'bar',
}: ControlsProps) {
  const menu = layout === 'menu';
  const selectedVariant = AVATAR_VARIANTS.find(
    (item) => item.id === selectedAvatarVariant,
  );
  const selectedIsLegacy =
    !!selectedVariant &&
    !SELECTABLE_AVATAR_VARIANTS.some(
      (variant) => variant.id === selectedVariant.id,
    );

  return (
    <div className={menu ? 'grid gap-3' : 'flex w-full items-center gap-2'}>
      <label
        className={
          menu ? 'grid gap-1.5' : 'flex min-w-0 flex-1 items-center gap-2'
        }
      >
        <span
          className={
            menu
              ? 'text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d6b177]'
              : 'hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d6b177] sm:inline'
          }
        >
          Avatar
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_14px_currentColor]"
            style={{
              color:
                AVATAR_VARIANTS.find(
                  (item) => item.id === selectedAvatarVariant,
                )?.accent ?? '#d6b177',
              backgroundColor: 'currentColor',
            }}
          />
          <select
            value={selectedAvatarVariant ?? ''}
            onChange={(event) =>
              void onAvatarChange(event.target.value as AvatarVariant)
            }
            className={`${AVATAR_SELECT_CLASSNAME} h-9 min-w-0 flex-1 py-0 text-sm`}
            style={AVATAR_SELECT_STYLE}
            aria-label="Avatar variant"
          >
            <option value="" disabled className={AVATAR_SELECT_OPTION_CLASSNAME}>
              Auto
            </option>
            {selectedIsLegacy && (
              <option
                value={selectedVariant.id}
                className={AVATAR_SELECT_OPTION_CLASSNAME}
              >
                {selectedVariant.name} (legacy)
              </option>
            )}
            {SELECTABLE_AVATAR_VARIANTS.map((variant) => (
              <option
                key={variant.id}
                value={variant.id}
                className={AVATAR_SELECT_OPTION_CLASSNAME}
              >
                {variant.name}
              </option>
            ))}
          </select>
        </span>
      </label>

      {menu && (
        <div className="grid grid-cols-2 gap-1.5">
          {SELECTABLE_AVATAR_VARIANTS.map((variant) => {
            const active = selectedAvatarVariant === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => void onAvatarChange(variant.id)}
                title={variant.description}
                aria-pressed={active}
                className={`flex min-h-11 items-center gap-2 rounded-md border px-2 text-left transition ${
                  active
                    ? 'border-[#d6b177] bg-[#3a281a] text-[#fff7e8]'
                    : 'border-[#5a3a20] bg-[#21160e] text-[#d8c3a3] hover:border-[#d6b177]/65 hover:text-[#fff7e8]'
                }`}
              >
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[0_0_16px_currentColor]"
                  style={{
                    color: variant.accent,
                    backgroundColor: 'currentColor',
                  }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">
                    {variant.name}
                  </span>
                  <span className="block truncate text-[10px] opacity-65">
                    {variant.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!menu && <div className="h-8 w-px bg-[#5a3a20]" />}

      <div
        className={
          menu ? 'grid grid-cols-4 gap-1.5' : 'flex shrink-0 items-center gap-1'
        }
      >
        {ROOM_EMOTES.map((emote) => (
          <button
            key={emote.id}
            type="button"
            onClick={() => onEmote(emote.id)}
            title={`${emote.name} emote`}
            className={`h-9 rounded-md border px-2 text-xs font-semibold transition hover:border-[#d6b177] hover:bg-[#3a281a] sm:min-w-16 ${EMOTE_TONE[emote.id]}`}
          >
            {EMOTE_SHORT[emote.id]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AvatarEmoteHud(props: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 z-40 hidden w-[min(860px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl border border-[#d6b177]/35 bg-[#1c130c]/86 p-2 text-[#f6ead8] shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur md:flex">
      <div className="hidden min-w-28 border-r border-[#5a3a20] pr-3 lg:block">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d6b177]">
          Avatar
        </div>
        <div className="truncate text-sm font-semibold text-[#fff7e8]">
          {selectedVariantName(props.selectedAvatarVariant)}
        </div>
      </div>
      <AvatarEmoteControls {...props} />
    </div>
  );
}
