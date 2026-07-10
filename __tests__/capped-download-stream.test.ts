import { describe, expect, it, vi } from 'vitest';
import { cappedDownloadStream } from '@/lib/capped-download-stream';

describe('cappedDownloadStream', () => {
  it('passes through a stream that remains within the byte limit', async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });

    const result = await new Response(cappedDownloadStream(source, 4)).arrayBuffer();

    expect(Array.from(new Uint8Array(result))).toEqual([1, 2, 3, 4]);
  });

  it('errors, destroys the upstream, and cancels a chunked stream over the limit', async () => {
    const cancel = vi.fn();
    const destroyUpstream = vi.fn();
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
      },
      cancel,
    });
    const reader = cappedDownloadStream(source, 3, destroyUpstream).getReader();

    await expect(reader.read()).resolves.toEqual({ done: false, value: new Uint8Array([1, 2]) });
    await expect(reader.read()).rejects.toThrow('Artifact is too large');
    expect(destroyUpstream).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(cancel.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('rejects invalid byte limits before consuming a source', () => {
    expect(() => cappedDownloadStream(new ReadableStream(), 0)).toThrow(
      'Download byte limit must be a positive safe integer',
    );
  });
});
