// Bộ gom sự kiện theo transaction (TIP-003b §2.1): `writeOutbox(tx, …)` trong transaction đã đăng ký chỉ GOM (kiểm + đóng băng giá trị),
// không khoá seq giữa chừng công việc domain. Flush DUY NHẤT ở cuối callback (trước commit): đọc trạng thái giao thức FOR SHARE (rào
// cutover — UPDATE pha phải chờ transaction producer đang chạy), rồi ghi. v1 (mặc định) = ghi đúng như cũ (không seq / không kiểm
// schema); v2 = kiểm schema + aggregate, cấp seq theo (kind, id) đã sắp, chèn outbox + event_dispatch. Sau khi khoá seq không còn SQL
// domain / mạng nào. Gắn với đúng client transaction qua WeakMap — không ngữ cảnh tenant toàn cục.
import { EventProtocolError, MAX_EVENTS_PER_TX, eventMetadata, type EventMetadata } from '@appchat/shared';
import type { TenantTx } from '../actions/action-context';
import { uuidv7 } from '../ids';
import { allocateSequences } from './sequence';

export interface StagedEvent {
  id: string;
  topic: string;
  /** Bản sao đã đóng băng (có ws + occurred_at). */
  payload: Record<string, unknown>;
  availableAt: Date;
  traceId: string | null;
}

export type ProtocolPhase = 'v1' | 'fenced' | 'v2';
export interface ProtocolState {
  phase: ProtocolPhase;
  registryVersion: number | null;
}

export class EventCollector {
  private readonly staged: StagedEvent[] = [];
  private closed = false;
  constructor(readonly workspaceId: string) {}

  get size(): number {
    return this.staged.length;
  }

  stage(ws: string, events: readonly StagedEvent[]): number {
    if (this.closed) throw new EventProtocolError('EVENT_TRANSACTION_CLOSED', events[0]?.topic ?? '-');
    if (ws !== this.workspaceId) throw new EventProtocolError('EVENT_WORKSPACE_MISMATCH', events[0]?.topic ?? '-');
    if (this.staged.length + events.length > MAX_EVENTS_PER_TX) throw new EventProtocolError('EVENT_BATCH_TOO_LARGE', events[0]?.topic ?? '-');
    this.staged.push(...events.map((e) => ({ ...e, payload: structuredClone(e.payload) })));
    return events.length;
  }

  /** Flush cuối: một lần duy nhất; trả số event đã ghi. Sau đó collector đóng (gọi stage nữa → lỗi). */
  async flush(tx: TenantTx): Promise<number> {
    if (this.closed) return 0;
    this.closed = true;
    if (!this.staged.length) return 0;
    const state = await readProtocolState(tx);
    if (state.phase === 'fenced') throw new EventProtocolError('EVENT_PROTOCOL_FENCED', this.staged[0]!.topic);
    if (state.phase === 'v1') {
      await tx.outboxEvent.createMany({ data: this.staged.map((e) => ({ id: e.id, topic: e.topic, payload: e.payload as object, availableAt: e.availableAt, traceId: e.traceId })) });
      return this.staged.length;
    }
    if (state.registryVersion == null) throw new EventProtocolError('EVENT_REGISTRY_MISSING', this.staged[0]!.topic);
    return flushV2(tx, this.workspaceId, this.staged, state.registryVersion);
  }

  discard(): void {
    this.closed = true;
    this.staged.length = 0;
  }
}

export async function readProtocolState(tx: TenantTx): Promise<ProtocolState> {
  const [r] = await tx.$queryRaw<{ phase: ProtocolPhase; registry_version: number | null }[]>`
    SELECT phase, registry_version FROM event_protocol_state WHERE id = 1 FOR SHARE`;
  return { phase: r?.phase ?? 'v1', registryVersion: r?.registry_version ?? null };
}

async function flushV2(tx: TenantTx, ws: string, staged: readonly StagedEvent[], registryVersion: number): Promise<number> {
  // 1. kiểm toàn bộ TRƯỚC mọi khoá seq — lỗi ở đây rollback cả transaction domain.
  const metas: EventMetadata[] = staged.map((e) => eventMetadata(e.topic, e.payload, ws, e.id));
  // 2. nhu cầu theo aggregate (giữ thứ tự gọi trong cùng aggregate).
  const counts = new Map<string, { kind: string; id: string; count: number }>();
  for (const m of metas) {
    const k = `${m.aggregateKind}|${m.aggregateId}`;
    const d = counts.get(k) ?? { kind: m.aggregateKind, id: m.aggregateId, count: 0 };
    d.count++;
    counts.set(k, d);
  }
  const first = await allocateSequences(tx, [...counts.values()]);
  const used = new Map<string, bigint>();
  const rows = staged.map((e, i) => {
    const m = metas[i]!;
    const k = `${m.aggregateKind}|${m.aggregateId}`;
    const seq = used.get(k) ?? first.get(k)!;
    used.set(k, seq + 1n);
    return { e, m, seq };
  });
  // 3. chèn outbox + dispatch (không SQL domain sau bước này).
  await tx.outboxEvent.createMany({
    data: rows.map(({ e, m, seq }) => ({
      id: e.id,
      topic: e.topic,
      payload: m.payload as object,
      availableAt: e.availableAt,
      traceId: e.traceId,
      protocolVersion: 2,
      aggregateKind: m.aggregateKind,
      aggregateId: m.aggregateId,
      aggregateSeq: seq,
      registryVersion,
    })),
  });
  await tx.eventDispatch.createMany({ data: rows.map(({ e }) => ({ eventId: e.id, protocolVersion: 2, registryVersion, availableAt: e.availableAt })) });
  return rows.length;
}

/** Id event v7 theo thời điểm ghi (giữ như writeOutbox cũ). */
export const newEventId = (now: Date): string => uuidv7(now.getTime());
