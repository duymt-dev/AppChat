// Preview duyệt báo giá (TIP-023b R2.8): gửi duyệt → khách + tổng + lý do chạm ngưỡng (COMMERCE §3) + người nhận thông báo (quyền
// `quote.approve`); duyệt / từ chối nội bộ (risk money) → trạng thái trước / sau + tổng + lý do; từ chối nêu lý do ghi thành trao đổi
// nội bộ. Chỉ đọc — QUOTE_FLOW kiểm sớm, execute khoá dòng và kiểm lại.
import type { ActionInput, ActionPreview, quoteApprove, quoteRejectInternal, quoteSubmit } from '@appchat/actions';
import { createFmt } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { flowOf, label, storedWarnings } from './quote-write.handlers.preview';

const money = (v: bigint) => createFmt({ locale: 'vi' }).money(String(v));

export async function submitPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteSubmit>): Promise<ActionPreview> {
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.submit_for_approval');
  const warnings = await storedWarnings(tx, q);
  return preview('write', line(label(q), contact, money(q.total)), {
    changes: updated('quote', q.id, { status: q.status }, { status: to, notify: 'quote.approve' }),
    ...(warnings.length ? { warnings } : {}),
  });
}

export async function approvePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteApprove>): Promise<ActionPreview> {
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.approve');
  const warnings = await storedWarnings(tx, q);
  return preview('money', line(label(q), contact, money(q.total)), {
    changes: updated('quote', q.id, { status: q.status }, { status: to }),
    ...(warnings.length ? { warnings } : {}),
  });
}

export async function rejectInternalPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteRejectInternal>): Promise<ActionPreview> {
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.reject_internal');
  return preview('money', line(label(q), contact, money(q.total)), {
    changes: updated('quote', q.id, { status: q.status }, { status: to, reason: i.reason?.trim() || undefined }),
  });
}
