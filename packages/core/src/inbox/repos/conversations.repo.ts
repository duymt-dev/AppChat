// Danh sách hội thoại (indexing §3–7): bước 1 lấy `id` theo index (scope + thư mục + lọc, keyset `(last_message_at, id) DESC`
// — không OFFSET: Hộp thư cuộn vô hạn, cursor ổn định khi có tin mới); bước 2 nạp đủ cột theo PK (deferred join). Sắp xếp
// "chưa đọc trước" (TIP-025) thêm cờ `unread_count > 0` vào đầu keyset.
// Đếm thư mục (`/conversations/counts`) một truy vấn `count(*) FILTER` trong scope người xem + cùng bộ lọc của danh sách (TIP-025b).
import { TenantSql as Prisma } from '@appchat/db';
import { foldText, type AuthzContext, type InboxFolder, type InboxSort } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, convScopeSql } from '../services/access';

export interface ConvFilter {
  folder?: InboxFolder;
  channel?: string;
  channelAccountId?: string;
  tagId?: string;
  q?: string;
  sort?: InboxSort;
}

/** Hội thoại đang hiện ở hộp thư: chưa lưu trữ, không ẩn, không đóng, không đang tạm ẩn. */
const live = (now: Date) =>
  Prisma.sql`cv.archived_at IS NULL AND cv.hidden_at IS NULL AND cv.status <> 'closed' AND (cv.status <> 'snoozed' OR cv.snoozed_until IS NULL OR cv.snoozed_until <= ${now})`;

/** Thẻ hệ thống theo tên (thư mục "VIP", "Khiếu nại" của tab trên) — so không dấu. */
const tagged = (name: string) =>
  Prisma.sql`EXISTS (SELECT 1 FROM conversation_tag ct JOIN tag t ON t.id = ct.tag_id WHERE ct.conversation_id = cv.id AND f_unaccent(lower(t.name)) = ${name})`;

/** Có lần @nhắc người xem chưa đọc (TIP-025) — index partial `message_mention_unread_idx (user_id, conversation_id)`. */
const mentioned = (userId: string) =>
  Prisma.sql`EXISTS (SELECT 1 FROM message_mention mm WHERE mm.user_id = ${userId}::uuid AND mm.conversation_id = cv.id AND mm.read_at IS NULL)`;

function folderSql(authz: AuthzContext, folder: InboxFolder, now: Date): Prisma.Sql {
  switch (folder) {
    case 'archived':
      return Prisma.sql`cv.archived_at IS NOT NULL`;
    case 'closed':
      return Prisma.sql`cv.status = 'closed' AND cv.archived_at IS NULL`;
    case 'mine':
      return Prisma.sql`${live(now)} AND cv.assignee_user_id = ${authz.userId}::uuid`;
    case 'unread':
      return Prisma.sql`${live(now)} AND cv.unread_count > 0`;
    case 'mention':
      return Prisma.sql`${live(now)} AND ${mentioned(authz.userId)}`;
    case 'team':
      // Đồng đội đang xử lý: đã gán cho người khác (cùng định nghĩa với đếm `team`).
      return Prisma.sql`${live(now)} AND cv.assignee_user_id IS NOT NULL AND cv.assignee_user_id <> ${authz.userId}::uuid`;
    case 'ai_running':
      return Prisma.sql`${live(now)} AND cv.ai_state = 'running'`;
    case 'ai_pending_approval':
      return Prisma.sql`${live(now)} AND cv.ai_state = 'waiting_approval'`;
    case 'needs_human':
      return Prisma.sql`${live(now)} AND cv.ai_state = 'handoff'`;
    case 'vip':
      return Prisma.sql`${live(now)} AND ${tagged('vip')}`;
    case 'complaint':
      return Prisma.sql`${live(now)} AND ${tagged('khieu nai')}`;
    default:
      return live(now);
  }
}

function where(authz: AuthzContext, f: ConvFilter, now: Date): Prisma.Sql {
  return Prisma.join([convScopeSql(authz), folderSql(authz, f.folder ?? 'all', now), ...filterParts(f, true)], ' AND ');
}

/** Bộ lọc ngoài thư mục (kênh / tài khoản / thẻ / tìm kiếm) — cùng điều kiện cho danh sách và đếm (TIP-025b §B.4). */
function filterParts(f: ConvFilter, withChannel: boolean): Prisma.Sql[] {
  const parts: Prisma.Sql[] = [];
  if (withChannel && f.channel) parts.push(Prisma.sql`cv.channel_type = ${f.channel}`);
  if (f.channelAccountId) parts.push(UUID.test(f.channelAccountId) ? Prisma.sql`cv.channel_account_id = ${f.channelAccountId}::uuid` : Prisma.sql`FALSE`);
  if (f.tagId) parts.push(UUID.test(f.tagId) ? Prisma.sql`EXISTS (SELECT 1 FROM conversation_tag ct WHERE ct.conversation_id = cv.id AND ct.tag_id = ${f.tagId}::uuid)` : Prisma.sql`FALSE`);
  const q = f.q?.trim();
  if (q) {
    // Cùng biểu thức với index trigram `conversation_search_trgm_idx`.
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    // Hội thoại 1-1 không có title → khớp thêm tên khách (index trigram `contact_name_trgm_idx`).
    parts.push(Prisma.sql`(f_unaccent(lower(coalesce(cv.title, '') || ' ' || cv.last_message_preview)) LIKE ${like}
      OR EXISTS (SELECT 1 FROM contact k WHERE k.id = cv.contact_id AND k.deleted_at IS NULL AND f_unaccent(lower(k.name)) LIKE ${like}))`);
  }
  return parts;
}

