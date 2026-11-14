// Cấp Credit gói theo kỳ tháng (TIP-039, DC-242) + chuyển trạng thái tới hạn — một transaction nền tảng mỗi workspace, khoá theo thứ tự
// workspace → subscription → ví. Mỗi kỳ đúng một biên nhận `billing_period_grant` (unique workspace + period_key) cùng dòng sổ ví + đẩy mốc
// `next_grant_at`; hai worker / chạy lại chỉ một bên ghi. Chạy bù sau downtime: chỉ cấp kỳ HIỆN TẠI, các kỳ lỡ ghi `skipped` (không cấp dồn).
// Gói năm cấp từng tháng (không cấp trước 12 tháng). Event sang tenant: ghi `platform_effect` cùng commit (cầu nối bền 045b) — mất tiến trình
// sau commit thì scheduler hiệu ứng gửi lại.
import { addMonthsAnchored, monthAt, periodKey } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { PlanRow } from '../lifecycle/types';
import { anchorFromSub } from './plan-changes.service';
import type { WalletChange, WalletService } from './wallet.service';

const DAY = 86_400_000;
export const RETAIN_DAYS = 30;

type Sub = NonNullable<Awaited<ReturnType<PlatformTx['subscription']['findUnique']>>>;
export type LifecycleEvent = { topic: string; payload: Record<string, unknown> };
export interface StepResult {
  changes: WalletChange[];
  events: LifecycleEvent[];
  granted: number;
  skipped: number;
  expired: boolean;
  switched: boolean;
}

export async function lockSub(t: PlatformTx, workspaceId: string): Promise<Sub | null> {
  await t.$queryRaw`SELECT id FROM workspace WHERE id = ${workspaceId}::uuid FOR UPDATE`;
  await t.$queryRaw`SELECT id FROM subscription WHERE workspace_id = ${workspaceId}::uuid FOR UPDATE`;
  return t.subscription.findUnique({ where: { workspaceId } });
}

const planOf = async (t: PlatformTx, id: string) =>
  (await t.plan.findUnique({ where: { id } })) as PlanRow | null;

/** Một bước tới hạn cho workspace (trong tx người gọi): hạ gói kỳ sau / hết hạn / cấp kỳ hiện tại. Idempotent. */
export async function stepWorkspace(
  t: PlatformTx,
  wallet: WalletService,
  workspaceId: string,
  now: Date,
): Promise<StepResult> {
  const r: StepResult = { changes: [], events: [], granted: 0, skipped: 0, expired: false, switched: false };
  let sub = await lockSub(t, workspaceId);
  if (!sub || sub.status !== 'active') return r;
  const anchor = anchorFromSub(sub);
  // Tới ngày hết kỳ đã trả: có gói kỳ sau (hạ gói / đổi gói đã trả) → áp một lần; không → hết hạn.
  if (sub.currentPeriodEnd && sub.termPrice !== null && sub.currentPeriodEnd <= now) {
    if (sub.pendingPlanId && sub.pendingEffectiveAt && sub.pendingEffectiveAt <= now && anchor) {
      const from = await planOf(t, sub.planId);
      const to = await planOf(t, sub.pendingPlanId);
      const end = addMonthsAnchored(sub.currentPeriodEnd, sub.pendingMonths!, anchor);
      sub = await t.subscription.update({
        where: { workspaceId },
        data: {
          planId: sub.pendingPlanId,
          currentPeriodStart: sub.currentPeriodEnd,
          currentPeriodEnd: end,
          nextGrantAt: sub.currentPeriodEnd,
          termMonths: sub.pendingMonths,
          termPrice: sub.pendingPrice,
          pendingPlanId: null,
          pendingEffectiveAt: null,
          pendingMonths: null,
          pendingPrice: null,
          version: { increment: 1 },
        },
      });
      r.switched = true;
      r.events.push({
        topic: 'subscription.changed',
        payload: { plan_key: to?.key ?? '', status: 'active', from_plan_key: from?.key ?? null },
      });
    } else {
      const plan = await planOf(t, sub.planId);
      await t.subscription.update({
        where: { workspaceId },
        data: {
          status: 'expired',
          expiredAt: now,
          retainUntil: new Date(now.getTime() + RETAIN_DAYS * DAY),
          nextGrantAt: null,
          version: { increment: 1 },
        },
      });
      r.changes.push(
        await wallet.expirePlan(t, workspaceId, {
          refType: 'plan_expire',
          refId: `expired:${workspaceId}:${sub.currentPeriodEnd.toISOString()}`,
          note: 'plan_expire',
          source: 'plan',
        }),
      );
      r.expired = true;
      r.events.push({
        topic: 'subscription.changed',
        payload: { plan_key: plan?.key ?? '', status: 'expired', from_plan_key: plan?.key ?? null },
      });
      return r;
    }
  }
  if (!anchor || !sub.nextGrantAt || sub.nextGrantAt > now) return r;
  const plan = await planOf(t, sub.planId);
  if (!plan) return r;
  const cur = monthAt(now, anchor);
  // Kỳ lỡ (downtime) trước kỳ hiện tại: biên nhận `skipped`, không cấp.
  for (let s = sub.nextGrantAt; s < cur.start; s = addMonthsAnchored(s, 1, anchor)) {
    const k = await t.billingPeriodGrant.createMany({
      data: [
        {
          id: uuidv7(now.getTime()),
          workspaceId,
          periodKey: periodKey(s, anchor.timeZone),
          periodStart: s,
          periodEnd: addMonthsAnchored(s, 1, anchor),
          planKey: plan.key,
          credits: 0n,
          status: 'skipped',
          createdAt: now,
        },
      ],
      skipDuplicates: true,
    });
    r.skipped += k.count;
  }
  const key = periodKey(cur.start, anchor.timeZone);
  const credits = Number(plan.creditsMonth ?? 0n);
  const ref = `period:${workspaceId}:${key}`;
  const got = await t.billingPeriodGrant.createMany({
    data: [
      {
        id: uuidv7(now.getTime()),
        workspaceId,
        periodKey: key,
        periodStart: cur.start,
        periodEnd: cur.end,
        planKey: plan.key,
        credits: BigInt(credits),
        status: 'granted',
        ledgerRef: ref,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });
  if (got.count) {
    r.changes.push(
      await wallet.resetPlan(
        workspaceId,
        credits,
        {
          refType: 'plan_grant',
          refId: ref,
          note: 'plan_grant',
          meta: { plan: (plan as { name?: string }).name ?? plan.key },
          source: 'plan',
        },
        t,
      ),
    );
    r.granted = 1;
  }
  // Mốc kế: đầu kỳ tháng sau, nhưng không vượt hết kỳ đã trả (kỳ sau hết hạn thì không cấp nữa).
  const next = cur.end;
  await t.subscription.update({
    where: { workspaceId },
    data: { nextGrantAt: sub.currentPeriodEnd && next >= sub.currentPeriodEnd ? null : next },
  });
  return r;
}
