// Đọc một lần chuyển phụ trách (TIP-015d §2.8) — dùng chung `GET /v1/contacts/:id/transfers/:transferId` + action `contact.transfer_status`.
// Số đếm / trạng thái: crm.reassign + scope khách HIỆN TẠI (không thấy khách → 404, không lộ tồn tại). Chi tiết bản ghi chỉ ở domain người
// xem có quyền xem (inbox.view / quote.view / booking.view) — nhãn là tiêu đề hội thoại / mã báo giá / mã lịch hẹn, không tiền / nội dung.
// Trang theo khoá (domain, entity_id) — mặc định 30, tối đa 100; cursor hỏng → 400.
import { AppError, can, type AuthzContext, type ContactTransferStatusDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, visibleContact } from '../services/access';

const DOMAIN_PERM = { conversation: 'inbox.view', quote: 'quote.view', appointment: 'booking.view' } as const;
type Domain = keyof typeof DOMAIN_PERM;

const enc = (d: string, id: string) => Buffer.from(`${d}|${id}`).toString('base64url');
function dec(c: string): { domain: string; id: string } {
  const [domain, id] = Buffer.from(c, 'base64url').toString().split('|');
  if (!domain || !id || !(domain in DOMAIN_PERM) || !UUID.test(id)) throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
  return { domain, id };
}

/** `transferId` vắng = lần chuyển mới nhất của khách (generation lớn nhất — unique (contact_id, generation)). */
export async function transferStatus(tx: TenantTx, authz: AuthzContext, contactId: string, transferId: string | undefined, q: { cursor?: string; limit?: number } = {}): Promise<ContactTransferStatusDto> {
  if (!can(authz, 'crm.reassign')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
  const { contact } = await visibleContact(tx, authz, contactId);
  const t = transferId === undefined
    ? await tx.contactTransfer.findFirst({ where: { contactId: contact.id }, orderBy: { generation: 'desc' } })
    : UUID.test(transferId) ? await tx.contactTransfer.findUnique({ where: { id: transferId } }) : null;
  if (!t || t.contactId !== contactId) throw new AppError('NOT_FOUND', 404, { transfer_id: 'not_found' });
  const limit = Math.min(Math.max(q.limit ?? 30, 1), 100);
  const domains = (Object.keys(DOMAIN_PERM) as Domain[]).filter((d) => can(authz, DOMAIN_PERM[d]));
  const after = q.cursor ? dec(q.cursor) : null;
  const rows = domains.length
    ? await tx.contactTransferItem.findMany({
        where: { transferId: t.id, domain: { in: domains }, ...(after ? { OR: [{ domain: { gt: after.domain } }, { domain: after.domain, entityId: { gt: after.id } }] } : {}) },
        orderBy: [{ domain: 'asc' }, { entityId: 'asc' }],
        take: limit + 1,
        select: { domain: true, entityId: true },
      })
    : [];
  const page = rows.slice(0, limit);
  const ids = (d: Domain) => page.filter((r) => r.domain === d).map((r) => r.entityId);
  const [convs, quotes, appts] = await Promise.all([
    ids('conversation').length ? tx.conversation.findMany({ where: { id: { in: ids('conversation') } }, select: { id: true, title: true } }) : [],
    ids('quote').length ? tx.quote.findMany({ where: { id: { in: ids('quote') } }, select: { id: true, code: true, version: true } }) : [],
    ids('appointment').length ? tx.appointment.findMany({ where: { id: { in: ids('appointment') } }, select: { id: true, code: true } }) : [],
  ]);
  const label = new Map<string, string>([
    ...convs.map((c) => [c.id, c.title ?? ''] as [string, string]),
    ...quotes.map((x) => [x.id, x.version > 1 ? `${x.code}-L${x.version}` : x.code] as [string, string]),
    ...appts.map((a) => [a.id, a.code] as [string, string]),
  ]);
  const last = page.at(-1);
  return {
    transfer_id: t.id,
    contact_id: t.contactId,
    status: t.status as 'applied' | 'undone',
    from_user_id: t.fromUserId,
    to_user_id: t.toUserId,
    moved: t.counts as ContactTransferStatusDto['moved'],
    created_at: t.createdAt.toISOString(),
    undone_at: t.undoneAt?.toISOString() ?? null,
    items: page.map((r) => ({ domain: r.domain as Domain, entity_id: r.entityId, label: label.get(r.entityId) ?? '' })),
    next_cursor: rows.length > limit && last ? enc(last.domain, last.entityId) : null,
  };
}
