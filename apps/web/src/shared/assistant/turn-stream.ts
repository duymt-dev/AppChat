// Lượt Trợ lý qua SSE (TIP-023c 6a, đóng DV-006) — dùng chung cho màn Trợ lý, drawer theo màn và Dock: `POST /assistant/messages`
// (Accept SSE) → delta hiện ngay khi worker ghi sổ, rồi thẻ xác nhận / cây / lệnh UI → `done`. Rớt mạng giữa chừng → nối lại
// `GET /assistant/runs/:id/stream?cursor=` (≤ 3 lần), KHÔNG gửi lại lượt (cùng request_id vẫn là cùng run nếu phải gửi lại).
import type { AssistantTurnDto, StreamFrame, TurnEventDto } from '@appchat/shared';
import { transport } from '../api/client';
import { newRequestId, type TurnRequest } from './assistant-client';

const RECONNECTS = 3;

export interface TurnStreamHandlers {
  /** Chữ mới của lượt (đã ghép) — cập nhật bong bóng đang gõ. */
  onText?: (text: string) => void;
}

/** Gom frame của một run thành sự kiện lượt (delta liền nhau gộp). `done` / `reset_required` trả riêng. */
export function collect(frames: readonly StreamFrame[]): { events: TurnEventDto[]; sessionId: string | null; reset: boolean } {
  const events: TurnEventDto[] = [];
  let sessionId: string | null = null;
  let reset = false;
  for (const { event } of frames) {
    if (event.type === 'done') sessionId = event.session_id;
    else if (event.type === 'reset_required') reset = true;
    else {
      const last = events.at(-1);
      if (event.type === 'delta' && last?.type === 'delta') last.text += event.text;
      else events.push(event.type === 'delta' ? { ...event } : event);
    }
  }
  return { events, sessionId, reset };
}

/** Gửi lượt qua luồng; trả cùng hình dạng JSON cũ (`session_id`, `run_id`, `events`) cho caller. */
export async function streamTurn(q: TurnRequest, h: TurnStreamHandlers = {}, signal?: AbortSignal): Promise<AssistantTurnDto> {
  const frames: StreamFrame[] = [];
  let text = '';
  const onFrame = (f: StreamFrame) => {
    frames.push(f);
    if (f.event.type === 'delta') h.onText?.((text += f.event.text));
  };
  const body = { text: q.text, mode: q.mode, session_id: q.sessionId, tier: q.tier, context: q.context, request_id: q.requestId ?? newRequestId() };
  let out = await transport.stream('/assistant/messages', body, onFrame, signal);
  for (let i = 0; !out.finished && i < RECONNECTS && frames.length && !signal?.aborted; i++) {
    const run = frames[0]!.run_id;
    out = await transport.stream(`/assistant/runs/${encodeURIComponent(run)}/stream${out.cursor ? `?cursor=${encodeURIComponent(out.cursor)}` : ''}`, undefined, onFrame, signal);
  }
  if (!out.finished) throw new Error('stream_incomplete');
  const c = collect(frames);
  return { session_id: c.sessionId ?? q.sessionId ?? '', run_id: frames[0]?.run_id ?? null, events: c.events };
}
