// Cửa sổ luồng tin + tìm có trang (TIP-025b §B.1–2). Mọi đường đọc tin (trang thường, cửa sổ quanh tin, trích dẫn trả lời) dùng CHUNG
// một mốc hiển thị: sau `cleared_at` của hội thoại; tin đã xoá / thu hồi không lộ thân qua trích dẫn. Tìm có trang: ảnh chụp
// `snapshot_at` cố định trong cursor (tin mới sau ảnh chụp không chen vào giữa các trang — FE làm mới để thấy), `total` đếm đúng trong ảnh
// chụp + scope hiện tại (không chặn cứng). Cursor mờ gắn với câu tìm + người gửi: đổi câu mà giữ cursor → 400. Cửa sổ quanh tin ≤ 51 tin,
// tin không thấy / xoá / thu hồi / trước mốc xoá lịch sử / hội thoại khác → 404 không tiết lộ.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, THREAD_AROUND_MAX, THREAD_SEARCH_LIMIT, foldText, foldRanges, type MessageDto, type ThreadHitDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, type Conv } from './access';
import { toMessage, withDays, type MsgExtras, type Place } from './view';
import { latestOperations } from '../../channels/operations/operation-read';
import { avatarKey, avatarLinks } from '../../channels/operations/avatar-read';
import type { FileLinks } from '../../kernel/files/file-links';

type MsgRow = Awaited<ReturnType<TenantTx['message']['findMany']>>[number];
const SENDERS = new Set(['contact', 'user', 'agent']);
const HALF = (THREAD_AROUND_MAX - 1) / 2;

export interface ThreadCtx {
  tx: TenantTx;
  c: Conv;
  userId: string;
  ws: string;
  p: Place;
  links: FileLinks | null;
}

/** Điều kiện mốc hiển thị (Prisma where) — dùng cho trang, cửa sổ và trích dẫn. */
export const visibleAfter = (c: Conv) => (c.clearedAt ? { createdAt: { gt: c.clearedAt } } : {});

/** DTO cho một dải tin (cũ → mới) + mốc ngày. Trích dẫn tin trước mốc xoá lịch sử / đã xoá / thu hồi → rỗng (không kênh phụ lộ thân). */
export async function toDtos(t: ThreadCtx, page: MsgRow[]): Promise<MessageDto[]> {
  const { tx, c } = t;
  const ids = page.map((m) => m.id);
  const replyIds = [...new Set(page.map((m) => m.replyToId).filter((x): x is string => !!x))];
  const senders = c.kind === 'group' ? [...new Set(page.filter((m) => m.direction === 'in' && m.senderId).map((m) => m.senderId!))] : [];
  const [mine, replies, ops, avs] = await Promise.all([
    tx.messageReaction.findMany({ where: { messageId: { in: ids }, actorType: 'user', actorId: t.userId }, orderBy: { createdAt: 'asc' } }),
    replyIds.length ? tx.message.findMany({ where: { id: { in: replyIds }, conversationId: c.id }, select: { id: true, body: true, deletedAt: true, recalledAt: true, createdAt: true } }) : [],
    latestOperations(tx, ids),
    avatarLinks(tx, t.links, t.ws, senders.map((externalId) => ({ accountId: c.channelAccountId, externalId }))),
  ]);
  const hidden = (r: { deletedAt: Date | null; recalledAt: Date | null; createdAt: Date }) => !!(r.deletedAt || r.recalledAt || (c.clearedAt && r.createdAt <= c.clearedAt));
  const x: MsgExtras = {
    myReaction: new Map(mine.map((r) => [r.messageId, r.emoji])),
    replyPreview: new Map(replies.map((r) => [r.id, hidden(r) ? '' : r.body.slice(0, 80)])),
    isGroup: c.kind === 'group',
    ops,
    senderAvatars: new Map(
      senders.flatMap((s) => {
        const url = avs.get(avatarKey(c.channelAccountId, s));
        return url ? [[s, url] as const] : [];
      }),
    ),
  };
  return withDays(page.map((m) => ({ at: m.createdAt, dto: toMessage(m, x, t.p) })), t.p);
}

/** Mốc keyset của một tin trong hội thoại (cursor ngoài hội thoại / sai dạng → null — coi như trang đầu). */
async function anchorOf(tx: TenantTx, convId: string, id: string | undefined) {
  if (!id || !UUID.test(id)) return null;
  const m = await tx.message.findUnique({ where: { id }, select: { id: true, createdAt: true, conversationId: true } });
  return m && m.conversationId === convId ? m : null;
}

