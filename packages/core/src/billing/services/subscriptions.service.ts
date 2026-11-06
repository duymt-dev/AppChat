// Subscription (REQ-A06, Blueprint §2.2): trial 15 ngày gói Cá nhân Pro + 10.000 credit khi khai báo DN lần đầu; hết trial
// → hạ về gói Miễn phí (dữ liệu giữ nguyên); `activate` cho TIP-010 khi hoá đơn gói được trả. Ghi ở DB nền tảng; event
// (`subscription.changed`, `trial.expired`, `notify.requested`) đi qua outbox của DB tenant workspace (BillingEvents).
import { AppError, FREE_PLAN_KEY, TRIAL_CREDITS, TRIAL_DAYS, TRIAL_PLAN_KEY, addMonthsAnchored, anchorOf, monthAt } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { lockSub } from './periods.service';
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
   * Kích hoạt gói trả phí một kỳ mới từ bây giờ (test / quản trị — hoá đơn thật đi qua `billing.apply_invoice` theo ảnh chụp giá, TIP-039).
   * Idempotent theo `refId`: biên nhận (dòng sổ `plan_grant`) kiểm DƯỚI khoá workspace → subscription TRƯỚC khi sửa subscription — gọi lại
   * không dời kỳ, không đổi gói, không cấp lại Credit. Kỳ theo ngày đăng ký (DC-242), không cộng 30 ngày.
   */
  async activate(workspaceId: string, planKey: string, months: number, refId: string): Promise<void> {
    const p = await this.plan(planKey);
    const now = this.now();
    const ref = `invoice:${refId}`;
    const r = await this.db.$transaction(async (t) => {
      const prev = await lockSub(t, workspaceId);
      if (await t.creditLedger.findUnique({ where: { workspaceId_refType_refId: { workspaceId, refType: 'plan_grant', refId: ref } }, select: { id: true } })) return null;
      const from = prev ? ((await t.plan.findUnique({ where: { id: prev.planId }, select: { key: true } }))?.key ?? null) : null;
      const ws = await t.workspace.findUnique({ where: { id: workspaceId }, select: { timezone: true } });
      const a = anchorOf(now, ws?.timezone ?? 'Asia/Ho_Chi_Minh');
      const end = addMonthsAnchored(now, months, a);
      const next = monthAt(now, a).end;
      const price = months === 12 ? p.priceYear : p.priceMonth;
      const data = {
        planId: p.id,
        status: 'active' as const,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        anchorDay: a.day,
        anchorHm: a.hm,
        anchorTz: a.timeZone,
        termMonths: months,
        termPrice: price ?? 0n,
        nextGrantAt: next < end ? next : null,
        pendingPlanId: null,
        pendingEffectiveAt: null,
        pendingMonths: null,
        pendingPrice: null,
        expiredAt: null,
        retainUntil: null,
      };
      if (prev) await t.subscription.update({ where: { workspaceId }, data: { ...data, version: { increment: 1 } } });
      else await t.subscription.create({ data: { id: uuidv7(now.getTime()), workspaceId, ...data } });
      const change = await this.wallet.resetPlan(workspaceId, Number(p.creditsMonth ?? 0n), { refType: 'plan_grant', refId: ref, note: 'plan_grant', meta: { plan: p.name }, source: 'plan' }, t);
      return { change, from };
    });
    if (!r) return;
    const { change, from } = r;
    await this.wallet.emit(change);
    await this.events.emit(workspaceId, [{ topic: 'subscription.changed', payload: { plan_key: p.key, status: 'active', from_plan_key: from } }]);
  }
}
