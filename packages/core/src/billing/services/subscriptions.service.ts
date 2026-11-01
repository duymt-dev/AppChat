// Subscription (REQ-A06, Blueprint §2.2): trial 15 ngày gói Cá nhân Pro + 10.000 credit khi khai báo DN lần đầu; hết trial
// → hạ về gói Miễn phí (dữ liệu giữ nguyên); `activate` cho TIP-010 khi hoá đơn gói được trả. Ghi ở DB nền tảng; event
// (`subscription.changed`, `trial.expired`, `notify.requested`) đi qua outbox của DB tenant workspace (BillingEvents).
import { AppError, FREE_PLAN_KEY, TRIAL_CREDITS, TRIAL_DAYS, TRIAL_PLAN_KEY } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import type { WalletService } from './wallet.service';

const DAY = 86_400_000;

export interface BillingEventSink {
  /** Ghi event vào outbox DB tenant của workspace (sau commit nền tảng). */
  emit(workspaceId: string, events: { topic: string; payload: Record<string, unknown> }[]): Promise<void>;
}

export class SubscriptionsService {
  constructor(
    private readonly db: PlatformDb,
    private readonly wallet: WalletService,
    private readonly events: BillingEventSink,
    private readonly now: () => Date,
  ) {}

  private async plan(key: string) {
    const p = await this.db.plan.findUnique({ where: { key } });
    if (!p) throw new AppError('INTERNAL', 500, undefined, `Thiếu gói ${key}`);
    return p;
  }

  /** Bắt đầu trial (một lần mỗi workspace). Đã có subscription → bỏ qua, trả false. */
  async startTrial(workspaceId: string): Promise<boolean> {
    const p = await this.plan(TRIAL_PLAN_KEY);
    const now = this.now();
    const ends = new Date(now.getTime() + TRIAL_DAYS * DAY);
    const created = await this.db.$transaction(async (t) => {
      const r = await t.subscription.createMany({
        data: [{ id: uuidv7(now.getTime()), workspaceId, planId: p.id, status: 'trialing', trialStartedAt: now, trialEndsAt: ends, currentPeriodStart: now, currentPeriodEnd: ends }],
        skipDuplicates: true,
      });
      if (!r.count) return null;
      return this.wallet.resetPlan(workspaceId, TRIAL_CREDITS, { refType: 'plan_grant', refId: `trial:${workspaceId}`, note: 'trial_grant', meta: { plan: p.name }, source: 'plan' }, t);
    });
    if (!created) return false;
    await this.wallet.emit(created);
    await this.events.emit(workspaceId, [{ topic: 'subscription.changed', payload: { plan_key: p.key, status: 'trialing', from_plan_key: null } }]);
    return true;
  }

  /** Scheduler: mọi trial quá hạn → gói Miễn phí `active`, credit gói Miễn phí, event + thông báo Owner. */
  async expireTrials(limit = 100): Promise<string[]> {
    const now = this.now();
    const due = await this.db.subscription.findMany({ where: { status: 'trialing', trialEndsAt: { lte: now } }, select: { workspaceId: true }, take: limit });
    const done: string[] = [];
    for (const { workspaceId } of due) if (await this.expireTrial(workspaceId)) done.push(workspaceId);
    return done;
  }

  private async expireTrial(workspaceId: string): Promise<boolean> {
    const free = await this.plan(FREE_PLAN_KEY);
    const trial = await this.plan(TRIAL_PLAN_KEY);
    const now = this.now();
    const change = await this.db.$transaction(async (t) => {
      // Điều kiện status trong WHERE → hai worker cùng quét không hạ hai lần.
      const r = await t.subscription.updateMany({
        where: { workspaceId, status: 'trialing', trialEndsAt: { lte: now } },
        data: { planId: free.id, status: 'active', currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 30 * DAY) },
      });
      if (!r.count) return null;
      return this.wallet.resetPlan(workspaceId, Number(free.creditsMonth ?? 0n), { refType: 'plan_grant', refId: `trial_end:${workspaceId}`, note: 'plan_grant', meta: { plan: free.name }, source: 'plan' }, t);
    });
    if (!change) return false;
    await this.wallet.emit(change);
    const ws = await this.db.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } });
    await this.events.emit(workspaceId, [
      { topic: 'trial.expired', payload: { plan_key: trial.key } },
      { topic: 'subscription.changed', payload: { plan_key: free.key, status: 'active', from_plan_key: trial.key } },
      ...(ws ? [{ topic: 'notify.requested', payload: { kind: 'billing_invoice', to: { user_ids: [ws.ownerUserId] }, params: { code: free.name }, link: '/settings/billing' } }] : []),
    ]);
    return true;
  }

  /**
   * Kích hoạt gói trả phí cho một kỳ (TIP-010 gọi khi hoá đơn gói `paid`): đổi gói, kỳ mới, credit gói của kỳ.
   * Idempotent theo `refId` (id hoá đơn).
   */
  async activate(workspaceId: string, planKey: string, months: number, refId: string): Promise<void> {
    const p = await this.plan(planKey);
    const now = this.now();
    const prev = await this.db.subscription.findUnique({ where: { workspaceId }, select: { planId: true } });
    const from = prev ? (await this.db.plan.findUnique({ where: { id: prev.planId }, select: { key: true } }))?.key ?? null : null;
    const change = await this.db.$transaction(async (t) => {
      const data = { planId: p.id, status: 'active' as const, currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + months * 30 * DAY) };
      await t.subscription.upsert({ where: { workspaceId }, create: { id: uuidv7(now.getTime()), workspaceId, ...data }, update: data });
      return this.wallet.resetPlan(workspaceId, Number(p.creditsMonth ?? 0n), { refType: 'plan_grant', refId: `invoice:${refId}`, note: 'plan_grant', meta: { plan: p.name }, source: 'plan' }, t);
    });
    if (!change.applied) return;
    await this.wallet.emit(change);
    await this.events.emit(workspaceId, [{ topic: 'subscription.changed', payload: { plan_key: p.key, status: 'active', from_plan_key: from } }]);
  }
}
