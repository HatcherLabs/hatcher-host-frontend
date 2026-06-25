export interface TerminalThemePalette {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

const DARK_TERMINAL_THEME: TerminalThemePalette = {
  background: '#0f1112',
  foreground: '#e6eeec',
  cursor: '#9ed5e7',
  cursorAccent: '#0f1112',
  selectionBackground: 'rgba(115, 164, 185, 0.24)',
  black: '#0f1112',
  red: '#ff5555',
  green: '#89d6c6',
  yellow: '#d5b46b',
  blue: '#73a4b9',
  magenta: '#aab7ff',
  cyan: '#9ed5e7',
  white: '#e6eeec',
  brightBlack: '#647173',
  brightRed: '#ff6e6e',
  brightGreen: '#a8e2d6',
  brightYellow: '#ffe0a0',
  brightBlue: '#9ed5e7',
  brightMagenta: '#c9d0ff',
  brightCyan: '#d7eff5',
  brightWhite: '#ffffff',
};

const LIGHT_TERMINAL_THEME: TerminalThemePalette = {
  background: '#ffffff',
  foreground: '#111827',
  cursor: '#0369a1',
  cursorAccent: '#ffffff',
  selectionBackground: 'rgba(3, 105, 161, 0.18)',
  black: '#111827',
  red: '#b91c1c',
  green: '#047857',
  yellow: '#b45309',
  blue: '#0369a1',
  magenta: '#7e22ce',
  cyan: '#0e7490',
  white: '#f8fafc',
  brightBlack: '#64748b',
  brightRed: '#dc2626',
  brightGreen: '#059669',
  brightYellow: '#d97706',
  brightBlue: '#0284c7',
  brightMagenta: '#9333ea',
  brightCyan: '#0891b2',
  brightWhite: '#ffffff',
};

export function resolveTerminalTheme(theme: string | null | undefined): TerminalThemePalette {
  return theme === 'light' ? LIGHT_TERMINAL_THEME : DARK_TERMINAL_THEME;
}
