// Ngưỡng duyệt báo giá đọc trong transaction (TIP-032b P1, COMMERCE §3 Q5): `commerce_settings` (Owner chỉnh — mặc định 20.000.000đ / 5%)
// + trần giảm giá agent của AI Governance (`force_approval.discount_over_pct`, mặc định 5%) CHỈ cho báo giá do agent / Trợ lý / tác vụ tạo —
// Owner thao tác trên UI không bị trần agent chặn. Đọc ở preview VÀ execute (đổi cấu hình sau preview → execute tính lại).
import type { ApprovalPolicy } from '@appchat/shared';
import { DEFAULT_APPROVAL_POLICY } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

/** Ai tạo báo giá (`quote.created_by_type`) — chỉ `user` thao tác tay mới thoát trần agent. */
export type QuoteCreator = 'user' | 'agent' | 'assistant' | string;

export interface QuotePolicy {
  policy: ApprovalPolicy;
  /** Trần % giảm giá agent (undefined = người dùng tự thao tác). */
  agentMaxPct?: number;
}

/** Ngưỡng của workspace (thiếu dòng — workspace trước migration seed — dùng mặc định luật). */
export async function readApprovalPolicy(tx: Pick<TenantTx, 'commerceSettings'>): Promise<ApprovalPolicy & { version: number }> {
  const s = await tx.commerceSettings.findUnique({ where: { id: 1 } });
  return s ? { total_vnd: String(s.approvalTotalVnd), discount_pct: s.approvalDiscountPct, version: s.version } : { ...DEFAULT_APPROVAL_POLICY, version: 0 };
}

/** Trần giảm giá agent từ AI Governance (`force_approval.discount_over_pct`); thiếu → 5 (FORCE_APPROVAL mặc định). */
export async function agentDiscountCap(tx: Pick<TenantTx, 'aiGovernance'>): Promise<number> {
  const g = await tx.aiGovernance.findUnique({ where: { id: 1 }, select: { forceApproval: true } });
  const v = (g?.forceApproval as { discount_over_pct?: unknown } | null)?.discount_over_pct;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : DEFAULT_APPROVAL_POLICY.discount_pct;
}

/** Ngưỡng áp cho một báo giá theo người tạo. */
export async function quotePolicy(tx: TenantTx, creator: QuoteCreator): Promise<QuotePolicy> {
  const policy = await readApprovalPolicy(tx);
  return creator === 'user' ? { policy } : { policy, agentMaxPct: await agentDiscountCap(tx) };
}
