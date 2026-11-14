// Trình duyệt phiên Trợ lý (REQ-E10a, TIP-023c G2.8a): phiên chưa lưu trữ của CHÍNH người gọi, mới nhất trước, phân trang keyset
// `(last_message_at, id)` — index `assistant_session_user_recent_idx` (user_id, last_message_at DESC) INCLUDE (title, mode) WHERE
// archived_at IS NULL; `q` tìm không dấu theo tiêu đề qua expression index trigram `assistant_session_title_trgm_idx`.
// Cursor là vị trí (thời điểm + id), không phải offset — phiên mới chen vào đầu không làm trùng / sót dòng ở trang sau.
import { TenantSql, type TenantDb } from '@appchat/db';
import { AppError, foldText, type AssistantSessionDto } from '@appchat/shared';

type Db = Pick<TenantDb, '$queryRaw'>;
type Row = { id: string; title: string; mode: 'chat' | 'cowork'; last_message_at: Date };

export const SESSIONS_PAGE = 30;
const PAGE_MAX = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeSessionCursor = (r: Pick<Row, 'id' | 'last_message_at'>) => Buffer.from(`${r.last_message_at.toISOString()}|${r.id}`).toString('base64url');

/** Cursor hỏng → 422 (không lặng lẽ về trang đầu). */
export function decodeSessionCursor(cursor: string): { at: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const at = new Date(iso ?? '');
  if (!id || !UUID.test(id) || Number.isNaN(at.getTime())) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { at, id };
}

export async function listSessionsPage(db: Db, userId: string, opts: { q?: string; cursor?: string; limit?: number } = {}): Promise<{ data: AssistantSessionDto[]; next_cursor: string | null }> {
  const take = Math.min(Math.max(opts.limit ?? SESSIONS_PAGE, 1), PAGE_MAX);
  const term = foldText(opts.q ?? '').slice(0, 100);
  const after = opts.cursor ? decodeSessionCursor(opts.cursor) : null;
  const search = term ? TenantSql.sql`AND f_unaccent(lower(title)) LIKE ${`%${term.replace(/[%_\\]/g, '\\$&')}%`}` : TenantSql.empty;
  const keyset = after ? TenantSql.sql`AND (last_message_at, id) < (${after.at}::timestamptz, ${after.id}::uuid)` : TenantSql.empty;
  const rows = await db.$queryRaw<Row[]>(TenantSql.sql`
    SELECT id, title, mode, last_message_at FROM assistant_session
    WHERE user_id = ${userId}::uuid AND archived_at IS NULL ${search} ${keyset}
    ORDER BY last_message_at DESC, id DESC LIMIT ${take + 1}`);
  const page = rows.slice(0, take);
  return {
    data: page.map((s) => ({ id: s.id, title: s.title, mode: s.mode, last_message_at: s.last_message_at.toISOString() })),
    next_cursor: rows.length > take ? encodeSessionCursor(page.at(-1)!) : null,
  };
}
