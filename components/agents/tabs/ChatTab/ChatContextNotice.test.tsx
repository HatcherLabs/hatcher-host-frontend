import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ChatContextNotice } from './ChatContextNotice';
describe('chat context notice', () => {
  it('stays hidden when all history fits', () => {
    expect(renderToStaticMarkup(<ChatContextNotice limited={false} />)).toBe('');
  });
  it('explains limited context without claiming saved history was deleted', () => {
    const html = renderToStaticMarkup(<ChatContextNotice limited />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Saved messages remain available');
    expect(html).toContain('restate the key details');
  });
});
