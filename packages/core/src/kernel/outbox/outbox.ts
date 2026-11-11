// Transactional outbox (standards/events/outbox.md): ghi outbox_event trong transaction nghiệp vụ; sau commit SADD outbox:dirty.
// TIP-003b: trong transaction đã đăng ký (`withEventTransaction` / Executor / Undo) chỉ GOM vào collector — flush cuối cấp seq theo
// aggregate. Ngoài transaction đã đăng ký: pha v1 ghi thẳng như cũ; pha v2 từ chối (`EVENT_TRANSACTION_REQUIRED`) — không thể có event
// v2 thiếu seq / dispatch.
import { EventProtocolError } from '@appchat/shared';
import { uuidv7 } from '../ids';
import type { TenantTx } from '../actions/action-context';
import type { KeyValueStore } from '../redis';
import { readProtocolState, type StagedEvent } from './collector';
import { collectorOf } from './transaction';

export const OUTBOX_DIRTY = 'outbox:dirty';

export interface OutboxEventInput {
  topic: string;
  payload: Record<string, unknown>;
}

/** Payload luôn có `ws` + `occurred_at` (outbox §3). Trả số event đã gom / ghi. */
export async function writeOutbox(
  tx: TenantTx,
  workspaceId: string,
  events: OutboxEventInput[],
  now: Date,
  traceId?: string,
): Promise<number> {
  if (!events.length) return 0;
  const staged: StagedEvent[] = events.map((e) => ({
    id: uuidv7(now.getTime()),
    topic: e.topic,
    payload: { ...e.payload, ws: workspaceId, occurred_at: now.toISOString() },
    availableAt: now,
    traceId: traceId ?? null,
  }));
  const c = collectorOf(tx);
  if (c) return c.stage(workspaceId, staged);
  // Client giả trong unit test không có $queryRaw — coi như v1 (DB thật luôn có bảng trạng thái sau migration 003b).
  if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === 'function') {
    const state = await readProtocolState(tx);
    if (state.phase !== 'v1') throw new EventProtocolError(state.phase === 'fenced' ? 'EVENT_PROTOCOL_FENCED' : 'EVENT_TRANSACTION_REQUIRED', events[0]!.topic);
  }
  await tx.outboxEvent.createMany({ data: staged.map((e) => ({ id: e.id, topic: e.topic, payload: e.payload as object, availableAt: e.availableAt, traceId: e.traceId })) });
  return events.length;
}

export async function markDirty(kv: KeyValueStore, workspaceId: string): Promise<void> {
  await kv.sadd(OUTBOX_DIRTY, workspaceId);
}
