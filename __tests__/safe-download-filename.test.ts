import { describe, expect, it } from 'vitest';
import {
  MAX_DOWNLOAD_FILENAME_LENGTH,
  safeDownloadFilename,
} from '@/lib/safe-download-filename';

describe('safeDownloadFilename', () => {
  it('replaces header-unsafe characters and trims edge separators', () => {
    expect(safeDownloadFilename('  ../monthly\r\n report?.pdf  ')).toBe('..-monthly---report-.pdf');
  });

  it('uses a stable fallback when no filename content remains', () => {
    expect(safeDownloadFilename('---\r\n---')).toBe('artifact');
  });

  it('bounds filenames without scanning past the output limit', () => {
    const filename = safeDownloadFilename(`report-${'a'.repeat(10_000)}.txt`);

    expect(filename).toHaveLength(MAX_DOWNLOAD_FILENAME_LENGTH);
    expect(filename.startsWith('report-')).toBe(true);
  });

  it('reserves space for a caller-provided suffix', () => {
    expect(`${safeDownloadFilename('a'.repeat(500), 156)}.mp4`).toHaveLength(160);
  });
});
