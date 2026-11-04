// Đọc / khoá đề xuất tri thức (TIP-043). Danh sách theo trạng thái: chọn id bằng `kb_suggestion_status_created_cover_idx` (status,
// created_at DESC, id DESC) rồi JOIN lấy hỏi–đáp (deferred join), cursor (created_at, id) ổn định khi trùng thời điểm, limit ≤ 100.
// Liên kết hội thoại gốc chỉ trả khi người xem thấy được hội thoại theo scope inbox (kb.manage không tự cấp inbox).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, KB_SUGGESTION_LIMITS, can, type AuthzContext, type KbSuggestionDto } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { canSeeConversation } from '../../../inbox/services/access';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';
type Db = Pick<TenantTx, '$queryRaw' | 'kbSuggestion' | 'kbSource' | 'conversation' | 'contact' | 'contactCollaborator'>;

interface Row {
  id: string;
  conversation_id: string;
  question: string;
  answer: string;
  source_message_ids: string[];
  status: SuggestionStatus;
  edited: boolean;
  version: number;
  created_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  reject_reason: string | null;
  kb_source_id: string | null;
  source_status: KbSuggestionDto['source_status'];
}

export const encodeCursor = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
export function decodeCursor(c: string): { at: Date; id: string } {
  const [at, id] = Buffer.from(c, 'base64url').toString().split('|');
  const d = new Date(at ?? '');
  if (!id || Number.isNaN(d.getTime()) || !UUID.test(id)) throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
  return { at: d, id };
}

const SELECT = Prisma.sql`s.id, s.conversation_id, s.question, s.answer, s.source_message_ids, s.status::text AS status, s.edited, s.version,
  s.created_at, s.reviewed_at, s.reviewed_by, s.reject_reason, s.kb_source_id, k.status::text AS source_status`;

export async function pageIds(db: Pick<TenantTx, '$queryRaw'>, status: SuggestionStatus, limit: number, cursor?: { at: Date; id: string }): Promise<Row[]> {
  const after = cursor ? Prisma.sql`AND (created_at, id) < (${cursor.at}, ${cursor.id}::uuid)` : Prisma.empty;
  return db.$queryRaw<Row[]>`
    SELECT ${SELECT}
    FROM (SELECT id FROM kb_suggestion WHERE status = ${status}::kb_suggestion_status ${after} ORDER BY created_at DESC, id DESC LIMIT ${limit}) p
    JOIN kb_suggestion s ON s.id = p.id
    LEFT JOIN kb_source k ON k.id = s.kb_source_id
    ORDER BY s.created_at DESC, s.id DESC`;
}

async function linkOf(db: Db, authz: AuthzContext, r: Row) {
  if (!can(authz, 'inbox.view')) return { conversation_id: null, source_message_ids: [] };
  const c = await db.conversation.findUnique({ where: { id: r.conversation_id }, select: { id: true, contactId: true, assigneeUserId: true } });
  return c && (await canSeeConversation(db, authz, c)) ? { conversation_id: c.id, source_message_ids: r.source_message_ids } : { conversation_id: null, source_message_ids: [] };
}

export async function toDto(db: Db, authz: AuthzContext, r: Row, names: Map<string, string>): Promise<KbSuggestionDto> {
  return {
    id: r.id,
    question: r.question,
    answer: r.answer,
    status: r.status,
    edited: r.edited,
    version: r.version,
    created_at: r.created_at.toISOString(),
    reviewed_at: r.reviewed_at?.toISOString() ?? null,
    reviewed_by_name: r.reviewed_by ? (names.get(r.reviewed_by) ?? null) : null,
    reject_reason: r.reject_reason,
    kb_source_id: r.kb_source_id,
    source_status: r.source_status,
    ...(await linkOf(db, authz, r)),
  };
}

export async function listSuggestions(
  db: Db,
  authz: AuthzContext,
  f: { status: SuggestionStatus; limit?: number; cursor?: string },
  names: (ids: string[]) => Promise<Map<string, string>>,
) {
  const limit = Math.min(Math.max(f.limit ?? 20, 1), KB_SUGGESTION_LIMITS.page);
  const rows = await pageIds(db, f.status, limit + 1, f.cursor ? decodeCursor(f.cursor) : undefined);
  const page = rows.slice(0, limit);
  const who = await names([...new Set(page.map((r) => r.reviewed_by).filter((x): x is string => !!x))]);
  const data = [];
  for (const r of page) data.push(await toDto(db, authz, r, who));
  const last = page[page.length - 1];
  const pending = await db.kbSuggestion.count({ where: { status: 'pending' } });
  return { data, next_cursor: rows.length > limit && last ? encodeCursor(last.created_at, last.id) : null, meta: { pending } };
}

export async function getSuggestion(db: Db, authz: AuthzContext, id: string, names: (ids: string[]) => Promise<Map<string, string>>) {
  const rows = UUID.test(id) ? await db.$queryRaw<Row[]>`SELECT ${SELECT} FROM kb_suggestion s LEFT JOIN kb_source k ON k.id = s.kb_source_id WHERE s.id = ${id}::uuid` : [];
  const r = rows[0];
  if (!r) throw new AppError('NOT_FOUND', 404, { suggestion_id: 'not_found' });
  return toDto(db, authz, r, await names(r.reviewed_by ? [r.reviewed_by] : []));
}

/** Khoá dòng + CAS: id lạ → 404, không còn pending → CONFLICT (đã duyệt / từ chối), version lệch → STALE_VERSION. */
export async function lockPending(tx: TenantTx, id: string, ifVersion: number) {
  if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { suggestion_id: 'not_found' });
  await tx.$queryRaw`SELECT 1 FROM kb_suggestion WHERE id = ${id}::uuid FOR UPDATE`;
  const s = await tx.kbSuggestion.findUnique({ where: { id } });
  if (!s) throw new AppError('NOT_FOUND', 404, { suggestion_id: 'not_found' });
  if (s.status !== 'pending') throw new AppError('CONFLICT', 409, { suggestion_id: s.status, ...(s.kbSourceId ? { kb_source_id: s.kbSourceId } : {}) });
  if (s.version !== ifVersion) throw new AppError('STALE_VERSION', 409, { version: String(s.version) });
  return s;
}

/** Ngữ cảnh che PII của hội thoại: tên / địa chỉ khách trong hồ sơ + tên người gửi phía khách. */
export async function piiContext(tx: Pick<TenantTx, 'conversation' | 'contact' | 'message'>, conversationId: string, locale?: string) {
  const c = await tx.conversation.findUnique({ where: { id: conversationId }, select: { contactId: true } });
  const k = c?.contactId ? await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true, address: true } }) : null;
  const senders = await tx.message.findMany({ where: { conversationId, senderType: 'contact', senderName: { not: null } }, select: { senderName: true }, distinct: ['senderName'], take: 5 });
  return { names: [k?.name, ...senders.map((m) => m.senderName)], addresses: [k?.address], ...(locale ? { locale } : {}) };
}
