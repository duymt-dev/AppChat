// Chạy một event qua mọi consumer khớp topic (idempotent theo `event_consumption`). Lỗi một consumer → ném lại sau khi chạy
// hết các consumer còn lại, để job BullMQ retry (consumer đã xong không chạy lại nhờ khoá).
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../logger/logger';
import { consumersFor, type DomainEvent } from './consumer';

export interface DispatchResult {
  ran: string[];
  skipped: string[];
  failed: string[];
}

export class EventDispatchError extends Error {
  constructor(readonly failed: string[], readonly causes: unknown[]) {
    super(`event consumer lỗi: ${failed.join(', ')}`);
    this.name = 'EventDispatchError';
  }
}

export async function dispatchEvent(resolver: TenantDbResolver, e: DomainEvent, log?: AppLogger): Promise<DispatchResult> {
  const list = consumersFor(e.topic);
  const res: DispatchResult = { ran: [], skipped: [], failed: [] };
  if (!list.length) return res;
  const db = await resolver.get(TenantContexts.system(e.workspaceId, 'events'));
  const done = new Set(
    (await db.eventConsumption.findMany({ where: { eventId: e.id, consumer: { in: list.map((c) => c.name) } }, select: { consumer: true } })).map((r) => r.consumer),
  );
  const causes: unknown[] = [];
  for (const c of list) {
    if (done.has(c.name)) {
      res.skipped.push(c.name);
      continue;
    }
    try {
      await c.handle(e, db);
      await db.eventConsumption.createMany({ data: [{ eventId: e.id, consumer: c.name }], skipDuplicates: true });
      res.ran.push(c.name);
    } catch (err) {
      res.failed.push(c.name);
      causes.push(err);
      log?.warn({ err, consumer: c.name, topic: e.topic, event_id: e.id, ws: e.workspaceId }, 'event consumer lỗi — job sẽ thử lại');
    }
  }
  if (res.failed.length) throw new EventDispatchError(res.failed, causes);
  return res;
}
