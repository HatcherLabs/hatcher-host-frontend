'use client';

import { memo, useEffect, useRef } from 'react';
import { Code2, Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ReactMarkdown from 'react-markdown';

type ChartType = 'bar' | 'line' | 'pie';
type ChartDatum = Record<string, string | number>;

interface ChartArtifact {
  type: ChartType;
  title?: string;
  xKey: string;
  yKey: string;
  data: ChartDatum[];
}

interface ImageArtifact {
  alt: string;
  url: string;
}

interface FileArtifact {
  title: string;
  filename: string;
  url?: string;
  content?: string;
  mediaType?: string;
  sizeBytes?: number;
}

interface CodeArtifact {
  filename: string;
  language: string;
  code: string;
}

type EmbedProvider = 'tradingview' | 'geckoterminal' | 'dexscreener';

interface EmbedArtifact {
  title: string;
  url: string;
  provider: EmbedProvider;
  symbol?: string;
}

export type MessagePart =
  | { kind: 'markdown'; content: string }
  | { kind: 'chart'; artifact: ChartArtifact }
  | { kind: 'image'; artifact: ImageArtifact }
  | { kind: 'file'; artifact: FileArtifact }
  | { kind: 'code'; artifact: CodeArtifact }
  | { kind: 'embed'; artifact: EmbedArtifact };

const ARTIFACT_RE = /```([^\n`]*)\n([\s\S]*?)```|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[File:\s*([^\]\n]+?)\]|<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*(?:<\/iframe>)?/gi;
const COLORS = ['#22d3ee', '#a3e635', '#f59e0b', '#f472b6', '#818cf8', '#34d399'];

function normalizeDatum(value: unknown): ChartDatum | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const out: ChartDatum = {};

  for (const [key, raw] of Object.entries(source)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw;
    } else if (typeof raw === 'string') {
      const maybeNumber = Number(raw);
      out[key] = raw.trim() !== '' && Number.isFinite(maybeNumber) ? maybeNumber : raw;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

function inferKeys(data: ChartDatum[], xKey?: unknown, yKey?: unknown) {
  const first = data[0] ?? {};
  const entries = Object.entries(first);
  const inferredX = typeof xKey === 'string'
    ? xKey
    : entries.find(([, value]) => typeof value === 'string')?.[0] ?? entries[0]?.[0] ?? 'label';
  const inferredY = typeof yKey === 'string'
    ? yKey
    : entries.find(([, value]) => typeof value === 'number')?.[0] ?? 'value';

  return { xKey: inferredX, yKey: inferredY };
}

function normalizeChartArtifact(raw: unknown): ChartArtifact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const rawType = String(source.type ?? source.chartType ?? source.kind ?? 'bar').toLowerCase();
  const type: ChartType =
    rawType === 'line' ? 'line' :
    rawType === 'pie' || rawType === 'donut' ? 'pie' :
    'bar';
  const rawData = Array.isArray(source.data) ? source.data : [];
  const data = rawData.map(normalizeDatum).filter((d): d is ChartDatum => Boolean(d));
  if (data.length === 0) return null;

  const { xKey, yKey } = inferKeys(data, source.xKey ?? source.labelKey, source.yKey ?? source.valueKey);
  if (!data.some((row) => typeof row[yKey] === 'number')) return null;

  return {
    type,
    title: typeof source.title === 'string' ? source.title : undefined,
    xKey,
    yKey,
    data,
  };
}

function parseChart(rawJson: string): ChartArtifact | null {
  try {
    return normalizeChartArtifact(JSON.parse(rawJson));
  } catch {
    return null;
  }
}

function stripSingleTrailingNewline(value: string): string {
  return value.endsWith('\r\n')
    ? value.slice(0, -2)
    : value.endsWith('\n')
      ? value.slice(0, -1)
      : value;
}

function extensionForLanguage(language: string): string {
  const normalized = language.toLowerCase();
  const map: Record<string, string> = {
    c: 'c',
    cpp: 'cpp',
    cxx: 'cpp',
    'c++': 'cpp',
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    tsx: 'tsx',
    jsx: 'jsx',
    python: 'py',
    py: 'py',
    json: 'json',
    bash: 'sh',
    shell: 'sh',
    sh: 'sh',
    sql: 'sql',
    html: 'html',
    css: 'css',
    markdown: 'md',
    md: 'md',
    doc: 'doc',
    docx: 'doc',
    text: 'txt',
    txt: 'txt',
  };
  return map[normalized] ?? (normalized.replace(/[^a-z0-9]+/g, '') || 'txt');
}

function languageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext || ext === filename.toLowerCase()) return 'text';
  const map: Record<string, string> = {
    js: 'javascript',
    ts: 'ts',
    tsx: 'tsx',
    jsx: 'jsx',
    py: 'python',
    sh: 'bash',
    md: 'markdown',
    txt: 'text',
  };
  return map[ext] ?? ext;
}

function normalizeCodeArtifact(raw: unknown): CodeArtifact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const code = typeof source.code === 'string'
    ? source.code
    : typeof source.content === 'string'
      ? source.content
      : typeof source.text === 'string'
        ? source.text
        : null;
  if (code === null) return null;

  const filename = typeof source.filename === 'string' && source.filename.trim()
    ? source.filename.trim()
    : 'snippet.txt';
  const language = typeof source.language === 'string' && source.language.trim()
    ? source.language.trim()
    : typeof source.lang === 'string' && source.lang.trim()
      ? source.lang.trim()
      : languageFromFilename(filename);

  return { filename, language, code };
}

function sanitizeFilename(value: string): string {
  const trimmed = value.trim().replace(/^`|`$/g, '');
  const parts = trimmed.split('.');
  const ext = parts.length > 1 ? parts.pop() : null;
  const base = parts.join('.') || trimmed;
  const safeBase = base
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeExt = ext?.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  return `${safeBase || 'artifact'}${safeExt ? `.${safeExt}` : ''}`;
}

function collectNearbyFilenames(text: string): string[] {
  const out: string[] = [];
  const filenameRe = /[`"']?([A-Za-z0-9][A-Za-z0-9._ -]{0,120}\.[A-Za-z0-9]{1,12})[`"']?/g;
  for (const match of text.matchAll(filenameRe)) {
    const index = match.index ?? 0;
    const before = text.slice(Math.max(0, index - 10), index);
    const candidate = match[1]?.trim();
    if (!candidate || before.includes('://')) continue;
    out.push(sanitizeFilename(candidate));
  }
  return out;
}

