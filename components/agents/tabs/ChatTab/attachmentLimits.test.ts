import { describe, expect, it } from 'vitest';
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  formatAttachmentSize,
  isChatDataUrlAttachmentMimeType,
} from './attachmentLimits';

describe('chat attachment limits', () => {
  it('sets the chat attachment cap to 50 MiB', () => {
    expect(CHAT_ATTACHMENT_MAX_BYTES).toBe(50 * 1024 * 1024);
  });

  it('formats large attachments in MB', () => {
    expect(formatAttachmentSize(CHAT_ATTACHMENT_MAX_BYTES)).toBe('50 MB');
    expect(formatAttachmentSize(1_037_847)).toBe('1014 KB');
  });

  it('only forwards image data URLs as raw chat attachments', () => {
    expect(isChatDataUrlAttachmentMimeType('image/png')).toBe(true);
    expect(isChatDataUrlAttachmentMimeType('image/jpeg')).toBe(true);
    expect(isChatDataUrlAttachmentMimeType('application/pdf')).toBe(false);
    expect(isChatDataUrlAttachmentMimeType('application/octet-stream')).toBe(false);
  });
});
