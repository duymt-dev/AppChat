// Bảng tin nhóm (TIP-025b §A.7): tin ghim + một loại mục (ảnh / tệp / link / ghi chú) theo trang keyset (created_at, id) — chỉ tin sau mốc
// xoá lịch sử, chưa xoá / thu hồi, trong hội thoại người xem thấy được. Ảnh / tệp: tên / loại / kích thước + link như luồng tin (không URL
// gốc nhà cung cấp mới); link: URL http(s) tách từ nội dung (không tự tải); ghi chú: tin `note` của chính hội thoại (không phải ghi chú
// CRM). Index `message_conversation_kind_idx` (conversation_id, kind, created_at DESC, id DESC) partial chưa xoá / thu hồi.
import { AppError, GROUP_BOARD_PAGE, type AuthzContext, type GroupBoardDto, type GroupBoardItemDto, type GroupBoardKind } from '@appchat/shared';
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, visibleConversation } from '../services/access';

const KIND: Record<Exclude<GroupBoardKind, 'links'>, string> = { media: 'image', files: 'file', notes: 'note' };
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;
type Row = { id: string; created_at: Date; kind: string; body: string; attachments: unknown; sender_name: string | null };

/** URL http(s) trong chữ (bỏ dấu câu cuối, tối đa 3 / tin, ≤ 500 ký tự) — chỉ chữ, không tải trước. */
export function linksOf(body: string): string[] {
  return [...new Set((body.match(URL_RE) ?? []).map((u) => u.replace(/[.,;:!?]+$/, '')).filter((u) => u.length <= 500))].slice(0, 3);
}

function itemOf(r: Row, kind: GroupBoardKind): GroupBoardItemDto[] {
  const base = { message_id: r.id, at: r.created_at.toISOString(), sender: r.sender_name ?? '' };
  if (kind === 'notes') return [{ ...base, text: r.body.slice(0, 2000) }];
  if (kind === 'links') return linksOf(r.body).map((url) => ({ ...base, url }));
  const a = (Array.isArray(r.attachments) ? r.attachments[0] : undefined) as { name?: string; mime?: string; size?: number; url?: string } | undefined;
  return [{ ...base, name: a?.name ?? r.body, ...(a?.mime ? { mime: a.mime } : {}), ...(typeof a?.size === 'number' ? { size: a.size } : {}), ...(a?.url ? { url: a.url } : {}) }];
}

export async function groupBoard(tx: TenantTx, authz: AuthzContext, id: string, kind: GroupBoardKind, cursor: string | undefined, limit = GROUP_BOARD_PAGE): Promise<GroupBoardDto> {
  const c = await visibleConversation(tx, authz, id);
  if (c.kind !== 'group') throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_group' });
  const size = Math.min(GROUP_BOARD_PAGE, Math.max(1, limit));
  const anchor = cursor && UUID.test(cursor) ? await tx.message.findUnique({ where: { id: cursor }, select: { id: true, createdAt: true, conversationId: true } }) : null;
  const after = c.clearedAt ? Prisma.sql`AND m.created_at > ${c.clearedAt}` : Prisma.empty;
  const before = anchor && anchor.conversationId === c.id ? Prisma.sql`AND (m.created_at, m.id) < (${anchor.createdAt}, ${anchor.id}::uuid)` : Prisma.empty;
  const which = kind === 'links' ? Prisma.sql`AND m.kind IN ('text', 'note') AND m.body ~* 'https?://'` : Prisma.sql`AND m.kind = ${KIND[kind]}::message_kind`;
  const rows = await tx.$queryRaw<Row[]>`
    SELECT m.id, m.created_at, m.kind::text AS kind, m.body, m.attachments, m.sender_name FROM message m
    WHERE m.conversation_id = ${c.id}::uuid AND m.deleted_at IS NULL AND m.recalled_at IS NULL ${which} ${after} ${before}
    ORDER BY m.created_at DESC, m.id DESC LIMIT ${size + 1}`;
  const page = rows.slice(0, size);
  const pin = c.pinnedMessageId ? await tx.message.findUnique({ where: { id: c.pinnedMessageId }, select: { id: true, createdAt: true, kind: true, body: true, attachments: true, senderName: true, deletedAt: true, recalledAt: true, conversationId: true } }) : null;
  const pinVisible = pin && pin.conversationId === c.id && !pin.deletedAt && !pin.recalledAt && !(c.clearedAt && pin.createdAt <= c.clearedAt);
  return {
    pinned: pinVisible ? { message_id: pin.id, at: pin.createdAt.toISOString(), sender: pin.senderName ?? '', text: pin.kind === 'text' || pin.kind === 'note' ? pin.body.slice(0, 500) : '' } : null,
    kind,
    items: page.flatMap((r) => itemOf(r, kind)),
    next_cursor: rows.length > size ? (page.at(-1)?.id ?? null) : null,
  };
}
