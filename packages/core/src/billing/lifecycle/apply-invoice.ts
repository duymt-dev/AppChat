// Ghi nhận hoá đơn gói ĐÃ TRẢ theo ảnh chụp lúc tạo (TIP-039, DC-242) — trong MỘT transaction nền tảng, khoá workspace → subscription → ví.
// Khoá chống ghi đôi = `fulfilled_at` giành có điều kiện TRƯỚC khi sửa subscription (cùng transaction): gọi lại / hai worker / crash giữa
// chừng không dời kỳ, không đổi gói, không cấp lại Credit. Không khớp trạng thái hiện tại (gói / kỳ đã đổi sau khi tạo hoá đơn, addon cũ
// không rõ hạn) → `hold_reason` + phát hiện đối soát, KHÔNG đoán và không cấp sai gói.
import { addMonthsAnchored, anchorOf, monthAt, periodKey } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { grantAddon } from '../services/addons.service';
import { anchorFromSub, paidActive } from '../services/plan-changes.service';
import { lockSub, type LifecycleEvent } from '../services/periods.service';
import type { WalletChange, WalletService } from '../services/wallet.service';
import { snapshotOf, type PlanRow, type PlanSnapshot } from './types';

type Invoice = NonNullable<Awaited<ReturnType<PlatformTx['billingInvoice']['findUnique']>>>;
export interface Applied {
  status: 'applied' | 'replayed' | 'held';
  reason?: string;
  events: LifecycleEvent[];
  changes: WalletChange[];
}

