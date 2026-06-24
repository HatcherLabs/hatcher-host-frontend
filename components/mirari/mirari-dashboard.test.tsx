import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MirariDashboard } from './mirari-dashboard';

describe('MirariDashboard drop-in', () => {
  it('builds the Mirari iframe src with canonical snake_case mount params', () => {
    const html = renderToStaticMarkup(
      <MirariDashboard
        token="grant.jwt"
        workspaceId="hatcher-shared"
        orgId="org_test_handshake"
        agentId="*"
        runtime="hermes"
        view="signals"
        theme="light"
      />,
    );

    expect(html).toContain('src="https://entermirari.cloud/embed/signals?');
    expect(html).toContain('token=grant.jwt');
    expect(html).toContain('workspace_id=hatcher-shared');
    expect(html).toContain('org_id=org_test_handshake');
    expect(html).toContain('agent_id=*');
    expect(html).toContain('runtime=hermes');
    expect(html).toContain('theme=light');
    expect(html).toContain('sandbox="allow-scripts allow-same-origin"');
  });

  it('trims a custom baseUrl before appending the embed path', () => {
    const html = renderToStaticMarkup(
      <MirariDashboard
        baseUrl="https://example.mirari.test///"
        token="grant.jwt"
        workspaceId="ws"
        orgId="org"
        agentId="agent"
      />,
    );

    expect(html).toContain('src="https://example.mirari.test/embed/mirror?');
  });
});
