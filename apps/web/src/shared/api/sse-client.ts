// Đọc luồng SSE của lượt Trợ lý (TIP-023c 6a, đóng DV-006): fetch POST / GET → thân `text/event-stream` → frame `{ run_id, seq, cursor,
// event }` theo thứ tự. Bỏ heartbeat (`: hb`), frame hỏng; dừng ở `done` / `reset_required` hoặc khi server đóng. Rớt mạng giữa chừng →
// trả cursor cuối để caller nối lại `GET /assistant/runs/:id/stream?cursor=` (không gửi lại lượt, không chạy lại model).
import { streamFrameSchema, type StreamFrame } from '@appchat/shared';

export interface StreamOutcome {
  /** Đã thấy `done` (hoặc `reset_required`) — lượt kết thúc / phải dựng lại từ lịch sử. */
  finished: boolean;
  /** Cursor của frame cuối đã nhận (nối lại từ đây). */
  cursor: string | null;
}

/** Tách khối SSE (cách nhau bởi dòng trống) → dòng `data:` của mỗi khối. Phần dở dang cuối giữ lại cho lần đọc sau. */
export function splitSse(buf: string): { blocks: string[]; rest: string } {
  const parts = buf.replace(/\r\n/g, '\n').split('\n\n');
  const rest = parts.pop() ?? '';
  const blocks = parts
    .map((b) =>
      b
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n'),
    )
    .filter(Boolean);
  return { blocks, rest };
}

/** Frame hợp lệ hoặc null (không ném — một frame hỏng không làm hỏng cả lượt). */
export function parseFrame(data: string): StreamFrame | null {
  try {
    const r = streamFrameSchema.safeParse(JSON.parse(data));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Đọc hết thân SSE, gọi `onFrame` theo thứ tự seq (bỏ seq trùng / cũ). */
export async function readSse(body: ReadableStream<Uint8Array>, onFrame: (f: StreamFrame) => void, signal?: AbortSignal): Promise<StreamOutcome> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let last = 0;
  let cursor: string | null = null;
  try {
    for (;;) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const { blocks, rest } = splitSse(buf);
      buf = rest;
      for (const b of blocks) {
        const f = parseFrame(b);
        if (!f || (f.seq <= last && f.event.type !== 'reset_required')) continue;
        last = Math.max(last, f.seq);
        if (f.cursor) cursor = f.cursor;
        onFrame(f);
        if (f.event.type === 'done' || f.event.type === 'reset_required') return { finished: true, cursor };
      }
    }
  } catch {
    // Rớt mạng / huỷ: trả cursor để nối lại.
  } finally {
    reader.releaseLock();
  }
  return { finished: false, cursor };
}
