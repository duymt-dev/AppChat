// Preview phản hồi của khách (TIP-023b R2.8): chốt / từ chối → trạng thái trước / sau + tổng (+ lý do); từ chối mà khách hết báo giá mở
// thì báo giai đoạn khách lùi về Đang tư vấn (COMMERCE §8); xin sửa → bản hiện tại `revision_requested` + phiên bản mới n+1 (cùng mã,
// sao chép dòng). Có phiên bản mới hơn → INVALID_TRANSITION như execute. Chỉ đọc. Nguồn mang dòng dõi khách (agent / tác vụ) không có
// handle ý định khách → từ chối như execute (TIP-022c — không dựng thẻ cho quyết định không căn cứ).
import type { ActionInput, ActionPreview, quoteMarkAccepted, quoteMarkRejected, quoteRequestRevision } from '@appchat/actions';
import { AppError, OPEN_QUOTE_STATUSES, createFmt } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../../kernel/actions/preview-kit';
import { hasNewerVersion } from '../services/quote-write';
import { assertIntentForPreview } from '../services/customer-intent-guard';
import { flowOf, label } from './quote-write.handlers.preview';

const money = (v: bigint) => createFmt({ locale: 'vi' }).money(String(v));

export async function acceptPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteMarkAccepted>): Promise<ActionPreview> {
  assertIntentForPreview(ctx, 'quote.mark_accepted', i.quote_id);
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.mark_accepted');
  return preview('write', line(label(q), contact, money(q.total)), { changes: updated('quote', q.id, { status: q.status }, { status: to }) });
}

export async function rejectPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteMarkRejected>): Promise<ActionPreview> {
  assertIntentForPreview(ctx, 'quote.mark_rejected', i.quote_id);
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.mark_rejected');
  const open = await tx.quote.findFirst({ where: { contactId: q.contactId, id: { not: q.id }, deletedAt: null, status: { in: [...OPEN_QUOTE_STATUSES] } }, select: { id: true } });
  return preview('write', line(label(q), contact, money(q.total)), {
    changes: updated('quote', q.id, { status: q.status }, { status: to, reason: i.reason?.trim() || undefined }),
    ...(open ? {} : { warnings: ['stage_fallback:consulting'] }),
  });
}

export async function revisionPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteRequestRevision>): Promise<ActionPreview> {
  assertIntentForPreview(ctx, 'quote.request_revision', i.quote_id);
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.request_revision');
  if (await hasNewerVersion(tx, q)) throw new AppError('INVALID_TRANSITION', 409, { status: q.status, version: 'newer_exists' });
  return preview('write', line(label(q), contact), {
    changes: [
      ...updated('quote', q.id, { status: q.status }, { status: to }),
      created('quote', { code: q.code, version: q.version + 1, status: 'draft', total: String(q.total), reason: i.reason?.trim() || undefined }),
    ],
  });
}
