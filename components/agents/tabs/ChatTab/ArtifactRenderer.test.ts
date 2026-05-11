import { describe, expect, it } from 'vitest';
import { splitMessageArtifacts } from './ArtifactRenderer';

describe('splitMessageArtifacts', () => {
  it('extracts chart artifacts from fenced JSON while preserving surrounding markdown', () => {
    const parts = splitMessageArtifacts([
      'Here is the report:',
      '```hatcher-chart',
      '{"type":"bar","title":"Messages","data":[{"day":"Mon","count":3}],"xKey":"day","yKey":"count"}',
      '```',
      'Done.',
    ].join('\n'));

    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatchObject({ kind: 'markdown', content: 'Here is the report:\n' });
    expect(parts[1]).toMatchObject({
      kind: 'chart',
      artifact: {
        type: 'bar',
        title: 'Messages',
        xKey: 'day',
        yKey: 'count',
        data: [{ day: 'Mon', count: 3 }],
      },
    });
    expect(parts[2]).toMatchObject({ kind: 'markdown', content: '\nDone.' });
  });

  it('extracts image and file artifacts from markdown/fenced payloads', () => {
    const parts = splitMessageArtifacts([
      'Visual output:',
      '![Revenue chart](https://example.com/chart.png)',
      '```hatcher-file',
      '{"filename":"report.pdf","url":"https://example.com/report.pdf","mediaType":"application/pdf","title":"Quarterly report","sizeBytes":12345}',
      '```',
      '[File: https://example.com/raw.csv]',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Visual output:\n' },
      {
        kind: 'image',
        artifact: {
          alt: 'Revenue chart',
          url: 'https://example.com/chart.png',
        },
      },
      { kind: 'markdown', content: '\n' },
      {
        kind: 'file',
        artifact: {
          filename: 'report.pdf',
          title: 'Quarterly report',
          url: 'https://example.com/report.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 12345,
        },
      },
      { kind: 'markdown', content: '\n' },
      {
        kind: 'file',
        artifact: {
          filename: 'raw.csv',
          title: 'raw.csv',
          url: 'https://example.com/raw.csv',
        },
      },
    ]);
  });

  it('extracts generic code fences as downloadable code artifacts', () => {
    const parts = splitMessageArtifacts([
      'Use this:',
      '```ts',
      'export const answer = 42;',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Use this:\n' },
      {
        kind: 'code',
        artifact: {
          filename: 'snippet.ts',
          language: 'ts',
          code: 'export const answer = 42;',
        },
      },
    ]);
  });

  it('infers filenames near generic code fences', () => {
    const parts = splitMessageArtifacts([
      'Use this:',
      '```c',
      '#include <stdio.h>',
      'int main(void) { puts("hi"); return 0; }',
      '```',
      'Save it as a file named `hello.c`.',
    ].join('\n'));

    expect(parts[1]).toMatchObject({
      kind: 'code',
      artifact: {
        filename: 'hello.c',
        language: 'c',
      },
    });
  });

  it('turns markdown document fences into Word-compatible file downloads', () => {
    const parts = splitMessageArtifacts([
      'Document Word (.doc):',
      '```markdown',
      '# Hello World',
      '',
      'This opens in Word.',
      '```',
    ].join('\n'));

    expect(parts[1]).toMatchObject({
      kind: 'file',
      artifact: {
        filename: 'hello-world.doc',
        mediaType: 'application/msword',
      },
    });
    expect(parts[1].kind === 'file' ? parts[1].artifact.content : '').toContain('<h1>Hello World</h1>');
  });

  it('extracts safe TradingView iframe embeds', () => {
    const parts = splitMessageArtifacts([
      'Chart:',
      '<iframe src="https://tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD" width="100%" height="500"></iframe>',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Chart:\n' },
      {
        kind: 'embed',
        artifact: {
          title: 'TradingView BITSTAMP:BTCUSD',
          provider: 'tradingview',
          url: 'https://www.tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD',
          symbol: 'BITSTAMP:BTCUSD',
        },
      },
    ]);
  });

  it('extracts fenced iframe HTML as an embeddable DexScreener chart instead of code', () => {
    const parts = splitMessageArtifacts([
      'Live chart:',
      '```html',
      '<iframe src="https://dexscreener.com/solana/CGH49JQDQSh7U8nQrDhutEV4QB3h1NxsJoe7ho7UtSH3?embed=1&theme=dark" width="100%" height="520"></iframe>',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Live chart:\n' },
      {
        kind: 'embed',
        artifact: {
          title: 'DexScreener chart',
          provider: 'dexscreener',
          url: 'https://dexscreener.com/solana/CGH49JQDQSh7U8nQrDhutEV4QB3h1NxsJoe7ho7UtSH3?embed=1&theme=dark&trades=0&info=0',
        },
      },
    ]);
  });

  it('extracts structured GeckoTerminal embed artifacts', () => {
    const parts = splitMessageArtifacts([
      'Live pool:',
      '```hatcher-embed',
      '{"provider":"geckoterminal","title":"HATCHER live chart","url":"https://www.geckoterminal.com/solana/pools/CGH49JQDQSh7U8nQrDhutEV4QB3h1NxsJoe7ho7UtSH3"}',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Live pool:\n' },
      {
        kind: 'embed',
        artifact: {
          title: 'HATCHER live chart',
          provider: 'geckoterminal',
          url: 'https://www.geckoterminal.com/solana/pools/CGH49JQDQSh7U8nQrDhutEV4QB3h1NxsJoe7ho7UtSH3?embed=1&info=0&swaps=0',
        },
      },
    ]);
  });

  it('extracts image artifacts from mis-fenced hatcher-embed payloads', () => {
    const parts = splitMessageArtifacts([
      'Logo:',
      '```hatcher-embed',
      '{"alt":"Solana Logo","kind":"image","url":"https://assets.coingecko.com/coins/images/4128/standard/solana.png"}',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Logo:\n' },
      {
        kind: 'image',
        artifact: {
          alt: 'Solana Logo',
          url: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
        },
      },
    ]);
  });

  it('extracts symbol-only TradingView hatcher-embed payloads', () => {
    const parts = splitMessageArtifacts([
      'Chart:',
      '```hatcher-embed',
      '{"type":"tradingview","symbol":"BITSTAMP:BTCUSD","theme":"dark"}',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Chart:\n' },
      {
        kind: 'embed',
        artifact: {
          title: 'TradingView BITSTAMP:BTCUSD',
          provider: 'tradingview',
          url: 'https://s.tradingview.com/widgetembed/?symbol=BITSTAMP%3ABTCUSD&interval=D&theme=dark&style=1&locale=en',
          symbol: 'BITSTAMP:BTCUSD',
        },
      },
    ]);
  });

  it('suppresses duplicate generic JSON file specs after the same code artifact', () => {
    const parts = splitMessageArtifacts([
      'C "Hello World" code:',
      '```c',
      '#include <stdio.h>',
      '',
      'int main() {',
      '    printf("Hello, World!\\\\n");',
      '    return 0;',
      '}',
      '```',
      '',
      'Download the file:',
      '```json',
      '{"filename":"hello.c","mediaType":"text/c","content":"#include <stdio.h>\\n\\nint main() {\\n    printf(\\"Hello, World!\\\\\\\\n\\");\\n    return 0;\\n}"}',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'C "Hello World" code:\n' },
      {
        kind: 'code',
        artifact: {
          filename: 'hello.c',
          language: 'c',
          code: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\\\n");\n    return 0;\n}',
        },
      },
    ]);
  });

  it('renders standalone generic JSON file specs as file artifacts', () => {
    const parts = splitMessageArtifacts([
      'File:',
      '```json',
      '{"filename":"report.csv","mediaType":"text/csv","content":"day,count\\nMon,3"}',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'File:\n' },
      {
        kind: 'file',
        artifact: {
          filename: 'report.csv',
          title: 'report.csv',
          mediaType: 'text/csv',
          content: 'day,count\nMon,3',
        },
      },
    ]);
  });

  it('extracts hatcher-artifact code and inline file payloads for direct download', () => {
    const parts = splitMessageArtifacts([
      'Artifacts:',
      '```hatcher-artifact',
      '{"kind":"code","filename":"hello.py","language":"python","content":"print(\\"hi\\")"}',
      '```',
      '```hatcher-file',
      '{"filename":"report.csv","mediaType":"text/csv","content":"day,count\\nMon,3"}',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Artifacts:\n' },
      {
        kind: 'code',
        artifact: {
          filename: 'hello.py',
          language: 'python',
          code: 'print("hi")',
        },
      },
      { kind: 'markdown', content: '\n' },
      {
        kind: 'file',
        artifact: {
          filename: 'report.csv',
          title: 'report.csv',
          mediaType: 'text/csv',
          content: 'day,count\nMon,3',
        },
      },
    ]);
  });
});
