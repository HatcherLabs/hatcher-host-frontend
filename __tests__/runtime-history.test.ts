import { describe, expect, it } from 'vitest';
import { appendRuntimeChunks, runtimeHistoryText, type RuntimeHistoryChunk } from '../lib/runtime-history';
const chunk = (text: string, offset = 0): RuntimeHistoryChunk => ({ id: '1:0', role: 'assistant', kind: 'analysis', toolName: null, timestamp: 1, text, offset, totalChars: 20000 });
describe('full runtime history', () => {
  it('reassembles and exports long Unicode content without the dashboard preview cap', () => {
    const first = 'a'.repeat(16000); const last = '🧛'.repeat(2000);
    const initial = appendRuntimeChunks([], [chunk(first)]);
    const result = appendRuntimeChunks(initial, [chunk(last, first.length)]);
    expect(result).toHaveLength(1); expect(result[0].text).toBe(first + last);
    expect(initial[0].text).toBe(first);
    expect(runtimeHistoryText(result)).toContain(first + last);
  });
  it('rejects gaps and repeated pages rather than silently exporting incomplete history', () => {
    expect(() => appendRuntimeChunks([], [chunk('tail', 4000)])).toThrow('incomplete');
    const initial = [chunk('start')];
    expect(() => appendRuntimeChunks(initial, [chunk('tail', 6)])).toThrow('changed');
    expect(() => appendRuntimeChunks(initial, [chunk('start')])).toThrow('changed');
  });
});