function filenameMatchesLanguage(filename: string, language: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  const expected = extensionForLanguage(language || 'text');
  return ext === expected || languageFromFilename(filename).toLowerCase() === language.toLowerCase();
}

function inferCodeFilename(language: string, before: string, after: string): string | null {
  const normalizedLanguage = language.trim() || 'text';
  const candidates = [
    ...collectNearbyFilenames(after),
    ...collectNearbyFilenames(before),
  ];
  return candidates.find((filename) => filenameMatchesLanguage(filename, normalizedLanguage)) ?? null;
}

function codeArtifactFromFence(language: string, body: string, before = '', after = ''): CodeArtifact {
  const normalizedLanguage = language.trim() || 'text';
  return {
    filename: inferCodeFilename(normalizedLanguage, before, after)
      ?? `snippet.${extensionForLanguage(normalizedLanguage)}`,
    language: normalizedLanguage,
    code: stripSingleTrailingNewline(body),
  };
}

function cleanArtifactUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const url = raw.trim().replace(/^<|>$/g, '');
  if (!url) return null;
  if (/^(https?:\/\/|data:|blob:|\/)/i.test(url)) return url;
  return null;
}

function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url, 'https://hatcher.local');
    const name = parsed.pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : 'file';
  } catch {
    return url.split('/').filter(Boolean).pop()?.trim() || 'file';
  }
}

