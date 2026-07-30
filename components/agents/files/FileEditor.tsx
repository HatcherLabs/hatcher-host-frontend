'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Loader2, Save, X } from 'lucide-react';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { shouldUseCodeEditor } from '@/components/ui/code-editor-utils';
import { getFileIcon } from './FileExplorer';

export interface FileEditorProps {
  /** The opened file; `content` is the last saved content. */
  file: { path: string; name: string; content: string };
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  saveMessage: string | null;
  error: string | null;
  accentColor: string;
  /** Fill the parent's height (window layout) instead of the fixed tab height. */
  fill?: boolean;
}

/**
 * CodeMirror file editor with save/close chrome. Extracted from FilesTab —
 * the tab keeps its exact behavior; the agent desktop reuses it in windows.
 */
export function FileEditor({
  file,
  value,
  onChange,
  onSave,
  onClose,
  saving,
  saveMessage,
  error,
  accentColor,
  fill = false,
}: FileEditorProps) {
  const isModified = value !== file.content;
  const isEnvFile = /^\.env/i.test(file.name);
  // Very large or binary-looking files fall back to the plain textarea —
  // CodeMirror degrades badly on both.
  const useRichEditor = shouldUseCodeEditor(file.content);
  const modifiedBorderColor = isModified
    ? `color-mix(in srgb, ${accentColor} 45%, transparent)`
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={fill ? 'flex h-full min-h-0 flex-col' : undefined}
    >
      {/* Editor header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors">
            <ArrowLeft size={16} />
          </button>
          {getFileIcon(file.name, 'file')}
          <span className="text-sm font-medium text-[var(--text-primary)] font-mono">{file.name}</span>
          {isModified && <span className="text-[10px] text-[var(--color-warning)] ml-1">Modified</span>}
          {isEnvFile && (
            <span className="text-[10px] text-[var(--color-destructive)] bg-[var(--color-destructive-bg)] border border-[var(--color-destructive-border)] rounded px-1.5 py-0.5 ml-1">
              Sensitive
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && <span className="text-xs text-[var(--color-success)]">{saveMessage}</span>}
          <button
            onClick={onSave}
            disabled={saving || !isModified}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-primary)] disabled:opacity-30 transition-colors"
            style={{ backgroundColor: isModified ? accentColor : undefined }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Breadcrumb path for editor */}
      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-3 font-mono overflow-x-auto">
        {file.path.split('/').filter(Boolean).map((seg, i, arr) => (
          <span key={i} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <ChevronRight size={8} className="text-[var(--text-muted)]" />}
            <span className={i === arr.length - 1 ? 'text-[var(--text-primary)]' : ''}>{seg}</span>
          </span>
        ))}
      </div>

      {error && <div className="mb-3 text-xs text-[var(--color-destructive)] bg-[var(--color-destructive-bg)] border border-[var(--color-destructive-border)] rounded-lg px-3 py-2">{error}</div>}
      {useRichEditor ? (
        <div
          className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]/90 overflow-hidden ${fill ? 'flex-1 min-h-0' : ''}`}
          style={{ borderColor: modifiedBorderColor }}
        >
          <CodeEditor
            value={value}
            onChange={onChange}
            filename={file.name}
            minHeight={fill ? '100%' : '500px'}
            maxHeight={fill ? '100%' : '500px'}
            className={fill ? 'h-full' : undefined}
            onSave={() => { if (isModified && !saving) onSave(); }}
          />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-base)]/90 border border-[var(--border-default)] focus:outline-none resize-none leading-relaxed ${fill ? 'flex-1 min-h-0' : 'h-[500px]'}`}
          style={{ borderColor: modifiedBorderColor }}
          spellCheck={false}
        />
      )}
    </motion.div>
  );
}
