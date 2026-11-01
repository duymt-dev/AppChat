// AI Governance của workspace (Blueprint §2.2 `ai_governance`, Cài đặt › AI Governance — prototype; FE `Governance`): phạm vi dữ
// liệu AI được đọc, ranh giới hành vi, từ cấm, bộ lọc đầu ra, lưu trữ, PII, vùng dữ liệu. Một dòng (id = 1, seed lúc provision).
// "Đang áp dụng n/m chính sách khuyến nghị": khuyến nghị = giá trị mặc định của mỗi phạm vi / ranh giới + ẩn danh PII + không cho
// bên ngoài huấn luyện.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, governanceUpdate } from '@appchat/actions';
import type { GovernanceDto } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { registerTenantSeed } from '../../kernel/tenant-seeds';

/** Danh mục (khoá + nhạy cảm / rủi ro + mặc định) — prototype Cài đặt › AI Governance. */
const SCOPES = [
  ['messages', false, true],
  ['catalog', false, true],
  ['faq', false, true],
  ['pii', true, false],
  ['finance', true, false],
  ['partner', false, false],
] as const;
const BOUNDS = [
  ['auto_close', true, false],
  ['send_bank', true, false],
  ['discount', true, false],
  ['promise_delivery', false, false],
  ['escalate', false, true],
  ['disclosure', false, true],
  ['log_all', false, true],
] as const;
export const DEFAULT_BANNED = ['chính trị', 'tôn giáo', 'cạnh tranh tiêu cực', 'đầu tư tài chính', 'y tế cá nhân', 'pháp lý cá nhân'];
/** Luật luôn ép duyệt (COMMERCE / D05): báo giá > 20M, giảm giá > 5%, hoàn tiền, gửi hàng loạt, hợp đồng. */
export const FORCE_APPROVAL = { quote_total_over: '20000000', discount_over_pct: 5, refund: true, bulk_send: true, contract: true };

type Row = NonNullable<Awaited<ReturnType<TenantDb['aiGovernance']['findUnique']>>>;
const flags = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, boolean>) : {});

export const defaultGovernance = () => ({
  id: 1,
  scopes: Object.fromEntries(SCOPES.map(([k, , on]) => [k, on])),
  bounds: Object.fromEntries(BOUNDS.map(([k, , on]) => [k, on])),
  bannedWords: DEFAULT_BANNED,
  forceApproval: FORCE_APPROVAL,
});

export function governanceDto(r: Row): GovernanceDto {
  const sc = flags(r.scopes);
  const bo = flags(r.bounds);
  const scopes = SCOPES.map(([key, sensitive, def]) => ({ key, on: sc[key] ?? def, sensitive }));
  const bounds = BOUNDS.map(([key, risky, def]) => ({ key, on: bo[key] ?? def, risky }));
  const checks = [...SCOPES.map(([, , def], i) => scopes[i]!.on === def), ...BOUNDS.map(([, , def], i) => bounds[i]!.on === def), r.piiFilter, r.noExternalTrain];
  return {
    scopes,
    bounds,
    keywords: r.bannedWords,
    filter: r.filter as GovernanceDto['filter'],
    long_review: r.longReview,
    retention: String(r.retentionDays) as GovernanceDto['retention'],
    no_external_train: r.noExternalTrain,
    anonymize_pii: r.piiFilter,
    residency: r.residency as GovernanceDto['residency'],
    applied: checks.filter(Boolean).length,
    total: checks.length,
  };
}

/** Dòng governance (thiếu — workspace cũ trước TIP-021 — thì tạo mặc định). */
export async function readGovernance(db: Pick<TenantDb, 'aiGovernance'>): Promise<Row> {
  return (await db.aiGovernance.findUnique({ where: { id: 1 } })) ?? db.aiGovernance.upsert({ where: { id: 1 }, create: defaultGovernance(), update: {} });
}

const pick = (keys: readonly (readonly [string, boolean, boolean])[], patch: Record<string, boolean> | undefined) =>
  Object.fromEntries(Object.entries(patch ?? {}).filter(([k]) => keys.some(([x]) => x === k)));

@Injectable()
@ActionHandler('governance.update')
export class GovernanceUpdateHandler implements Handler<ActionInput<typeof governanceUpdate>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof governanceUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const g = await readGovernance(tx);
    const data = {
      ...(input.scopes ? { scopes: { ...flags(g.scopes), ...pick(SCOPES, input.scopes) } } : {}),
      ...(input.bounds ? { bounds: { ...flags(g.bounds), ...pick(BOUNDS, input.bounds) } } : {}),
      ...(input.keywords ? { bannedWords: [...new Set(input.keywords.map((k) => k.trim()).filter(Boolean))] } : {}),
      ...(input.filter ? { filter: input.filter } : {}),
      ...(input.retention ? { retentionDays: Number(input.retention) } : {}),
      ...(input.long_review !== undefined ? { longReview: input.long_review } : {}),
      ...(input.no_external_train !== undefined ? { noExternalTrain: input.no_external_train } : {}),
      ...(input.anonymize_pii !== undefined ? { piiFilter: input.anonymize_pii } : {}),
      ...(input.residency ? { residency: input.residency } : {}),
    };
    await tx.aiGovernance.update({ where: { id: 1 }, data: { ...data, updatedAt: this.clock.now() } });
    return { result: { ok: true }, before: governanceDto(g), after: data };
  }
}

registerTenantSeed({
  name: 'ai.governance',
  order: 30,
  async run(tx) {
    await tx.aiGovernance.upsert({ where: { id: 1 }, create: defaultGovernance(), update: {} });
  },
});