function normalizeFileArtifact(raw: unknown): FileArtifact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const url = cleanArtifactUrl(source.url ?? source.href ?? source.file ?? source.path);
  const content = typeof source.content === 'string'
    ? source.content
    : typeof source.text === 'string'
      ? source.text
      : undefined;
  if (!url && content === undefined) return null;

  const filename = typeof source.filename === 'string' && source.filename.trim()
    ? source.filename.trim()
    : url
      ? filenameFromUrl(url)
      : 'artifact.txt';
  const title = typeof source.title === 'string' && source.title.trim()
    ? source.title.trim()
    : filename;
  const mediaType = typeof source.mediaType === 'string'
    ? source.mediaType
    : typeof source.mimeType === 'string'
      ? source.mimeType
      : undefined;
  const sizeBytes = typeof source.sizeBytes === 'number' && Number.isFinite(source.sizeBytes)
    ? source.sizeBytes
    : undefined;

  return {
    title,
    filename,
    ...(url ? { url } : {}),
    ...(content !== undefined ? { content } : {}),
    ...(mediaType ? { mediaType } : {}),
    ...(sizeBytes !== undefined ? { sizeBytes } : {}),
  };
}

function parseFile(rawJson: string): FileArtifact | null {
  try {
    return normalizeFileArtifact(JSON.parse(rawJson));
  } catch {
    return null;
  }
}

function fileArtifactFromUrl(rawUrl: string): FileArtifact | null {
  const url = cleanArtifactUrl(rawUrl.replace(/[),.;]+$/g, ''));
  if (!url) return null;
  const filename = filenameFromUrl(url);
  return { title: filename, filename, url };
}

function looksLikeImageUrl(url: string): boolean {
  const clean = url.split('?')[0]?.toLowerCase() ?? '';
  return /\.(png|jpe?g|gif|webp|svg)$/.test(clean);
}

function tradingViewWidgetUrl(symbol: string): string {
  return `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=D&theme=dark&style=1&locale=en`;
}

function cleanEmbedUrl(raw: unknown): string | null {
  return normalizeEmbedUrl(raw)?.url ?? null;
}

function ensureSearchParam(parsed: URL, key: string, value: string): void {
  if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
}

function normalizeEmbedUrl(raw: unknown): Pick<EmbedArtifact, 'provider' | 'url' | 'symbol'> | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname === 'tradingview.com') parsed.hostname = 'www.tradingview.com';
    if (parsed.hostname === 'geckoterminal.com') parsed.hostname = 'www.geckoterminal.com';
    if (parsed.hostname === 'www.dexscreener.com') parsed.hostname = 'dexscreener.com';

    if (parsed.hostname === 'www.tradingview.com' || parsed.hostname === 's.tradingview.com') {
      const url = parsed.toString();
      const symbol = tradingViewSymbolFromUrl(url);
      return {
        provider: 'tradingview',
        url,
        ...(symbol ? { symbol } : {}),
      };
    }

    if (parsed.hostname === 'www.geckoterminal.com') {
      ensureSearchParam(parsed, 'embed', '1');
      ensureSearchParam(parsed, 'info', '0');
      ensureSearchParam(parsed, 'swaps', '0');
      return { provider: 'geckoterminal', url: parsed.toString() };
    }

    if (parsed.hostname === 'dexscreener.com') {
      ensureSearchParam(parsed, 'embed', '1');
      ensureSearchParam(parsed, 'theme', 'dark');
      ensureSearchParam(parsed, 'trades', '0');
      ensureSearchParam(parsed, 'info', '0');
      return { provider: 'dexscreener', url: parsed.toString() };
    }
    return null;
  } catch {
    return null;
  }
}

function tradingViewSymbolFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const rawSymbol =
      parsed.searchParams.get('symbol') ??
      parsed.searchParams.get('tvwidgetsymbol') ??
      parsed.searchParams.get('sym');
    if (rawSymbol) return rawSymbol.replace(/\s+/g, '').toUpperCase();

    const symbolPath = parsed.pathname.match(/\/symbols\/([^/?#]+)/i)?.[1];
    if (symbolPath) return symbolPath.replace(/-/g, ':').toUpperCase();
  } catch {
    return undefined;
  }
  return undefined;
}

function embedArtifactFromIframe(rawUrl: string): EmbedArtifact | null {
  const normalized = normalizeEmbedUrl(rawUrl);
  if (!normalized) return null;
  const { provider, url, symbol } = normalized;
  const title = provider === 'tradingview'
    ? (symbol ? `TradingView ${symbol}` : 'TradingView chart')
    : provider === 'geckoterminal'
      ? 'GeckoTerminal chart'
      : 'DexScreener chart';
  return {
    title,
    url,
    provider,
    ...(symbol ? { symbol } : {}),
  };
}

function iframeSrcFromHtml(html: string): string | null {
  return /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i.exec(html)?.[1] ?? null;
}

function normalizeEmbedArtifact(raw: unknown): EmbedArtifact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const providerHint = typeof source.provider === 'string' && source.provider.trim()
    ? source.provider.trim().toLowerCase()
    : typeof source.type === 'string' && source.type.trim()
      ? source.type.trim().toLowerCase()
      : '';
  const rawSymbol = typeof source.symbol === 'string' && source.symbol.trim()
    ? source.symbol.trim().replace(/\s+/g, '').toUpperCase()
    : typeof source.tvSymbol === 'string' && source.tvSymbol.trim()
      ? source.tvSymbol.trim().replace(/\s+/g, '').toUpperCase()
      : undefined;
  const rawUrl = source.url ?? source.src ?? source.href ?? (
    typeof source.html === 'string' ? iframeSrcFromHtml(source.html) : undefined
  ) ?? (
    providerHint === 'tradingview' && rawSymbol ? tradingViewWidgetUrl(rawSymbol) : undefined
  );
  const normalized = normalizeEmbedUrl(rawUrl);
  if (!normalized) return null;
  const symbol = normalized.symbol ?? rawSymbol;
  const title = typeof source.title === 'string' && source.title.trim()
    ? source.title.trim()
    : normalized.provider === 'tradingview'
      ? symbol ? `TradingView ${symbol}` : 'TradingView chart'
      : normalized.provider === 'geckoterminal'
        ? 'GeckoTerminal chart'
        : 'DexScreener chart';

  return {
    title,
    url: normalized.url,
    provider: normalized.provider,
    ...(symbol ? { symbol } : {}),
  };
}

