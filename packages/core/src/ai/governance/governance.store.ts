// Danh mục + đọc AI Governance (Blueprint §2.2 `ai_governance`): phạm vi / ranh giới mặc định, DTO cho Cài đặt › AI Governance, đọc dòng
// (thiếu thì tạo mặc định). Dùng chung cho handler `governance.update`, preview của nó và ngữ cảnh trả lời agent.
import type { GovernanceDto } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';

/** Danh mục (khoá + nhạy cảm / rủi ro + mặc định) — prototype Cài đặt › AI Governance. */
export const SCOPES = [
  ['messages', false, true],
  ['catalog', false, true],
  ['faq', false, true],
  ['pii', true, false],
  ['finance', true, false],
  ['partner', false, false],
] as const;
export const BOUNDS = [
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
export const flags = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, boolean>) : {});

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

export const pick = (keys: readonly (readonly [string, boolean, boolean])[], patch: Record<string, boolean> | undefined) =>
  Object.fromEntries(Object.entries(patch ?? {}).filter(([k]) => keys.some(([x]) => x === k)));
