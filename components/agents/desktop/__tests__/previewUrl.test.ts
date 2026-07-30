import { describe, expect, it } from 'vitest';
import { buildPreviewProxyUrl } from '../previewUrl';

describe('buildPreviewProxyUrl', () => {
  it('builds the frontend-origin proxy path with the token and defaults to index.html', () => {
    expect(buildPreviewProxyUrl('agent_1', 'tok_abc'))
      .toBe('/api/agents/agent_1/preview/t/tok_abc/index.html');
  });

  it('encodes the agent id and token for path safety', () => {
    expect(buildPreviewProxyUrl('agent 1', 'tok/abc'))
      .toBe('/api/agents/agent%201/preview/t/tok%2Fabc/index.html');
  });

  it('builds a proxy path for an explicit sub-resource', () => {
    expect(buildPreviewProxyUrl('agent_1', 'tok_abc', 'assets/app.js'))
      .toBe('/api/agents/agent_1/preview/t/tok_abc/assets/app.js');
  });

  it('strips a leading slash from an explicit path so segments never double up', () => {
    expect(buildPreviewProxyUrl('agent_1', 'tok_abc', '/assets/app.js'))
      .toBe('/api/agents/agent_1/preview/t/tok_abc/assets/app.js');
  });
});
