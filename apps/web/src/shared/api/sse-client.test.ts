import { describe, expect, it } from 'vitest';
import type { StreamFrame } from '@appchat/shared';
import { parseFrame, readSse, splitSse } from './sse-client';

const frame = (seq: number, event: StreamFrame['event']) => `id: ${seq}\nevent: ${event.type}\ndata: ${JSON.stringify({ run_id: 'r1', seq, cursor: `c${seq}`, event })}\n\n`;

/** Thân SSE chia thành các mảnh tuỳ ý (cắt giữa frame) — như mạng thật. */
function body(chunks: string[], fail = false): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  // Giao từng mảnh khi reader đòi; hết mảnh mới đóng / lỗi (lỗi trong start sẽ bỏ cả mảnh đang chờ — không giống mạng thật).
  return new ReadableStream({
    pull(c) {
      if (i < chunks.length) c.enqueue(enc.encode(chunks[i++]!));
      else if (fail) c.error(new Error('network'));
      else c.close();
    },
  });
}

describe('sse-client', () => {
  it('ghép frame bị cắt giữa chừng, bỏ heartbeat, dừng ở done', async () => {
    const all = `: hb\n\n${frame(1, { type: 'delta', text: 'Chào ' })}${frame(2, { type: 'delta', text: 'anh' })}${frame(3, { type: 'done', status: 'completed', session_id: 's' })}${frame(4, { type: 'delta', text: 'thừa' })}`;
    const seen: StreamFrame[] = [];
    const out = await readSse(body([all.slice(0, 37), all.slice(37, 120), all.slice(120)]), (f) => seen.push(f));
    expect(seen.map((f) => f.seq)).toEqual([1, 2, 3]);
    expect(out).toEqual({ finished: true, cursor: 'c3' });
  });

  it('frame hỏng / seq trùng bị bỏ; rớt mạng → chưa xong + cursor cuối để nối lại', async () => {
    const seen: number[] = [];
    const out = await readSse(body([frame(1, { type: 'delta', text: 'a' }), 'data: {hỏng\n\n', frame(1, { type: 'delta', text: 'a' }), frame(2, { type: 'delta', text: 'b' })], true), (f) => seen.push(f.seq));
    expect(seen).toEqual([1, 2]);
    expect(out).toEqual({ finished: false, cursor: 'c2' });
  });

  it('reset_required kết thúc luồng (dựng lại từ lịch sử)', async () => {
    const out = await readSse(body([frame(0, { type: 'reset_required' })]), () => undefined);
    expect(out.finished).toBe(true);
  });

  it('splitSse giữ phần dở dang; parseFrame không ném', () => {
    expect(splitSse('data: a\n\ndata: b')).toEqual({ blocks: ['a'], rest: 'data: b' });
    expect(parseFrame('không phải json')).toBeNull();
    expect(parseFrame(JSON.stringify({ run_id: 'r', seq: 1, cursor: 'c', event: { type: 'nope' } }))).toBeNull();
  });
});