function parseEmbed(raw: string): EmbedArtifact | null {
  const iframeUrl = iframeSrcFromHtml(raw);
  if (iframeUrl) return embedArtifactFromIframe(iframeUrl);
  try {
    return normalizeEmbedArtifact(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseEmbedPart(raw: string): MessagePart | null {
  const iframeUrl = iframeSrcFromHtml(raw);
  if (iframeUrl) {
    const artifact = embedArtifactFromIframe(iframeUrl);
    return artifact ? { kind: 'embed', artifact } : null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;
  const kind = String(source.kind ?? source.artifactType ?? source.type ?? '').toLowerCase();

  if (kind === 'image') {
    const artifact = normalizeImageArtifact(source);
    return artifact ? { kind: 'image', artifact } : null;
  }
  if (kind === 'file' || kind === 'document' || kind === 'attachment') {
    const artifact = normalizeFileArtifact(source);
    return artifact ? { kind: 'file', artifact } : null;
  }
  if (kind === 'code') {
    const artifact = normalizeCodeArtifact(source);
    return artifact ? { kind: 'code', artifact } : null;
  }
  if (kind === 'chart') {
    const artifact = normalizeChartArtifact(source);
    return artifact ? { kind: 'chart', artifact } : null;
  }

  const rawUrl = cleanArtifactUrl(source.url ?? source.src ?? source.href);
  if (rawUrl && looksLikeImageUrl(rawUrl)) {
    const artifact = normalizeImageArtifact(source);
    return artifact ? { kind: 'image', artifact } : null;
  }

  const embed = normalizeEmbedArtifact(source);
  return embed ? { kind: 'embed', artifact: embed } : null;
}

function normalizeImageArtifact(raw: unknown): ImageArtifact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const url = cleanArtifactUrl(source.url ?? source.src ?? source.href);
  if (!url) return null;
  return {
    alt: typeof source.alt === 'string' && source.alt.trim()
      ? source.alt.trim()
      : typeof source.title === 'string' && source.title.trim()
        ? source.title.trim()
        : 'Image',
    url,
  };
}

function parseHatcherArtifact(rawJson: string): MessagePart | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;
  const kind = String(source.kind ?? source.artifactType ?? source.type ?? '').toLowerCase();

  if (kind === 'code') {
    const artifact = normalizeCodeArtifact(source);
    return artifact ? { kind: 'code', artifact } : null;
  }
  if (kind === 'file' || kind === 'document' || kind === 'attachment') {
    const artifact = normalizeFileArtifact(source);
    return artifact ? { kind: 'file', artifact } : null;
  }
  if (kind === 'image') {
    const artifact = normalizeImageArtifact(source);
    return artifact ? { kind: 'image', artifact } : null;
  }
  if (kind === 'embed' || kind === 'iframe' || kind === 'chart_embed' || kind === 'chart-embed') {
    const artifact = normalizeEmbedArtifact(source);
    return artifact ? { kind: 'embed', artifact } : null;
  }
  if (
    !kind
    && (
      typeof source.filename === 'string'
      || typeof source.url === 'string'
      || typeof source.href === 'string'
      || typeof source.file === 'string'
      || typeof source.path === 'string'
    )
  ) {
    const artifact = normalizeFileArtifact(source);
    return artifact ? { kind: 'file', artifact } : null;
  }

  const chart = normalizeChartArtifact(source);
  return chart ? { kind: 'chart', artifact: chart } : null;
}

function normalizedArtifactContent(value: string | undefined): string {
  return stripSingleTrailingNewline(value ?? '').trim();
}

function isDuplicateFileSpec(parts: MessagePart[], artifact: FileArtifact): boolean {
  const filename = artifact.filename.toLowerCase();
  const content = normalizedArtifactContent(artifact.content);
  return parts.some((part) => {
    if (part.kind === 'code') {
      return part.artifact.filename.toLowerCase() === filename
        && (!content || normalizedArtifactContent(part.artifact.code) === content);
    }
    if (part.kind === 'file') {
      return part.artifact.filename.toLowerCase() === filename
        && (!content || normalizedArtifactContent(part.artifact.content) === content);
    }
    return false;
  });
}

function trimTrailingDownloadIntro(parts: MessagePart[]): void {
  const last = parts[parts.length - 1];
  if (!last || last.kind !== 'markdown') return;
  const next = last.content.replace(
    /(?:^|\n)\s*(?:download(?:\s+the\s+file)?|file\s+download)\s*:?\s*$/i,
    '',
  );
  if (next.trim()) {
    parts[parts.length - 1] = { kind: 'markdown', content: next };
  } else {
    parts.pop();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugFromHeading(markdown: string): string {
  const heading = markdown.match(/^\s*#{1,3}\s+(.+)$/m)?.[1]?.trim() ?? 'document';
  return slugifyFilename(heading) || 'document';
}

function wordHtmlFromMarkdown(markdown: string, title: string): string {
  const body: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      body.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 4);
      body.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        body.push('<ul>');
        inList = true;
      }
      body.push(`<li>${escapeHtml(bullet[1])}</li>`);
      continue;
    }
    closeList();
    body.push(`<p>${escapeHtml(line)}</p>`);
  }
  closeList();

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    '<style>body{font-family:Arial,sans-serif;line-height:1.5;color:#111}h1,h2,h3,h4{margin:0 0 12px}p{margin:0 0 10px}ul{margin:0 0 10px 22px}</style>',
    '</head>',
    `<body>${body.join('\n')}</body>`,
    '</html>',
  ].join('\n');
}

