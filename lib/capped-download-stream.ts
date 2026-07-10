export function cappedDownloadStream(
  source: ReadableStream<Uint8Array>,
  maxBytes: number,
  onOverflow?: (error: Error) => void,
): ReadableStream<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error('Download byte limit must be a positive safe integer');
  }

  const reader = source.getReader();
  let total = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      total += value.byteLength;
      if (total > maxBytes) {
        const error = new Error('Artifact is too large');
        controller.error(error);
        onOverflow?.(error);
        await reader.cancel(error).catch(() => {});
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