const held = async (t: PlatformTx, inv: Invoice, reason: string, now: Date): Promise<Applied> => {
  await t.billingInvoice.update({ where: { id: inv.id }, data: { holdReason: reason } });
  await t.reconcileFinding.createMany({
    data: [
      {
        id: uuidv7(now.getTime()),
        workspaceId: inv.workspaceId,
        check: 'billing_invoice_hold',
        reference: inv.id,
        cutoff: inv.paidAt ?? now,
        severity: 'pending',
        detail: { reason, kind: inv.kind, code: inv.code },
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });
  return { status: 'held', reason, events: [], changes: [] };
};

export async function applyPaidInvoice(
  t: PlatformTx,
  wallet: WalletService,
  invoiceId: string,
  now: Date,
): Promise<Applied> {
  const pre = await t.billingInvoice.findUnique({ where: { id: invoiceId }, select: { workspaceId: true } });
  if (!pre) return { status: 'replayed', events: [], changes: [] };
  const sub = await lockSub(t, pre.workspaceId);
  const inv = (await t.billingInvoice.findUnique({ where: { id: invoiceId } }))!;
  if (inv.status !== 'paid' || inv.holdReason)
    return { status: inv.holdReason ? 'held' : 'replayed', events: [], changes: [] };
  const claim = await t.billingInvoice.updateMany({
    where: { id: inv.id, fulfilledAt: null },
    data: { fulfilledAt: now },
  });
  if (!claim.count) return { status: 'replayed', events: [], changes: [] };
  const paidEvent: LifecycleEvent = {
    topic: 'billing.invoice_paid',
    payload: { invoice_id: inv.id, code: inv.code, kind: inv.kind, amount: String(inv.amount) },
  };
  const ws = await t.workspace.findUniqueOrThrow({
    where: { id: inv.workspaceId },
    select: { ownerUserId: true, timezone: true },
  });
  const notify: LifecycleEvent = {
    topic: 'notify.requested',
    payload: {
      kind: 'billing_invoice',
      to: { user_ids: [ws.ownerUserId] },
      params: { code: inv.code },
      link: '/settings/billing',
    },
  };
  const done = (events: LifecycleEvent[], changes: WalletChange[] = []): Applied => ({
    status: 'applied',
    events: [...events, paidEvent, notify],
    changes,
  });
  const snap = snapshotOf(inv.snapshot);

  if (inv.kind === 'credits') {
    if (!inv.credits) return held(t, inv, 'no_credits', now);
    const c = await wallet.topup(
      inv.workspaceId,
      Number(inv.credits),
      {
        refType: 'invoice',
        refId: inv.id,
        note: 'topup',
        meta: { credits: Number(inv.credits).toLocaleString('vi-VN') },
        source: inv.method === 'qr' ? 'qr' : 'bank',
      },
      t,
    );
    return done([], [c]);
  }
  if (inv.kind === 'addon') {
    // Addon trước 039 không có ảnh chụp hạn → đối soát (không tự đoán thời hạn / số lượng).
    if (!snap || snap.mode !== 'addon') return held(t, inv, 'legacy_addon', now);
    let ends: Date;
    if (snap.ends_at === null) ends = addMonthsAnchored(now, 1, anchorOf(now, ws.timezone));
    else if (paidActive(sub, now) && sub.currentPeriodEnd!.toISOString() === snap.ends_at)
      ends = sub.currentPeriodEnd!;
    else return held(t, inv, 'period_changed', now);
    await grantAddon(t, {
      workspaceId: inv.workspaceId,
      invoiceId: inv.id,
      resource: snap.resource,
      quantity: snap.quantity,
      startsAt: now,
      endsAt: ends,
    });
    return done([]);
  }
  const target = inv.planId
    ? ((await t.plan.findUnique({ where: { id: inv.planId } })) as (PlanRow & { name: string }) | null)
    : null;
  if (!target) return held(t, inv, 'no_plan', now);
  const from = sub ? ((await t.plan.findUnique({ where: { id: sub.planId } })) as PlanRow | null) : null;
  const changed = (status: string): LifecycleEvent => ({
    topic: 'subscription.changed',
    payload: { plan_key: target.key, status, from_plan_key: from?.key ?? null },
  });

  if (snap?.mode === 'upgrade') {
    const same =
      paidActive(sub, now) &&
      sub.version === snap.sub_version &&
      from?.key === snap.from_plan_key &&
      sub.currentPeriodEnd!.toISOString() === snap.term_end &&
      !sub.pendingPlanId;
    if (!same) return held(t, inv, 'stale_version', now);
    await t.subscription.update({
      where: { workspaceId: inv.workspaceId },
      data: { planId: target.id, termPrice: BigInt(snap.target_term_price), version: { increment: 1 } },
    });
    const credits = Number(snap.credits);
    const c =
      credits > 0
        ? [
            await wallet.addPlan(t, inv.workspaceId, credits, {
              refType: 'plan_upgrade',
              refId: `invoice:${inv.id}`,
              note: 'plan_upgrade',
              meta: { plan: target.name },
              source: 'plan',
            }),
          ]
        : [];
    return done([changed('active')], c);
  }

  // Gói trả phí: new / renew / switch (hoá đơn trước 039 không có ảnh chụp → như `new` với số tháng + số tiền đã trả).
  const s: Pick<PlanSnapshot, 'mode' | 'months' | 'price' | 'starts_at'> =
    snap && snap.mode !== 'addon'
      ? (snap as PlanSnapshot)
      : { mode: 'new', months: inv.months ?? 1, price: String(inv.amount) };
  if (s.mode !== 'new' && paidActive(sub, now)) {
    // Gia hạn / đổi gói kỳ sau: chỉ khi kỳ hiện tại vẫn là kỳ lúc tạo hoá đơn và chưa có thay đổi kỳ sau.
    if (sub.currentPeriodEnd!.toISOString() !== s.starts_at || sub.pendingPlanId)
      return held(t, inv, 'period_changed', now);
    await t.subscription.update({
      where: { workspaceId: inv.workspaceId },
      data: {
        pendingPlanId: target.id,
        pendingEffectiveAt: sub.currentPeriodEnd,
        pendingMonths: s.months,
        pendingPrice: BigInt(s.price),
        version: { increment: 1 },
      },
    });
    return done([]);
  }
  // Kỳ mới từ lúc trả (chưa có gói trả phí còn hạn, hoặc gia hạn trả muộn sau khi đã hết hạn).
  const anchor = anchorOf(now, ws.timezone);
  const end = addMonthsAnchored(now, s.months, anchor);
  const month = monthAt(now, anchor);
  const data = {
    planId: target.id,
    status: 'active' as const,
    currentPeriodStart: now,
    currentPeriodEnd: end,
    anchorDay: anchor.day,
    anchorHm: anchor.hm,
    anchorTz: anchor.timeZone,
    termMonths: s.months,
    termPrice: BigInt(s.price),
    nextGrantAt: month.end < end ? month.end : null,
    pendingPlanId: null,
    pendingEffectiveAt: null,
    pendingMonths: null,
    pendingPrice: null,
    expiredAt: null,
    retainUntil: null,
  };
  if (sub)
    await t.subscription.update({
      where: { workspaceId: inv.workspaceId },
      data: { ...data, version: { increment: 1 } },
    });
  else
    await t.subscription.create({
      data: { id: uuidv7(now.getTime()), workspaceId: inv.workspaceId, ...data },
    });
  // Kỳ tháng đầu cấp ngay (biên nhận kỳ + sổ ví cùng transaction) — job kỳ không cấp lại tháng này.
  const ref = `invoice:${inv.id}`;
  await t.billingPeriodGrant.createMany({
    data: [
      {
        id: uuidv7(now.getTime()),
        workspaceId: inv.workspaceId,
        periodKey: periodKey(month.start, anchor.timeZone),
        periodStart: month.start,
        periodEnd: month.end,
        planKey: target.key,
        credits: target.creditsMonth ?? 0n,
        status: 'granted',
        ledgerRef: ref,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });
  const c = await wallet.resetPlan(
    inv.workspaceId,
    Number(target.creditsMonth ?? 0n),
    { refType: 'plan_grant', refId: ref, note: 'plan_grant', meta: { plan: target.name }, source: 'plan' },
    t,
  );
  return done([changed('active')], [c]);
}

export { anchorFromSub };