function documentArtifactFromFence(language: string, body: string, before: string, after: string): FileArtifact | null {
  const normalizedLanguage = language.toLowerCase();
  const context = `${before}\n${after}`;
  const requestedDocument = /\b(docx?|word|document|download)\b/i.test(context)
    || normalizedLanguage === 'doc'
    || normalizedLanguage === 'docx';
  if (!requestedDocument) return null;
  if (!['markdown', 'md', 'text', 'txt', 'doc', 'docx', ''].includes(normalizedLanguage)) return null;

  const explicitDocName = [
    ...collectNearbyFilenames(after),
    ...collectNearbyFilenames(before),
  ].find((filename) => /\.(docx?|rtf)$/i.test(filename));
  const filename = explicitDocName
    ? explicitDocName.replace(/\.docx$/i, '.doc')
    : `${slugFromHeading(body)}.doc`;
  const title = filename;

  return {
    title,
    filename,
    mediaType: 'application/msword',
    content: wordHtmlFromMarkdown(stripSingleTrailingNewline(body), title),
  };
}

function formatFileSize(sizeBytes?: number): string | null {
  if (!sizeBytes || !Number.isFinite(sizeBytes)) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function splitMessageArtifacts(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(ARTIFACT_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ kind: 'markdown', content: content.slice(lastIndex, index) });
    }

    const fenceInfo = match[1]?.trim() ?? '';
    const fenceType = fenceInfo.split(/\s+/)[0]?.toLowerCase() ?? '';
    const fenceBody = match[2] ?? '';
    const imageAlt = match[3];
    const imageUrl = cleanArtifactUrl(match[4]);
    const fileUrl = match[5];
    const iframeUrl = match[6];
    const beforeContext = content.slice(Math.max(0, index - 800), index);
    const afterContext = content.slice(
      index + match[0].length,
      Math.min(content.length, index + match[0].length + 800),
    );

    if (fenceType === 'hatcher-file' || fenceType === 'file') {
      const artifact = parseFile(fenceBody);
      if (artifact) {
        const imageUrl = artifact.mediaType?.startsWith('image/') ? fileDownloadHref(artifact) : null;
        if (imageUrl) {
          parts.push({ kind: 'image', artifact: { alt: artifact.title, url: imageUrl } });
        } else {
          parts.push({ kind: 'file', artifact });
        }
      } else {
        parts.push({ kind: 'markdown', content: match[0] });
      }
    } else if (fenceType === 'hatcher-artifact' || fenceType === 'hatcher_artifact' || fenceType === 'artifact') {
      const part = parseHatcherArtifact(fenceBody);
      if (part) {
        parts.push(part);
      } else {
        parts.push({ kind: 'markdown', content: match[0] });
      }
    } else if (fenceType === 'hatcher-chart' || fenceType === 'chart') {
      const artifact = parseChart(fenceBody);
      if (artifact) {
        parts.push({ kind: 'chart', artifact });
      } else {
        parts.push({ kind: 'markdown', content: match[0] });
      }
    } else if (
      fenceType === 'hatcher-embed'
      || fenceType === 'hatcher_embed'
      || fenceType === 'chart-embed'
      || fenceType === 'chart_embed'
      || fenceType === 'embed'
      || fenceType === 'iframe'
    ) {
      const part = parseEmbedPart(fenceBody);
      if (part) {
        parts.push(part);
      } else {
        parts.push({ kind: 'markdown', content: match[0] });
      }
    } else if (match[1] !== undefined) {
      const htmlEmbedArtifact = fenceType === 'html' ? parseEmbed(fenceBody) : null;
      const genericArtifact = htmlEmbedArtifact
        ? { kind: 'embed' as const, artifact: htmlEmbedArtifact }
        : fenceType === 'json' ? parseHatcherArtifact(fenceBody) : null;
      if (genericArtifact?.kind === 'file' && isDuplicateFileSpec(parts, genericArtifact.artifact)) {
        trimTrailingDownloadIntro(parts);
      } else if (genericArtifact) {
        parts.push(genericArtifact);
      } else {
        const documentArtifact = documentArtifactFromFence(fenceType || 'text', fenceBody, beforeContext, afterContext);
        if (documentArtifact) {
          parts.push({ kind: 'file', artifact: documentArtifact });
        } else {
          parts.push({
            kind: 'code',
            artifact: codeArtifactFromFence(fenceType || 'text', fenceBody, beforeContext, afterContext),
          });
        }
      }
    } else if (imageUrl) {
      parts.push({ kind: 'image', artifact: { alt: imageAlt || 'Image', url: imageUrl } });
    } else if (fileUrl) {
      const artifact = fileArtifactFromUrl(fileUrl);
      if (artifact) {
        parts.push({ kind: 'file', artifact });
      } else {
        parts.push({ kind: 'markdown', content: match[0] });
      }
    } else if (iframeUrl) {
      const artifact = embedArtifactFromIframe(iframeUrl);
      if (artifact) {
        parts.push({ kind: 'embed', artifact });
      } else {
        parts.push({ kind: 'markdown', content: match[0] });
      }
    } else {
      parts.push({ kind: 'markdown', content: match[0] });
    }
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ kind: 'markdown', content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ kind: 'markdown', content }];
}

