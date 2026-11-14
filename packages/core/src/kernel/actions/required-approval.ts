// Luật duyệt bắt buộc theo khai báo ActionDef (TIP-015d, D32): `requiredApprovalSources` → nguồn đó luôn `approval` trước xem trước /
// xác nhận / prepare, kể cả write mà bảng policy cho chạy, autoSend, hội thoại đang phục vụ hay thẻ xác nhận. Không biết domain nào (kernel
// không import CRM / AI) — chỉ đọc metadata. Duyệt đã tiêu thụ hợp lệ (ctx.approvalId) chỉ để không xin lại; quyền vẫn kiểm như thường.
import type { ActionDef } from '@appchat/actions';
import type { ActionSource } from './action-context';
import type { PolicyDecision } from './policy';

export function requiredApproval(def: Pick<ActionDef, 'requiredApprovalSources'>, source: ActionSource): boolean {
  return !!def.requiredApprovalSources?.some((s) => s === source);
}

/** Gộp với quyết định của bảng policy: cấm vẫn là cấm; nguồn bắt buộc duyệt → `approval`. */
export function withRequiredApproval(base: PolicyDecision, def: Pick<ActionDef, 'requiredApprovalSources'>, source: ActionSource): PolicyDecision {
  if (base === 'forbidden') return base;
  return requiredApproval(def, source) ? 'approval' : base;
}
