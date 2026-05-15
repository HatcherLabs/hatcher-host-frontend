import { describe, expect, it } from 'vitest';
import { chartValueDomain, splitMessageArtifacts } from './ArtifactRenderer';

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
          filename: 'chart.png',
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fexample.com%2Fchart.png&filename=chart.png',
          mediaType: 'image/png',
        },
      },
      { kind: 'markdown', content: '\n' },
      {
        kind: 'file',
        artifact: {
          filename: 'report.pdf',
          title: 'Quarterly report',
          url: 'https://example.com/report.pdf',
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fexample.com%2Freport.pdf&filename=report.pdf',
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
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fexample.com%2Fraw.csv&filename=raw.csv',
        },
      },
    ]);
  });

  it('rewrites OpenClaw MEDIA image references to authenticated media artifact URLs', () => {
    const parts = splitMessageArtifacts(
      '![Robotel iesind din ou](MEDIA:/tmp/robot_egg.png)',
      { agentId: 'agent_123' },
    );

    expect(parts).toEqual([
      {
        kind: 'image',
        artifact: {
          alt: 'Robotel iesind din ou',
          url: '/api/agents/agent_123/media?path=%2Ftmp%2Frobot_egg.png',
          downloadUrl: '/api/agents/agent_123/media?path=%2Ftmp%2Frobot_egg.png&download=1',
          filename: 'robot_egg.png',
          mediaType: 'image/png',
        },
      },
    ]);
  });

  it('rewrites relative generated image filenames to authenticated workspace media URLs', () => {
    const parts = splitMessageArtifacts(
      'Here it is:\n![Hatcher Robot](hatcher_robot.png)',
      { agentId: 'agent_123' },
    );

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Here it is:\n' },
      {
        kind: 'image',
        artifact: {
          alt: 'Hatcher Robot',
          url: '/api/agents/agent_123/media?path=hatcher_robot.png',
          downloadUrl: '/api/agents/agent_123/media?path=hatcher_robot.png&download=1',
          filename: 'hatcher_robot.png',
          mediaType: 'image/png',
        },
      },
    ]);
  });

  it('renders markdown media links and standalone MEDIA lines as playback artifacts', () => {
    const parts = splitMessageArtifacts([
      '[Generated clip](generated/demo.mp4)',
      'MEDIA:voiceover.mp3',
    ].join('\n'), { agentId: 'agent_123' });

    expect(parts).toEqual([
      {
        kind: 'video',
        artifact: {
          title: 'Generated clip',
          url: '/api/agents/agent_123/media?path=generated%2Fdemo.mp4',
          downloadUrl: '/api/agents/agent_123/media?path=generated%2Fdemo.mp4&download=1',
          filename: 'demo.mp4',
          mediaType: 'video/mp4',
        },
      },
      {
        kind: 'audio',
        artifact: {
          title: 'voiceover.mp3',
          url: '/api/agents/agent_123/media?path=voiceover.mp3',
          downloadUrl: '/api/agents/agent_123/media?path=voiceover.mp3&download=1',
          filename: 'voiceover.mp3',
          mediaType: 'audio/mpeg',
        },
      },
    ]);
  });

  it('rewrites OpenClaw MEDIA audio file artifacts as playable audio', () => {
    const parts = splitMessageArtifacts([
      '```hatcher-artifact',
      '{"kind":"file","title":"Theme sound","url":"MEDIA:/tmp/theme.wav"}',
      '```',
    ].join('\n'), { agentId: 'agent_123' });

    expect(parts).toEqual([
      {
        kind: 'audio',
        artifact: {
          title: 'Theme sound',
          url: '/api/agents/agent_123/media?path=%2Ftmp%2Ftheme.wav',
          downloadUrl: '/api/agents/agent_123/media?path=%2Ftmp%2Ftheme.wav&download=1',
          filename: 'theme.wav',
          mediaType: 'audio/wav',
        },
      },
    ]);
  });

  it('extracts downloadable audio and video artifacts', () => {
    const parts = splitMessageArtifacts([
      'Media:',
      '```hatcher-artifact',
      '{"kind":"video","title":"Demo clip","url":"https://cdn.example.com/demo.mp4"}',
      '```',
      '```hatcher-artifact',
      '{"kind":"audio","title":"Narration","url":"https://cdn.example.com/narration.mp3"}',
      '```',
    ].join('\n'));

    expect(parts).toEqual([
      { kind: 'markdown', content: 'Media:\n' },
      {
        kind: 'video',
        artifact: {
          title: 'Demo clip',
          url: 'https://cdn.example.com/demo.mp4',
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fcdn.example.com%2Fdemo.mp4&filename=demo.mp4',
          filename: 'demo.mp4',
          mediaType: 'video/mp4',
        },
      },
      { kind: 'markdown', content: '\n' },
      {
        kind: 'audio',
        artifact: {
          title: 'Narration',
          url: 'https://cdn.example.com/narration.mp3',
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fcdn.example.com%2Fnarration.mp3&filename=narration.mp3',
          filename: 'narration.mp3',
          mediaType: 'audio/mpeg',
        },
      },
    ]);
  });

  it('adds a proxy download URL for external image artifacts', () => {
    const parts = splitMessageArtifacts('![Logo](https://assets.example.com/logo.png)');

    expect(parts).toEqual([
      {
        kind: 'image',
        artifact: {
          alt: 'Logo',
          url: 'https://assets.example.com/logo.png',
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fassets.example.com%2Flogo.png&filename=logo.png',
          filename: 'logo.png',
          mediaType: 'image/png',
        },
      },
    ]);
  });

  it('renders markdown image syntax pointing at video files as video artifacts', () => {
    const parts = splitMessageArtifacts('![Robotel iesind din ou](https://v3.fal.media/files/penguin/demo.mp4)');

    expect(parts).toEqual([
      {
        kind: 'video',
        artifact: {
          title: 'Robotel iesind din ou',
          url: 'https://v3.fal.media/files/penguin/demo.mp4',
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fv3.fal.media%2Ffiles%2Fpenguin%2Fdemo.mp4&filename=demo.mp4',
          filename: 'demo.mp4',
          mediaType: 'video/mp4',
        },
      },
    ]);
  });

  it('rewrites OpenRouter video content URLs through the authenticated agent media proxy', () => {
    const parts = splitMessageArtifacts(
      '```hatcher-artifact\n{"kind":"video","title":"Generated video","url":"https://openrouter.ai/api/v1/videos/job-123/content?index=0"}\n```',
      { agentId: 'agent_123' },
    );

    expect(parts).toEqual([
      {
        kind: 'video',
        artifact: {
          title: 'Generated video',
          url: '/api/agents/agent_123/media?videoJobId=job-123&index=0',
          downloadUrl: '/api/agents/agent_123/media?videoJobId=job-123&index=0&download=1',
          filename: 'job-123.mp4',
          mediaType: 'video/mp4',
        },
      },
    ]);
  });

  it('keeps generated data URL images downloadable without turning the filename into base64', () => {
    const parts = splitMessageArtifacts('![Generated](data:image/png;base64,AAA=)');

    expect(parts).toEqual([
      {
        kind: 'image',
        artifact: {
          alt: 'Generated',
          url: 'data:image/png;base64,AAA=',
          downloadUrl: 'data:image/png;base64,AAA=',
          filename: 'artifact.png',
          mediaType: 'image/png',
        },
      },
    ]);
  });


  it('uses a padded line-chart domain instead of flattening small price moves against zero', () => {
    const domain = chartValueDomain(
      [
        { date: 'Mon', price: 0.000102 },
        { date: 'Tue', price: 0.000108 },
        { date: 'Wed', price: 0.000105 },
      ],
      'price',
    );

    expect(domain[0]).toBeGreaterThan(0);
    expect(domain[0]).toBeLessThan(0.000102);
    expect(domain[1]).toBeGreaterThan(0.000108);
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
          filename: 'solana.png',
          downloadUrl: '/api/artifacts/download?url=https%3A%2F%2Fassets.coingecko.com%2Fcoins%2Fimages%2F4128%2Fstandard%2Fsolana.png&filename=solana.png',
          mediaType: 'image/png',
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
