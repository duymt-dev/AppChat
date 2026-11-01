// Permission duyệt của action gốc (Blueprint §3.4 `approval.approve`): người duyệt cần `approvals.decide` VÀ quyền này. Module có
// quyền duyệt riêng (báo giá, hợp đồng, hoàn tiền, chiến dịch) dùng quyền đó; còn lại = permission của chính action.
import type { ActionDef } from '@appchat/actions';
import type { PermissionKey } from '@appchat/shared';

const BY_PREFIX: [RegExp, PermissionKey][] = [
  [/^quote\./, 'quote.approve'],
  [/^contract\./, 'contract.sign'],
  [/^(payment\.refund|order\.refund)/, 'payment.refund_approve'],
  [/^(campaign|segment)\./, 'campaign.approve'],
];

export function approvalPermissionOf(def: Pick<ActionDef, 'id' | 'permission'>): string {
  for (const [re, p] of BY_PREFIX) if (re.test(def.id)) return p;
  return def.permission;
}
