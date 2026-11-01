// Transactional outbox (standards/events/outbox.md): ghi outbox_event trong transaction nghiệp vụ; sau commit SADD outbox:dirty.
import { uuidv7 } from '../ids';
import type { TenantTx } from '../actions/action-context';
import type { KeyValueStore } from '../redis';

export const OUTBOX_DIRTY = 'outbox:dirty';

export interface OutboxEventInput {
  topic: string;
  payload: Record<string, unknown>;
}

/** Payload luôn có `ws` + `occurred_at` (outbox §3). */
export async function writeOutbox(
  tx: TenantTx,
  workspaceId: string,
  events: OutboxEventInput[],
  now: Date,
  traceId?: string,
): Promise<number> {
  if (!events.length) return 0;
  await tx.outboxEvent.createMany({
    data: events.map((e) => ({
      id: uuidv7(now.getTime()),
      topic: e.topic,
      payload: { ...e.payload, ws: workspaceId, occurred_at: now.toISOString() },
      availableAt: now,
      traceId: traceId ?? null,
    })),
  });
  return events.length;
}

export async function markDirty(kv: KeyValueStore, workspaceId: string): Promise<void> {
  await kv.sadd(OUTBOX_DIRTY, workspaceId);
}
