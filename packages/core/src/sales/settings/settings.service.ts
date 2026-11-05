// Đọc chính sách bán hàng (TIP-032b P1): `GET /v1/settings/sales-policy` — ngưỡng duyệt workspace + trần giảm giá agent đang áp (AI
// Governance, chỉ đọc). Người có `quote.view` hoặc `settings.manage` xem được (UI báo giá hiện ngưỡng); `can_edit` chỉ Chủ sở hữu.
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type AuthzContext, type SalesPolicyDto } from '@appchat/shared';
import { agentDiscountCap, readApprovalPolicy } from './policy';

export interface SalesPolicyViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

export class CommerceSettingsService {
  constructor(private readonly tenants: TenantDbResolver) {}

  async get(v: SalesPolicyViewer): Promise<SalesPolicyDto> {
    const a = v.authz;
    if (!a.isOwner && !a.permissions.has('quote.view') && !a.permissions.has('settings.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'quote.view' });
    const db = await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(async (tx) => {
      const p = await readApprovalPolicy(tx);
      return { approval_total_vnd: p.total_vnd, approval_discount_pct: p.discount_pct, agent_max_discount_pct: await agentDiscountCap(tx), version: p.version, can_edit: a.isOwner };
    });
  }
}