/** Trang tin: `before` = cũ hơn (mặc định trang mới nhất), `after` = mới hơn (sau khi nhảy tới kết quả tìm). */
export async function threadPage(t: ThreadCtx, size: number, before?: string, after?: string) {
  const { tx, c } = t;
  const a = after ? await anchorOf(tx, c.id, after) : null;
  if (a) {
    const rows = await tx.message.findMany({
      where: { conversationId: c.id, ...visibleAfter(c), OR: [{ createdAt: { gt: a.createdAt } }, { createdAt: a.createdAt, id: { gt: a.id } }] },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: size + 1,
    });
    const page = rows.slice(0, size);
    return { data: await toDtos(t, page), next_cursor: null, after_cursor: rows.length > size ? (page.at(-1)?.id ?? null) : null };
  }
  const b = await anchorOf(tx, c.id, before);
  const rows = await tx.message.findMany({
    where: { conversationId: c.id, ...visibleAfter(c), ...(b ? { OR: [{ createdAt: { lt: b.createdAt } }, { createdAt: b.createdAt, id: { lt: b.id } }] } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: size + 1,
  });
  const page = rows.slice(0, size).reverse();
  return { data: await toDtos(t, page), next_cursor: rows.length > size ? (page[0]?.id ?? null) : null, after_cursor: null };
}

/** Cửa sổ ≤ 51 tin quanh tin `messageId` (đúng một lần truy vấn mỗi phía — không lật trang tuần tự qua lịch sử). */
export async function threadAround(t: ThreadCtx, messageId: string) {
  const { tx, c } = t;
  const m = UUID.test(messageId) ? await tx.message.findUnique({ where: { id: messageId } }) : null;
  if (!m || m.conversationId !== c.id || m.deletedAt || m.recalledAt || (c.clearedAt && m.createdAt <= c.clearedAt)) throw new AppError('NOT_FOUND', 404, { message_id: 'not_found' });
  const [older, newer] = await Promise.all([
    tx.message.findMany({ where: { conversationId: c.id, ...visibleAfter(c), OR: [{ createdAt: { lt: m.createdAt } }, { createdAt: m.createdAt, id: { lt: m.id } }] }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: HALF + 1 }),
    tx.message.findMany({ where: { conversationId: c.id, OR: [{ createdAt: { gt: m.createdAt } }, { createdAt: m.createdAt, id: { gt: m.id } }] }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: HALF + 1 }),
  ]);
  const before = older.slice(0, HALF).reverse();
  const after = newer.slice(0, HALF);
  return {
    data: await toDtos(t, [...before, m, ...after]),
    anchor_id: m.id,
    before_cursor: older.length > HALF ? (before[0]?.id ?? null) : null,
    after_cursor: newer.length > HALF ? (after.at(-1)?.id ?? null) : null,
  };
}

type SearchCursor = { s: string; a: string; i: string; k: string };
const enc = (c: SearchCursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
function dec(raw: string | undefined, key: string): SearchCursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as SearchCursor;
    if (c.k === key && UUID.test(c.i) && !Number.isNaN(Date.parse(c.s)) && !Number.isNaN(Date.parse(c.a))) return c;
  } catch {
    /* rơi xuống lỗi chung */
  }
  throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
}

/** Tìm có trang (cũ → mới) trong ảnh chụp; không dấu (cùng biểu thức index `message_body_trgm_idx`). */
export async function threadSearchPage(t: ThreadCtx, q: string, sender: string, cursor: string | undefined, limit = THREAD_SEARCH_LIMIT) {
  const { tx, c, p } = t;
  const needle = foldText(q).slice(0, 100);
  if (!needle) throw new AppError('VALIDATION_FAILED', 400, { q: 'required' });
  const who = SENDERS.has(sender) ? sender : 'all';
  const key = `${needle}|${who}`;
  const cur = dec(cursor, key);
  const snapshot = cur ? new Date(cur.s) : p.now;
  const like = `%${needle.replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
  const base = Prisma.sql`m.conversation_id = ${c.id}::uuid AND m.deleted_at IS NULL AND m.recalled_at IS NULL AND m.kind <> 'note'
    AND f_unaccent(lower(m.body)) LIKE ${like} AND m.created_at <= ${snapshot}
    ${who !== 'all' ? Prisma.sql`AND m.sender_type = ${who}::sender_type` : Prisma.empty}
    ${c.clearedAt ? Prisma.sql`AND m.created_at > ${c.clearedAt}` : Prisma.empty}`;
  const after = cur ? Prisma.sql`AND (m.created_at, m.id) > (${new Date(cur.a)}, ${cur.i}::uuid)` : Prisma.empty;
  const size = Math.min(THREAD_SEARCH_LIMIT, Math.max(1, limit));
  const [rows, counted] = await Promise.all([
    tx.$queryRaw<{ id: string; body: string; sender_type: ThreadHitDto['sender']; created_at: Date }[]>`
      SELECT m.id, m.body, m.sender_type::text AS sender_type, m.created_at FROM message m WHERE ${base} ${after}
      ORDER BY m.created_at ASC, m.id ASC LIMIT ${size + 1}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM message m WHERE ${base}`,
  ]);
  const page = rows.slice(0, size);
  const time = new Intl.DateTimeFormat(p.locale === 'en' ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: p.timeZone, hour12: false });
  const last = page.at(-1);
  return {
    data: page.map((r) => ({ message_id: r.id, body: r.body, sender: r.sender_type, time: time.format(r.created_at), ranges: foldRanges(r.body, q) })),
    next_cursor: rows.length > size && last ? enc({ s: snapshot.toISOString(), a: last.created_at.toISOString(), i: last.id, k: key }) : null,
    total: Number(counted[0]?.n ?? 0),
    snapshot_at: snapshot.toISOString(),
  };
}