export const RichMarkdown = memo(function RichMarkdown({ content }: { content: string }) {
  return (
    <>
      {splitMessageArtifacts(content).map((part, index) => {
        if (part.kind === 'chart') {
          return <ChartArtifactView key={`chart-${index}`} artifact={part.artifact} />;
        }
        if (part.kind === 'image') {
          return <ImageArtifactView key={`image-${index}`} artifact={part.artifact} />;
        }
        if (part.kind === 'file') {
          return <FileArtifactView key={`file-${index}`} artifact={part.artifact} />;
        }
        if (part.kind === 'code') {
          return <CodeArtifactView key={`code-${index}`} artifact={part.artifact} />;
        }
        if (part.kind === 'embed') {
          return <EmbedArtifactView key={`embed-${index}`} artifact={part.artifact} />;
        }
        return <ReactMarkdown key={`md-${index}`}>{part.content}</ReactMarkdown>;
      })}
    </>
  );
});

function makeDataUrl(content: string, mediaType = 'text/plain'): string {
  return `data:${mediaType};charset=utf-8,${encodeURIComponent(content)}`;
}

function fileDownloadHref(artifact: FileArtifact): string | null {
  if (artifact.url) return artifact.url;
  if (artifact.content === undefined) return null;
  return makeDataUrl(artifact.content, artifact.mediaType ?? 'text/plain');
}

function slugifyFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'chart';
}

function chartToCsv(artifact: ChartArtifact): string {
  const keys = Array.from(new Set([artifact.xKey, artifact.yKey, ...artifact.data.flatMap((row) => Object.keys(row))]));
  const escape = (value: string | number | undefined) => {
    const text = value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    keys.map(escape).join(','),
    ...artifact.data.map((row) => keys.map((key) => escape(row[key])).join(',')),
  ].join('\n');
}