const andAll = (parts: Prisma.Sql[]) => (parts.length ? Prisma.sql`AND ${Prisma.join(parts, ' AND ')}` : Prisma.empty);

/** Cursor = `<cờ chưa đọc 0|1>_<iso last_message_at>_<id>` (base64url); cờ chỉ có nghĩa khi sắp xếp "chưa đọc trước". */
export const encodeCursor = (at: Date, id: string, unread = 0) => Buffer.from(`${unread}_${at.toISOString()}_${id}`).toString('base64url');
function decodeCursor(c: string | undefined): { u: number; at: Date; id: string } | null {
  if (!c) return null;
  const [u, iso, id] = Buffer.from(c, 'base64url').toString().split('_');
  const at = new Date(iso ?? '');
  return (u === '0' || u === '1') && id && UUID.test(id) && !Number.isNaN(at.getTime()) ? { u: Number(u), at, id } : null;
}

export async function listConversationIds(tx: TenantTx, authz: AuthzContext, f: ConvFilter, now: Date, cursor: string | undefined, limit: number) {
  const after = decodeCursor(cursor);
  const byUnread = f.sort === 'unread';
  const flag = Prisma.sql`(cv.unread_count > 0)::int`;
  let keyset = Prisma.empty;
  if (after) keyset = byUnread ? Prisma.sql`AND (${flag}, cv.last_message_at, cv.id) < (${after.u}, ${after.at}, ${after.id}::uuid)` : Prisma.sql`AND (cv.last_message_at, cv.id) < (${after.at}, ${after.id}::uuid)`;
  const order = byUnread ? Prisma.sql`${flag} DESC, cv.last_message_at DESC, cv.id DESC` : Prisma.sql`cv.last_message_at DESC, cv.id DESC`;
  const rows = await tx.$queryRaw<{ id: string; at: Date; u: number }[]>`
    SELECT cv.id, cv.last_message_at AS at, ${flag} AS u FROM conversation cv
    WHERE ${where(authz, f, now)} ${keyset}
    ORDER BY ${order} LIMIT ${limit + 1}`;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { ids: page.map((r) => r.id), next: rows.length > limit && last ? encodeCursor(last.at, last.id, byUnread ? Number(last.u) : 0) : null };
}

export interface FolderCounts {
  all: number;
  mine: number;
  unread: number;
  ai_running: number;
  ai_pending_approval: number;
  needs_human: number;
  vip: number;
  complaint: number;
  team: number;
  mention: number;
  byChannel: Record<string, number>;
}

/**
 * Đếm các thư mục trong scope người xem (một lần quét các hội thoại đang hiện), CÙNG bộ lọc kênh / tài khoản / thẻ / tìm kiếm của danh
 * sách (TIP-025b §B.4); đếm theo kênh bỏ điều kiện kênh của chính nó (chip kênh hiện số của từng kênh dưới các bộ lọc còn lại).
 */
export async function folderCounts(tx: TenantTx, authz: AuthzContext, now: Date, f: ConvFilter = {}): Promise<FolderCounts> {
  const me = authz.userId;
  const [r] = await tx.$queryRaw<Record<string, bigint>[]>`
    SELECT count(*) AS all,
      count(*) FILTER (WHERE cv.assignee_user_id = ${me}::uuid) AS mine,
      count(*) FILTER (WHERE cv.unread_count > 0) AS unread,
      count(*) FILTER (WHERE cv.ai_state = 'running') AS ai_running,
      count(*) FILTER (WHERE cv.ai_state = 'waiting_approval') AS ai_pending_approval,
      count(*) FILTER (WHERE cv.ai_state = 'handoff') AS needs_human,
      count(*) FILTER (WHERE ${tagged('vip')}) AS vip,
      count(*) FILTER (WHERE ${tagged('khieu nai')}) AS complaint,
      count(*) FILTER (WHERE cv.assignee_user_id IS NOT NULL AND cv.assignee_user_id <> ${me}::uuid) AS team,
      count(*) FILTER (WHERE ${mentioned(me)}) AS mention
    FROM conversation cv WHERE ${convScopeSql(authz)} AND ${live(now)} ${andAll(filterParts(f, true))}`;
  const ch = await tx.$queryRaw<{ t: string; n: bigint }[]>`
    SELECT cv.channel_type AS t, count(*) AS n FROM conversation cv WHERE ${convScopeSql(authz)} AND ${live(now)} ${andAll(filterParts(f, false))} GROUP BY cv.channel_type`;
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    all: n('all'),
    mine: n('mine'),
    unread: n('unread'),
    ai_running: n('ai_running'),
    ai_pending_approval: n('ai_pending_approval'),
    needs_human: n('needs_human'),
    vip: n('vip'),
    complaint: n('complaint'),
    team: n('team'),
    mention: n('mention'),
    byChannel: Object.fromEntries(ch.map((x) => [x.t, Number(x.n)])),
  };
}
