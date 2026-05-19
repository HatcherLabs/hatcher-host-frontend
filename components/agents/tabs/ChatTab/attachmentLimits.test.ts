import { describe, expect, it } from 'vitest';
import { CHAT_ATTACHMENT_MAX_BYTES, formatAttachmentSize } from './attachmentLimits';

describe('chat attachment limits', () => {
  it('sets the chat attachment cap to 50 MiB', () => {
    expect(CHAT_ATTACHMENT_MAX_BYTES).toBe(50 * 1024 * 1024);
  });

  it('formats large attachments in MB', () => {
    expect(formatAttachmentSize(CHAT_ATTACHMENT_MAX_BYTES)).toBe('50 MB');
    expect(formatAttachmentSize(1_037_847)).toBe('1014 KB');
  });
});
