export const CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export function isChatDataUrlAttachmentMimeType(mimeType: string): boolean {
  return /^image\/(png|jpe?g|webp|gif)$/i.test(mimeType);
}

export function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    const mb = sizeBytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Number(mb.toFixed(1))} MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}
