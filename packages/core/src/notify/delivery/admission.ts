// Hợp đồng v2 của giao thông báo (TIP-006b §1.5, §3.1, §3.6): `notify` / `realtime` là projection — thông báo + ý định mail + ý định
// realtime (hoặc chỉ ý định realtime) ghi CÙNG transaction biên nhận của dispatcher 003b; publish / đánh thức mail do quét khôi phục
// (ý định bền — không mất khi chưa đẩy). Không gọi provider / Redis trong transaction hiệu ứng. Đăng ký một lần mỗi tiến trình.
import type { TenantTx } from '../../kernel/actions/action-context';
import { frozenEventRegistry, registerEventContract } from '../../kernel/events/protocol/registry';
import type { EventContract, ProjectionContract } from '../../kernel/events/protocol/types';
import { notifyIntents, notifyTopics, realtimeEnvelopes, realtimeTopics } from '../rules';
import { writeIntent, type NotifierDeps } from '../services/notifier';
import { addRealtimeIntent } from './store';

const installed = new Set<string>();

/** Sau commit: đẩy ý định của một event (publish realtime / đánh thức mail) — tối ưu, quét khôi phục là bảo đảm. */
export type Flush = (ws: string, eventId: string) => Promise<void>;

/** Đăng ký hợp đồng v2 một lần (registry chưa đóng băng); nhiều app Nest trong một tiến trình dùng bản đầu. */
export function installContract(c: EventContract): void {
  if (installed.has(c.name) || frozenEventRegistry()) return;
  registerEventContract(c);
  installed.add(c.name);
}

/** `realtime` v2: mỗi gói tin của luật → ý định realtime (làm sạch trường có ràng buộc quyền đã ở realtimeEnvelopes). */
export const realtimeContract = (f?: Flush): ProjectionContract => ({
  name: 'realtime',
  mode: 'projection',
  contractVersion: 1,
  topics: realtimeTopics(),
  async apply(e, tx: TenantTx) {
    const envs = realtimeEnvelopes({ id: e.id, topic: e.topic, workspaceId: e.workspaceId, payload: e.payload, traceId: e.traceId });
    for (const env of envs) await addRealtimeIntent(tx, e.id, env, new Date());
    return envs.length ? { kind: 'applied', effectRef: `realtime:${envs.length}` } : { kind: 'no_effect', reason: 'no_rule' };
  },
  ...(f ? { after: (e) => f(e.workspaceId, e.id) } : {}),
});

/** `notify` v2: mọi ý định của luật → thông báo + ý định giao trong transaction biên nhận (người nhận đọc DB nền tảng — chỉ đọc). */
export const notifyContract = (d: Omit<NotifierDeps, 'emitter'>, f?: Flush): ProjectionContract => ({
  name: 'notify',
  mode: 'projection',
  contractVersion: 1,
  topics: notifyTopics(),
  async apply(e, tx: TenantTx) {
    const ev = { id: e.id, topic: e.topic, workspaceId: e.workspaceId, payload: e.payload, traceId: e.traceId };
    let n = 0;
    for (const [i, intent] of notifyIntents(ev).entries()) n += (await writeIntent(d, tx, ev, intent, i)).saved.length;
    return n ? { kind: 'applied', effectRef: `notification:${n}` } : { kind: 'no_effect', reason: 'no_recipient' };
  },
  ...(f ? { after: (e) => f(e.workspaceId, e.id) } : {}),
});
