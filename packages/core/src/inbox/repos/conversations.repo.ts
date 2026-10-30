// Danh sách hội thoại (indexing §3–7): bước 1 lấy `id` theo index (scope + thư mục + lọc, keyset `(last_message_at, id) DESC`
// — không OFFSET: Hộp thư cuộn vô hạn, cursor ổn định khi có tin mới); bước 2 nạp đủ cột theo PK (deferred join).
// Đếm thư mục (`/conversations/counts`) một truy vấn `count(*) FILTER` trong scope người xem.
import { TenantSql as Prisma } from '@appchat/db';
import { foldText, type AuthzContext, type InboxFolder } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, convScopeSql } from '../services/access';

export interface ConvFilter {
  folder?: InboxFolder;
  channel?: string;
  channelAccountId?: string;
  tagId?: string;
  q?: string;
}

/** Hội thoại đang hiện ở hộp thư: chưa lưu trữ, không ẩn, không đóng, không đang tạm ẩn. */
const live = (now: Date) =>
  Prisma.sql`cv.archived_at IS NULL AND cv.hidden_at IS NULL AND cv.status <> 'closed' AND (cv.status <> 'snoozed' OR cv.snoozed_until IS NULL OR cv.snoozed_until <= ${now})`;

/** Thẻ hệ thống theo tên (thư mục "VIP", "Khiếu nại" của tab trên) — so không dấu. */
const tagged = (name: string) =>
  Prisma.sql`EXISTS (SELECT 1 FROM conversation_tag ct JOIN tag t ON t.id = ct.tag_id WHERE ct.conversation_id = cv.id AND f_unaccent(lower(t.name)) = ${name})`;

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
  const parts: Prisma.Sql[] = [convScopeSql(authz), folderSql(authz, f.folder ?? 'all', now)];
  if (f.channel) parts.push(Prisma.sql`cv.channel_type = ${f.channel}`);
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
  return Prisma.join(parts, ' AND ');
}

/** Cursor = `<iso last_message_at>_<id>` (base64url). */
export const encodeCursor = (at: Date, id: string) => Buffer.from(`${at.toISOString()}_${id}`).toString('base64url');
function decodeCursor(c: string | undefined): { at: Date; id: string } | null {
  if (!c) return null;
  const [iso, id] = Buffer.from(c, 'base64url').toString().split('_');
  const at = new Date(iso ?? '');
  return id && UUID.test(id) && !Number.isNaN(at.getTime()) ? { at, id } : null;
}

export async function listConversationIds(tx: TenantTx, authz: AuthzContext, f: ConvFilter, now: Date, cursor: string | undefined, limit: number) {
  const after = decodeCursor(cursor);
  const keyset = after ? Prisma.sql`AND (cv.last_message_at, cv.id) < (${after.at}, ${after.id}::uuid)` : Prisma.empty;
  const rows = await tx.$queryRaw<{ id: string; at: Date }[]>`
    SELECT cv.id, cv.last_message_at AS at FROM conversation cv
    WHERE ${where(authz, f, now)} ${keyset}
    ORDER BY cv.last_message_at DESC, cv.id DESC LIMIT ${limit + 1}`;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { ids: page.map((r) => r.id), next: rows.length > limit && last ? encodeCursor(last.at, last.id) : null };
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
  byChannel: Record<string, number>;
}

/** Đếm các thư mục trong scope người xem (một lần quét các hội thoại đang hiện). */
export async function folderCounts(tx: TenantTx, authz: AuthzContext, now: Date): Promise<FolderCounts> {
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
      count(*) FILTER (WHERE cv.assignee_user_id IS NOT NULL AND cv.assignee_user_id <> ${me}::uuid) AS team
    FROM conversation cv WHERE ${convScopeSql(authz)} AND ${live(now)}`;
  const ch = await tx.$queryRaw<{ t: string; n: bigint }[]>`
    SELECT cv.channel_type AS t, count(*) AS n FROM conversation cv WHERE ${convScopeSql(authz)} AND ${live(now)} GROUP BY cv.channel_type`;
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
    byChannel: Object.fromEntries(ch.map((x) => [x.t, Number(x.n)])),
  };
}
