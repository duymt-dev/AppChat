// SSE lượt Trợ lý (TIP-023c 6a, SPEC vận hành): GET /v1/assistant/runs/:id/stream?cursor= (Accept: text/event-stream).
// Kiểm run là lượt của người gọi → replay từ sổ sự kiện sau cursor đã ký → subscribe Redis `appchat:assistant:run:<id>` nhận tiếp. Chỉ
// phát sự kiện đã ghi bền. Heartbeat 15s; hàng đợi ≤ 256 frame / subscriber — quá tải thì ngắt (client nối lại bằng cursor), không bỏ sự
// kiện rồi báo done. Đóng kết nối chỉ huỷ đăng ký, KHÔNG huỷ run (Dừng = run.cancel). Không trừ credit cho heartbeat / ngắt.
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Redis } from 'ioredis';
import { AssistantService, REDIS, RequestContext } from '@appchat/core';
import { AppError, GENUI_STREAM, type StreamEvent } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'handoff', 'waiting_approval']);
const channel = (runId: string) => `appchat:assistant:run:${runId}`;

@Controller('assistant/runs')
export class AssistantStreamController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(AssistantService) private readonly svc: AssistantService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get(':id/stream')
  async stream(@Req() req: IncomingMessage, @Res() res: ServerResponse, @Param('id') id: string, @Query('cursor') cursor?: string) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('assistant.use')) throw new AppError('FORBIDDEN', 403, { permission: 'assistant.use' });
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
    RequestContext.patch({ ws: a.workspaceId, userId: a.userId });
    const signer = this.svc.cursors();
    const after = cursor ? signer.verify(id, a.userId, cursor) : 0;
    const first = await this.svc.replay(a, id, after);

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
    const sub = this.redis.duplicate();
    const hb = setInterval(() => res.write(': hb\n\n'), GENUI_STREAM.heartbeatMs);
    const end = () => {
      if (closed) return;
      closed = true;
      clearInterval(hb);
      void sub.quit().catch(() => undefined);
      res.end();
    };
    req.on('close', end);

    if (first.events === 'reset_required') return void (res.write(`event: reset_required\ndata: ${JSON.stringify({ run_id: id, seq: after, cursor: cursor ?? '', event: { type: 'reset_required' } })}\n\n`), end());
    // Subscribe TRƯỚC khi đọc nốt phần sổ mới (không lọt sự kiện giữa replay và subscribe); seq ≤ last bị bỏ (trùng).
    sub.on('message', (_ch, raw: string) => {
      try {
        const m = JSON.parse(raw) as { seq: number; event: StreamEvent };
        if (m.seq === last + 1) send(m.seq, m.event);
        else if (m.seq > last + 1) void this.catchUp(a, id, () => last, send, end);
      } catch {
        /* frame hỏng — bỏ */
      }
    });
    await sub.subscribe(channel(id));
    for (const e of first.events) send(e.seq, e.event);
    await this.catchUp(a, id, () => last, send, end);
    // Run đã dừng (xong / chờ xác nhận) mà sổ không có `done` (ví dụ run cũ trước 023c) → đóng để client không treo.
    if (TERMINAL.has(first.status) && !closed && !first.events.some((e) => e.event.type === 'done')) {
      const again = await this.svc.replay(a, id, last);
      if (again.events !== 'reset_required' && !again.events.length) end();
    }
  }

  /** Đọc phần sổ sau `last` (lấp khoảng trống khi pub/sub đến lệch thứ tự hoặc lúc vừa subscribe). */
  private async catchUp(a: Parameters<AssistantService['replay']>[0], id: string, last: () => number, send: (seq: number, e: StreamEvent) => void, end: () => void) {
    const r = await this.svc.replay(a, id, last());
    if (r.events === 'reset_required') return end();
    for (const e of r.events) send(e.seq, e.event);
  }
}
