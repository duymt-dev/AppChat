// Nối billing (DB nền tảng) với event của workspace (outbox DB tenant — standards/events/outbox.md §1): ghi outbox SAU khi
// transaction nền tảng commit ("nền tảng trước" — Blueprint §2.0); relay đẩy sang queue `events`. Ngưỡng ví → event
// `credits.*` + thông báo Owner (`ai_budget`); mọi thay đổi số dư → `credits.changed` (TIP-006c — realtime làm mới số dư).
// Consumer `billing.trial`: `workspace.declared` → bắt đầu trial.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { workspaceDeclaredEvent } from '@appchat/shared';
import type { EventConsumer } from '../../kernel/events/consumer';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import type { BillingEventSink, SubscriptionsService } from '../services/subscriptions.service';
import type { WalletListener } from '../services/wallet.service';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export class OutboxBillingSink implements BillingEventSink {
  constructor(
    private readonly resolver: TenantDbResolver,
    private readonly kv: KeyValueStore,
    private readonly now: () => Date,
  ) {}

  async emit(workspaceId: string, events: { topic: string; payload: Record<string, unknown> }[]): Promise<void> {
    if (!events.length) return;
    const db = await this.resolver.get(TenantContexts.system(workspaceId, 'billing'));
    await inEventTransaction(db, workspaceId, (tx) => writeOutbox(tx, workspaceId, events, this.now()));
    await markDirty(this.kv, workspaceId);
  }
}

/** Ngưỡng ví → event + thông báo Owner (chỉ khi bật cảnh báo — `credit_wallet.low_alert`); số dư đổi → `credits.changed`. */
export function walletThresholdListener(platform: Pick<PlatformDb, 'workspace'>, sink: BillingEventSink): WalletListener {
  return async (c, f) => {
    const events: { topic: string; payload: Record<string, unknown> }[] = [];
    if (f.changed) events.push({ topic: 'credits.changed', payload: { balance_plan: c.after.plan, balance_topup: c.after.topup, ledger_id: c.ledgerId } });
    if (f.warned) events.push({ topic: 'credits.low', payload: { level: f.warned, balance: c.after.total } });
    if (f.exhausted) events.push({ topic: 'credits.exhausted', payload: { balance: c.after.total } });
    if (f.restored) events.push({ topic: 'credits.restored', payload: { balance: c.after.total } });
    if (!events.length) return;
    const notifyOwner = f.exhausted || (f.warned !== null && f.lowAlert);
    if (notifyOwner) {
      const ws = await platform.workspace.findUnique({ where: { id: c.workspaceId }, select: { ownerUserId: true } });
      const percent = f.exhausted ? 100 : f.warned!;
      if (ws) events.push({ topic: 'notify.requested', payload: { kind: 'ai_budget', to: { user_ids: [ws.ownerUserId] }, params: { percent }, link: '/settings/wallet' } });
    }
    await sink.emit(c.workspaceId, events);
  };
}

export function trialConsumer(subs: Pick<SubscriptionsService, 'startTrial'>): EventConsumer {
  return {
    name: 'billing.trial',
    topics: ['workspace.declared'],
    async handle(e) {
      const p = workspaceDeclaredEvent.parse({ ...e.payload, ws: e.workspaceId, occurred_at: e.payload.occurred_at ?? '' });
      await subs.startTrial(p.workspace_id);
    },
  };
}
