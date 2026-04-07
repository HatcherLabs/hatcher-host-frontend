'use client';

export function ChatStyles() {
  return (
    <style jsx global>{`
      @keyframes voiceBar {
        0% { height: 3px; }
        100% { height: 12px; }
      }
      @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-5px); opacity: 1; }
      }
      .markdown-body {
        line-height: 1.6;
        word-wrap: break-word;
      }
      .markdown-body p {
        margin: 0.25em 0;
      }
      .markdown-body p:first-child {
        margin-top: 0;
      }
      .markdown-body p:last-child {
        margin-bottom: 0;
      }
      .markdown-body strong {
        font-weight: 700;
        color: var(--text-primary);
      }
      .markdown-body em {
        font-style: italic;
        color: var(--text-secondary);
      }
      .markdown-body h1, .markdown-body h2, .markdown-body h3,
      .markdown-body h4, .markdown-body h5, .markdown-body h6 {
        font-weight: 600;
        margin: 0.75em 0 0.25em;
        color: var(--text-primary);
      }
      .markdown-body h1 { font-size: 1.25em; }
      .markdown-body h2 { font-size: 1.15em; }
      .markdown-body h3 { font-size: 1.05em; }
      .markdown-body ul, .markdown-body ol {
        margin: 0.4em 0;
        padding-left: 1.5em;
      }
      .markdown-body ul {
        list-style-type: disc;
      }
      .markdown-body ol {
        list-style-type: decimal;
      }
      .markdown-body li {
        margin: 0.15em 0;
      }
      .markdown-body code {
        background: rgba(6, 182, 212, 0.1);
        border: 1px solid rgba(6, 182, 212, 0.2);
        border-radius: 4px;
        padding: 0.1em 0.35em;
        font-size: 0.88em;
        font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
        color: var(--color-accent);
      }
      .markdown-body pre {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--border-default);
        border-radius: 8px;
        padding: 0.75em 1em;
        margin: 0.5em 0;
        overflow-x: auto;
      }
      .markdown-body pre code {
        background: none;
        border: none;
        padding: 0;
        font-size: 0.85em;
        color: var(--text-secondary);
      }
      .markdown-body blockquote {
        border-left: 3px solid var(--color-accent);
        margin: 0.5em 0;
        padding: 0.25em 0.75em;
        color: var(--text-secondary);
        background: rgba(6, 182, 212, 0.05);
        border-radius: 0 4px 4px 0;
      }
      .markdown-body a {
        color: var(--color-accent);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .markdown-body a:hover {
        color: #22d3ee;
      }
      .markdown-body hr {
        border: none;
        border-top: 1px solid var(--border-default);
        margin: 0.75em 0;
      }
      .markdown-body table {
        border-collapse: collapse;
        margin: 0.5em 0;
        width: 100%;
      }
      .markdown-body th, .markdown-body td {
        border: 1px solid var(--border-default);
        padding: 0.35em 0.6em;
        text-align: left;
        font-size: 0.9em;
      }
      .markdown-body th {
        background: rgba(6, 182, 212, 0.08);
        font-weight: 600;
        color: var(--text-primary);
      }
    `}</style>
  );
}
