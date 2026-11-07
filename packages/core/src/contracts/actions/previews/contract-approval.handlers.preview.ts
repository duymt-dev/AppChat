// Preview duyệt hợp đồng (TIP-023b R2.8): trình duyệt → khách + giá trị + người nhận thông báo (quyền `contract.sign`), giá trị 0 → 422
// như execute; yêu cầu sửa / từ chối nội bộ → về nháp + lý do (ghi nhật ký hợp đồng); duyệt & ký (risk money) → trạng thái + giá trị, cảnh
// báo ký điện tử bằng OTP email của chính Owner (COMMERCE §9 C2). Chỉ đọc — không kiểm OTP, không render PDF.
import type { ActionInput, ActionPreview, contractApproveAndSign, contractRejectInternal, contractRequestChanges, contractSubmit } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { flowOf, label, money } from './contract-write.handlers.preview';

export async function submitPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractSubmit>): Promise<ActionPreview> {
  const { c, to, contact } = await flowOf(tx, ctx, i.contract_id, 'contract.submit');
  if (c.value <= 0n) throw new AppError('VALIDATION_FAILED', 422, { value: 'required' });
  return preview('write', line(label(c), contact, money(c.value)), { changes: updated('contract', c.id, { status: c.status }, { status: to, notify: 'contract.sign' }) });
}

async function backToDraft(ctx: ActionContext, tx: TenantTx, id: string, action: string, reason: string | undefined) {
  const { c, to, contact } = await flowOf(tx, ctx, id, action);
  return preview('write', line(label(c), contact), { changes: updated('contract', c.id, { status: c.status }, { status: to, reason: reason?.trim() || undefined }) });
}

export const requestChangesPreview = (ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractRequestChanges>) => backToDraft(ctx, tx, i.contract_id, 'contract.request_changes', i.reason);
export const rejectInternalPreview = (ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractRejectInternal>) => backToDraft(ctx, tx, i.contract_id, 'contract.reject_internal', i.reason);

export async function approveSignPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractApproveAndSign>): Promise<ActionPreview> {
  const { c, to, contact } = await flowOf(tx, ctx, i.contract_id, 'contract.approve_and_sign');
  return preview('money', line(label(c), contact, money(c.value)), { changes: updated('contract', c.id, { status: c.status }, { status: to, signed_by: 'business' }), warnings: ['e_signature:otp_email'] });
}