const ChartArtifactView = memo(function ChartArtifactView({ artifact }: { artifact: ChartArtifact }) {
  const baseName = slugifyFilename(artifact.title ?? 'chart');
  const jsonHref = makeDataUrl(JSON.stringify(artifact, null, 2), 'application/json');
  const csvHref = makeDataUrl(chartToCsv(artifact), 'text/csv');

  return (
    <div className="my-3 min-w-[260px] max-w-full rounded-lg border border-white/10 bg-black/20 p-3 sm:w-[min(100%,720px)]">
      {artifact.title && (
        <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">{artifact.title}</div>
      )}
      <div className="h-56 w-full min-w-[260px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={224}>
          {artifact.type === 'line' ? (
            <LineChart data={artifact.data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey={artifact.xKey} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} width={36} />
              <Tooltip contentStyle={{ background: '#101014', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6 }} />
              <Line type="monotone" dataKey={artifact.yKey} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : artifact.type === 'pie' ? (
            <PieChart>
              <Tooltip contentStyle={{ background: '#101014', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6 }} />
              <Pie data={artifact.data} dataKey={artifact.yKey} nameKey={artifact.xKey} outerRadius={78} innerRadius={38} paddingAngle={2}>
                {artifact.data.map((_, index) => (
                  <Cell key={`slice-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={artifact.data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey={artifact.xKey} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} width={36} />
              <Tooltip contentStyle={{ background: '#101014', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6 }} />
              <Bar dataKey={artifact.yKey} radius={[4, 4, 0, 0]}>
                {artifact.data.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/10 pt-2">
        <a
          href={csvHref}
          download={`${baseName}.csv`}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[11px] text-[var(--text-secondary)] no-underline hover:border-[var(--color-accent)]/40 hover:text-white"
        >
          <Download size={12} />
          CSV
        </a>
        <a
          href={jsonHref}
          download={`${baseName}.json`}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[11px] text-[var(--text-secondary)] no-underline hover:border-[var(--color-accent)]/40 hover:text-white"
        >
          <Download size={12} />
          JSON
        </a>
      </div>
    </div>
  );
});

const CodeArtifactView = memo(function CodeArtifactView({ artifact }: { artifact: CodeArtifact }) {
  const href = makeDataUrl(artifact.code, 'text/plain');
  return (
    <div className="my-3 min-w-[260px] max-w-full overflow-hidden rounded-lg border border-white/10 bg-black/20 sm:w-[min(100%,760px)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <Code2 size={14} className="text-[var(--color-accent)]" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-secondary)]">
          {artifact.filename}
        </span>
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
          {artifact.language}
        </span>
        <a
          href={href}
          download={artifact.filename}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--color-accent)] no-underline hover:bg-white/5"
        >
          <Download size={13} />
          Download
        </a>
      </div>
      <pre className="max-h-80 overflow-auto p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        <code>{artifact.code}</code>
      </pre>
    </div>
  );
});

const ImageArtifactView = memo(function ImageArtifactView({ artifact }: { artifact: ImageArtifact }) {
  return (
    <figure className="my-3 overflow-hidden rounded-lg border border-white/10 bg-black/20">
      {/* Agent artifacts can be data/blob URLs or arbitrary remote images; Next Image cannot optimize them reliably. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artifact.url}
        alt={artifact.alt}
        className="max-h-72 w-full object-contain bg-black/30"
        loading="lazy"
      />
      {artifact.alt && (
        <figcaption className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-xs text-[var(--text-muted)]">
          <ImageIcon size={13} />
          <span className="truncate">{artifact.alt}</span>
        </figcaption>
      )}
    </figure>
  );
});

const EmbedArtifactView = memo(function EmbedArtifactView({ artifact }: { artifact: EmbedArtifact }) {
  const widgetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (artifact.provider !== 'tradingview') return;
    const container = widgetRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.text = JSON.stringify({
      autosize: true,
      symbol: artifact.symbol ?? 'BITSTAMP:BTCUSD',
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    container.appendChild(widget);
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [artifact.provider, artifact.symbol]);

  return (
    <div className="my-3 min-w-[260px] overflow-hidden rounded-lg border border-white/10 bg-black/20">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-secondary)]">
          {artifact.title}
        </span>
        <a
          href={artifact.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[var(--color-accent)] no-underline hover:bg-white/5"
        >
          <ExternalLink size={13} />
          Open
        </a>
      </div>
      <div className="h-[420px] w-full bg-black sm:h-[480px]">
        {artifact.provider === 'tradingview' ? (
          <div ref={widgetRef} className="tradingview-widget-container h-full w-full" />
        ) : (
          <iframe
            src={artifact.url}
            title={artifact.title}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
            allow="clipboard-write; encrypted-media; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
});

const FileArtifactView = memo(function FileArtifactView({ artifact }: { artifact: FileArtifact }) {
  const size = formatFileSize(artifact.sizeBytes);
  const href = fileDownloadHref(artifact);
  if (!href) return null;
  const external = Boolean(artifact.url);
  return (
    <a
      href={href}
      download={artifact.filename}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="my-3 flex min-w-[240px] max-w-full items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-left no-underline transition-colors hover:border-[var(--color-accent)]/40 hover:bg-black/30"
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-white/10 bg-white/5 text-[var(--color-accent)]">
        <FileText size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
          {artifact.title}
        </span>
        <span className="block truncate text-xs text-[var(--text-muted)]">
          {[artifact.mediaType, size].filter(Boolean).join(' · ') || artifact.filename}
        </span>
      </span>
      <span className="flex flex-none items-center gap-1 text-xs text-[var(--color-accent)]">
        <Download size={14} />
        {external && <ExternalLink size={13} />}
      </span>
    </a>
  );
});
