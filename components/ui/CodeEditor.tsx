'use client';

import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import { basicSetup } from 'codemirror';
import { findLanguage } from './code-editor-utils';

/**
 * Base editor theme built entirely from the app's CSS variables so it follows
 * light/dark switches (next-themes toggles the `.dark` class) automatically —
 * no reconfiguration needed on theme change.
 */
const appTheme = EditorView.theme({
  '&': {
    fontSize: '0.75rem',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
    lineHeight: '1.7',
  },
  '.cm-content': { caretColor: 'var(--accent)', padding: '12px 0' },
  '.cm-line': { padding: '0 12px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRight: '1px solid var(--border-default)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 7%, transparent)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    color: 'var(--text-primary)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)',
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--color-success) 18%, transparent)',
    outline: '1px solid color-mix(in srgb, var(--color-success) 45%, transparent)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in srgb, var(--color-warning) 25%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border-default)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--border-default)' },
  '.cm-textfield': {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
    color: 'var(--text-primary)',
  },
  '.cm-placeholder': { color: 'var(--text-muted)' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--bg-muted)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-muted)',
  },

  // Syntax token colors (classHighlighter emits .tok-* classes). All colors
  // come from theme variables, so both light and dark palettes stay legible.
  '.tok-comment, .tok-meta': { color: 'var(--text-muted)', fontStyle: 'italic' },
  '.tok-keyword': { color: 'var(--accent)', fontWeight: '500' },
  '.tok-string, .tok-string2': { color: 'var(--color-success)' },
  '.tok-number, .tok-bool, .tok-atom, .tok-literal': { color: 'var(--color-warning)' },
  '.tok-typeName, .tok-className, .tok-namespace': { color: 'var(--accent-strong)' },
  '.tok-propertyName, .tok-definition, .tok-macroName, .tok-labelName': {
    color: 'color-mix(in srgb, var(--accent) 65%, var(--text-primary))',
  },
  '.tok-variableName, .tok-variableName2': { color: 'var(--text-primary)' },
  '.tok-operator, .tok-punctuation': { color: 'var(--text-secondary)' },
  '.tok-invalid': { color: 'var(--color-destructive)' },
  '.tok-link, .tok-url': { color: 'var(--color-info)', textDecoration: 'underline' },
  '.tok-heading': { color: 'var(--text-primary)', fontWeight: '700' },
  '.tok-emphasis': { fontStyle: 'italic' },
  '.tok-strong': { fontWeight: '700' },
  '.tok-inserted': { color: 'var(--color-success)' },
  '.tok-deleted': { color: 'var(--color-destructive)' },
});

function sizeTheme(minHeight?: string, maxHeight?: string) {
  const root: Record<string, string> = {};
  if (minHeight) root.minHeight = minHeight;
  if (maxHeight) root.maxHeight = maxHeight;
  return EditorView.theme({
    '&': root,
    '.cm-scroller': { overflow: 'auto' },
  });
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Drives syntax-highlighting language selection (extension / filename match). */
  filename?: string;
  readOnly?: boolean;
  /** CSS lengths. When both are set to the same value the editor is fixed-height
   *  and scrolls internally. */
  minHeight?: string;
  maxHeight?: string;
  placeholder?: string;
  /** Called on Ctrl/Cmd+S (the browser's save dialog is suppressed). */
  onSave?: () => void;
  className?: string;
}

/**
 * Thin React wrapper around CodeMirror 6 (EditorView). Client-only: the view
 * is constructed in an effect, so SSR renders just the container div.
 */
export function CodeEditor({
  value,
  onChange,
  filename,
  readOnly = false,
  minHeight,
  maxHeight,
  placeholder,
  onSave,
  className,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Latest doc text as known by this wrapper — used to distinguish external
  // value-prop changes from echoes of the user's own edits.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Create (and on prop changes, recreate) the editor view.
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const language = new Compartment();
    let cancelled = false;

    const view = new EditorView({
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          basicSetup,
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                onSaveRef.current?.();
                return true;
              },
            },
            indentWithTab,
          ]),
          language.of([]),
          syntaxHighlighting(classHighlighter),
          appTheme,
          sizeTheme(minHeight, maxHeight),
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          placeholder ? cmPlaceholder(placeholder) : [],
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const doc = update.state.doc.toString();
              valueRef.current = doc;
              onChangeRef.current(doc);
            }
          }),
        ],
      }),
      parent,
    });
    viewRef.current = view;

    // Language support is loaded lazily (dynamic import per language).
    const description = filename ? findLanguage(filename) : null;
    if (description) {
      description
        .load()
        .then((support) => {
          if (!cancelled) {
            view.dispatch({ effects: language.reconfigure(support) });
          }
        })
        .catch(() => {
          /* no highlighting on load failure — plain text is fine */
        });
    }

    return () => {
      cancelled = true;
      view.destroy();
      viewRef.current = null;
    };
  }, [filename, readOnly, minHeight, maxHeight, placeholder]);

  // Push external value changes into the view (e.g. parent resets content).
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === valueRef.current) return;
    valueRef.current = value;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return <div ref={containerRef} className={className} />;
}
