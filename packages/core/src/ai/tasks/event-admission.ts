// Nhận một mục fanout sự kiện → tác vụ (TIP-006b §5.1, §2.2): khoá mục (đại diện lần xảy ra) RỒI dòng tác vụ; đọc lại điều kiện hiện hành
// — tác vụ đã xoá / tắt / đổi sự kiện → no_effect `disabled`; thế hệ trigger khác thế hệ đã chụp lúc chọn → `superseded`; đang có lượt
// sống → `busy`. Còn lại: run gốc + ý định đẩy; occurrence + kết cục mục ghi CÙNG transaction. Mục đã có kết cục → duplicate.
import type { TenantDb } from '@appchat/db';
import { lockItem, settleItem, type FanoutItem } from '../../kernel/events/fanout';
import { admitRun, lockTask, recordOccurrence, taskBusy, type Admission } from './occurrence';

export type ItemResult = { outcome: 'queued' | 'skipped_busy' | 'skipped_disabled' | 'duplicate'; runId: string | null };

const outcomeOf = (a: Admission): ItemResult['outcome'] => (a.phase === 'handed_off' ? 'queued' : a.reason === 'busy' ? 'skipped_busy' : 'skipped_disabled');

export async function admitEventItem(db: TenantDb, fanoutId: string, item: FanoutItem, e: { id: string; topic: string }, now: () => Date): Promise<ItemResult> {
  return db.$transaction(async (tx) => {
    if (!(await lockItem(tx, fanoutId, item.kind, item.id))) return { outcome: 'duplicate' as const, runId: null };
    const gen = Number(item.version);
    const t = await lockTask(tx, item.id);
    let a: Admission;
    if (!t || t.deletedAt || t.status !== 'active' || t.trigger !== 'event' || t.eventType !== e.topic) a = { phase: 'no_effect', reason: 'disabled' };
    else if (t.triggerGeneration !== gen) a = { phase: 'no_effect', reason: 'superseded' };
    else if (await taskBusy(tx, t.id)) a = { phase: 'no_effect', reason: 'busy' };
    else a = { phase: 'handed_off', runId: await admitRun(tx, now, t, { source: 'event', event: e.topic, source_event_id: e.id }, e) };
    await recordOccurrence(tx, { taskId: item.id, generation: gen, kind: 'event', eventId: e.id }, a, now());
    await settleItem(tx, fanoutId, item.kind, item.id, a.phase === 'handed_off' ? { phase: 'handed_off', operationRef: a.runId } : { phase: 'no_effect', reason: a.reason });
    return { outcome: outcomeOf(a), runId: a.phase === 'handed_off' ? a.runId : null };
  });
}
