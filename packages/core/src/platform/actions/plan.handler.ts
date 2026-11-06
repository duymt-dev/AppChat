// admin.plan.upsert (TIP-040 pha 2, DC-370): gói ở DB nền tảng. Tạo theo `key` (đã có → 409), sửa bằng CAS `if_version`. Đổi giá /
// hạn mức chỉ áp cho mua MỚI: hoá đơn đã tạo giữ ảnh chụp (`billing_invoice.snapshot`), subscription đang chạy giữ `term_price` — không
// sửa ví, không xoá tài nguyên vượt hạn mức mới. Tắt gói (active=false) = ẩn khỏi bảng giá + chặn mua mới (plan-changes kiểm `active`).
// Gói Miễn phí / gói dùng thử không tắt được (luồng trial / hết hạn dựa vào chúng).
import { Injectable } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError, FREE_PLAN_KEY, TRIAL_PLAN_KEY } from '@appchat/shared';
import type { ActionInput, adminPlanUpsert } from '@appchat/actions';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { casConflict, requireVersion } from '../services/config-validation';

type Input = ActionInput<typeof adminPlanUpsert>;
type Output = { key: string; version: number; created: boolean };
type PlanRow = NonNullable<Awaited<ReturnType<PlatformDb['plan']['findUnique']>>>;

const big = (v: string | null) => (v === null ? null : BigInt(v));
const credits = (v: number | null) => (v === null ? null : BigInt(v));

/** Dạng so sánh / audit (tiền là string). */
function view(p: Pick<PlanRow, 'name' | 'segment' | 'priceMonth' | 'priceYear' | 'creditsMonth' | 'maxUsers' | 'maxChannels' | 'maxAgents' | 'active' | 'sort'>) {
  return {
    name: p.name,
    segment: p.segment,
    price_month: p.priceMonth === null ? null : String(p.priceMonth),
    price_year: p.priceYear === null ? null : String(p.priceYear),
    credits_month: p.creditsMonth === null ? null : Number(p.creditsMonth),
    max_users: p.maxUsers,
    max_channels: p.maxChannels,
    max_agents: p.maxAgents,
    active: p.active,
    sort: p.sort,
  };
}

function data(i: Input) {
  return {
    segment: i.segment,
    name: i.name,
    priceMonth: big(i.price_month),
    priceYear: big(i.price_year),
    creditsMonth: credits(i.credits_month),
    maxUsers: i.max_users,
    maxChannels: i.max_channels,
    maxAgents: i.max_agents,
    features: { desc: i.desc, popular: i.popular, features: i.features },
    active: i.active,
    sort: i.sort,
  };
}

function guard(i: Input) {
  if (!i.active && (i.key === FREE_PLAN_KEY || i.key === TRIAL_PLAN_KEY)) throw new AppError('VALIDATION_FAILED', 422, { active: 'required_plan' });
  if (i.price_year !== null && i.price_month === null) throw new AppError('VALIDATION_FAILED', 422, { price_year: 'needs_price_month' });
}

@Injectable()
@ActionHandler('admin.plan.upsert')
export class AdminPlanUpsertHandler extends PlatformActionHandler<Input, Output> {
  async executePlatform(_ctx: PlatformContext, input: Input, ptx: PlatformTx): Promise<AdminOutcome<Output>> {
    guard(input);
    const cur = await ptx.plan.findUnique({ where: { key: input.key } });
    if (!cur) {
      if (input.if_version !== undefined) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
      const row = await ptx.plan.create({ data: { id: uuidv7(), key: input.key, ...data(input) } });
      return { result: { key: row.key, version: row.version, created: true }, after: view(row) };
    }
    requireVersion(input.if_version, cur.version);
    const n = await ptx.plan.updateMany({ where: { id: cur.id, version: cur.version }, data: { ...data(input), version: { increment: 1 } } });
    if (!n.count) throw casConflict(cur.version);
    const row = await ptx.plan.findUniqueOrThrow({ where: { id: cur.id } });
    return { result: { key: row.key, version: row.version, created: false }, before: view(cur), after: view(row) };
  }

  async previewPlatform(_ctx: PlatformContext, input: Input, db: PlatformDb) {
    guard(input);
    const cur = await db.plan.findUnique({ where: { key: input.key } });
    const after = view(data(input));
    const active = cur ? await db.subscription.count({ where: { planId: cur.id, status: { in: ['active', 'trialing'] } } }) : 0;
    return {
      summary: `${input.key} · ${input.name}`,
      risk: 'config' as const,
      changes: [{ entity: 'plan', id: input.key, ...(cur ? { before: view(cur) } : {}), after }],
      // Gói đang có người dùng: đổi giá / hạn mức chỉ áp cho lần mua / gia hạn sau, không đổi kỳ đang chạy.
      warnings: active ? [`active_subscriptions:${active}`] : [],
    };
  }
}
