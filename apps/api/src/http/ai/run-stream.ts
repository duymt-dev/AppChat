// Đường ống SSE của một run Trợ lý (TIP-023c 6a, SPEC vận hành) — dùng chung cho `GET /assistant/runs/:id/stream` (nối lại theo cursor)
// và `POST /assistant/messages` khi `Accept: text/event-stream`. Replay từ sổ sau cursor đã ký → subscribe Redis kênh run nhận tiếp. Chỉ
// phát sự kiện đã ghi bền. Heartbeat 15s; hàng đợi ≤ 256 frame / subscriber — quá tải thì ngắt (client nối lại bằng cursor), không bỏ sự
// kiện rồi báo done. Đóng kết nối chỉ huỷ đăng ký, KHÔNG huỷ run (Dừng = run.cancel). Không trừ credit cho heartbeat / ngắt.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Redis } from 'ioredis';
import type { AssistantService } from '@appchat/core';
import { GENUI_STREAM, type StreamEvent } from '@appchat/shared';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'handoff', 'waiting_approval']);
const channel = (runId: string) => `appchat:assistant:run:${runId}`;

type Caller = Parameters<AssistantService['replay']>[0];

/** Trả về khi luồng đã đóng. */
export async function pipeRunStream(svc: AssistantService, redis: Redis, req: IncomingMessage, res: ServerResponse, a: Caller, id: string, cursor?: string): Promise<void> {
  const signer = svc.cursors();
  const after = cursor ? signer.verify(id, a.userId, cursor) : 0;
  const first = await svc.replay(a, id, after);

  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  let last = after;
  let queued = 0;
  let closed = false;
  const send = (seq: number, event: StreamEvent) => {
    if (closed || seq <= last) return;
    last = seq;
    const frame = JSON.stringify({ run_id: id, seq, cursor: signer.sign(id, a.userId, seq), event });
    if (Buffer.byteLength(frame) > GENUI_STREAM.frameBytes) return end();
    queued++;
    if (queued > GENUI_STREAM.queueFrames) return end();
    res.write(`id: ${seq}\nevent: ${event.type}\ndata: ${frame}\n\n`, () => queued--);
    if (event.type === 'done' || event.type === 'reset_required') end();
  };
  const sub = redis.duplicate();
  const hb = setInterval(() => res.write(': hb\n\n'), GENUI_STREAM.heartbeatMs);
  let finished: () => void = () => undefined;
  const done = new Promise<void>((r) => (finished = r));
  const end = () => {
    if (closed) return;
    closed = true;
    clearInterval(hb);
    void sub.quit().catch(() => undefined);
    res.end();
    finished();
  };
  req.on('close', end);

  if (first.events === 'reset_required') return void (res.write(`event: reset_required\ndata: ${JSON.stringify({ run_id: id, seq: after, cursor: cursor ?? '', event: { type: 'reset_required' } })}\n\n`), end());
  /** Đọc phần sổ sau `last` (lấp khoảng trống khi pub/sub đến lệch thứ tự hoặc lúc vừa subscribe). */
  const catchUp = async () => {
    const r = await svc.replay(a, id, last);
    if (r.events === 'reset_required') return end();
    for (const e of r.events) send(e.seq, e.event);
  };
  // Subscribe TRƯỚC khi đọc nốt phần sổ mới (không lọt sự kiện giữa replay và subscribe); seq ≤ last bị bỏ (trùng).
  sub.on('message', (_ch, raw: string) => {
    try {
      const m = JSON.parse(raw) as { seq: number; event: StreamEvent };
      if (m.seq === last + 1) send(m.seq, m.event);
      else if (m.seq > last + 1) void catchUp();
    } catch {
      /* frame hỏng — bỏ */
    }
  });
  await sub.subscribe(channel(id));
  for (const e of first.events) send(e.seq, e.event);
  await catchUp();
  // Run đã dừng (xong / chờ xác nhận) mà sổ không có `done` (ví dụ run cũ trước 023c) → đóng để client không treo.
  if (TERMINAL.has(first.status) && !closed && !first.events.some((e) => e.event.type === 'done')) {
    const again = await svc.replay(a, id, last);
    if (again.events !== 'reset_required' && !again.events.length) end();
  }
  // Giữ handler tới khi luồng đóng (done / reset / client ngắt / quá tải) — controller `passthrough` không được kết thúc response sớm.
  await done;
}
