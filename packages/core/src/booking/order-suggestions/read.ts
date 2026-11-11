// Đọc gợi ý tạo đơn hiện hành (TIP-033c §1, §4): một lịch (`appointment_id`, khoá chính) hoặc các lịch của MỘT hội thoại người xem thấy
// (`conversation_id`) — chỉ lịch gắn đúng hội thoại đó VÀ thuộc họ khách hiện tại của hội thoại (không đoán theo tên / SĐT). Danh sách lọc
// id trước (scope + điều kiện đủ trước LIMIT, index một phần `appointment_order_suggest_idx`), rồi mới nạp payload cho đúng N id. Cùng một
// bộ đọc cho action, Lịch, Hộp thư và Trợ lý — không có điều kiện riêng phía UI. Không ghi gì, không gọi model.
import { createHash } from 'node:crypto';
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, quoteTotals, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { bookingScopeSql, inBookingScope, UUID } from '../booking-access';
import { visibleConversation } from '../../inbox/public';
import { familyIdsSql } from '../../crm/lifecycle/family-sql';
import { canCreateOrder, canSeeSuggestion, ineligible, liveRoot, type ServiceRow, type SuggestionSource } from './authority';

export interface SuggestionCard {
  appointment_id: string;
  code: string;
  /** Phiên bản đọc: version lịch · version dịch vụ · thế hệ khách — đổi → thẻ cũ không còn khớp (xem trước lại). */
  revision: string;
  conversation_id: string | null;
  service_id: string;
  service_name: string;
  start_at: string;
  end_at: string;
  unit_price: string;
  tax_rate: number;
  tax_total: string;
  total: string;
  can_create: boolean;
}
export interface SuggestionPage {
  data: SuggestionCard[];
  next_cursor: string | null;
}
export type SuggestionQuery = { appointment_id: string } | { conversation_id: string; limit?: number; cursor?: string };

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 20;

const NF = (k: string) => new AppError('NOT_FOUND', 404, { [k]: 'not_found' });
const SVC = { id: true, name: true, price: true, taxRate: true, version: true, status: true, deletedAt: true } as const;

/** Con trỏ gắn người xem + bộ lọc (hội thoại): đổi người / hội thoại → con trỏ cũ bị từ chối, không trượt sang tập khác. */
const bindOf = (authz: AuthzContext, conversationId: string) => createHash('sha256').update(`${authz.userId}|${conversationId}`).digest('base64url').slice(0, 16);
export const encodeCursor = (b: string, endAt: Date, id: string) => Buffer.from(`${b}|${endAt.toISOString()}|${id}`).toString('base64url');
function decodeCursor(b: string, c: string): { endAt: Date; id: string } {
  const [bind, at, id] = Buffer.from(c, 'base64url').toString().split('|');
  const endAt = new Date(at ?? '');
  if (bind !== b || !id || !UUID.test(id) || Number.isNaN(endAt.getTime())) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { endAt, id };
}

/** Thẻ của một lịch (đã nạp) — null khi không đủ điều kiện / người xem không được thấy giá hoặc lịch. */
export async function cardOf(tx: TenantTx, authz: AuthzContext, a: SuggestionSource, svc: ServiceRow | null): Promise<SuggestionCard | null> {
  if (ineligible(a, svc) || !svc || !(await canSeeSuggestion(tx, authz, a))) return null;
  const root = await liveRoot(tx, a.contactId);
  if (!root) return null;
  const t = quoteTotals([{ qty: 1, unit_price: String(svc.price), tax_rate: svc.taxRate }]);
  return {
    appointment_id: a.id,
    code: a.code,
    revision: `${a.version}.${svc.version}.${root.lifecycle}`,
    conversation_id: a.conversationId,
    service_id: svc.id,
    service_name: svc.name,
    start_at: a.startAt.toISOString(),
    end_at: a.endAt.toISOString(),
    unit_price: String(svc.price),
    tax_rate: svc.taxRate,
    tax_total: t.tax_total,
    total: t.total,
    can_create: await canCreateOrder(tx, authz, a),
  };
}

/** Gợi ý của một lịch: lịch lạ / ngoài scope booking → 404 đồng nhất; đủ điều kiện mà không thấy giá → danh sách rỗng. */
async function one(tx: TenantTx, authz: AuthzContext, id: string): Promise<SuggestionPage> {
  const a = UUID.test(id) ? await tx.appointment.findUnique({ where: { id } }) : null;
  if (!a || a.deletedAt || !(await inBookingScope(tx, authz, { owner: a.ownerUserId, team: a.teamId, contact: a.contactId }))) throw NF('appointment_id');
  const card = await cardOf(tx, authz, a, await tx.product.findUnique({ where: { id: a.serviceId }, select: SVC }));
  return { data: card ? [card] : [], next_cursor: null };
}

/** Gợi ý theo hội thoại: id trước (scope + điều kiện đủ + họ khách) theo `end_at DESC, id DESC`, LIMIT n+1; rồi nạp payload. */
async function byConversation(tx: TenantTx, authz: AuthzContext, q: { conversation_id: string; limit?: number; cursor?: string }): Promise<SuggestionPage> {
  const conv = await visibleConversation(tx, authz, q.conversation_id);
  const limit = Math.min(Math.max(q.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const b = bindOf(authz, conv.id);
  const after = q.cursor ? decodeCursor(b, q.cursor) : null;
  if (!conv.contactId) return { data: [], next_cursor: null };
  const root = await liveRoot(tx, conv.contactId);
  if (!root) return { data: [], next_cursor: null };
  const ids = await tx.$queryRaw<{ id: string; end_at: Date }[]>(Prisma.sql`
    SELECT a.id, a.end_at FROM appointment a
    WHERE a.conversation_id = ${conv.id}::uuid AND a.status = 'done' AND a.package_id IS NULL AND a.order_id IS NULL AND a.deleted_at IS NULL
      AND a.contact_id IN ${familyIdsSql(root.id)}
      AND ${bookingScopeSql(authz)}
      AND EXISTS (SELECT 1 FROM product p WHERE p.id = a.service_id AND p.status = 'active' AND p.deleted_at IS NULL)
      ${after ? Prisma.sql`AND (a.end_at, a.id) < (${after.endAt}, ${after.id}::uuid)` : Prisma.empty}
    ORDER BY a.end_at DESC, a.id DESC
    LIMIT ${limit + 1}`);
  const page = ids.slice(0, limit);
  const rows = new Map((await tx.appointment.findMany({ where: { id: { in: page.map((r) => r.id) } } })).map((r) => [r.id, r]));
  const svcs = new Map((await tx.product.findMany({ where: { id: { in: [...new Set([...rows.values()].map((r) => r.serviceId))] } }, select: SVC })).map((s) => [s.id, s]));
  const data: SuggestionCard[] = [];
  for (const r of page) {
    const a = rows.get(r.id);
    const card = a ? await cardOf(tx, authz, a, svcs.get(a.serviceId) ?? null) : null;
    if (card) data.push(card);
  }
  const last = page.at(-1);
  return { data, next_cursor: ids.length > limit && last ? encodeCursor(b, last.end_at, last.id) : null };
}

export function readSuggestions(tx: TenantTx, authz: AuthzContext, q: SuggestionQuery): Promise<SuggestionPage> {
  return 'appointment_id' in q ? one(tx, authz, q.appointment_id) : byConversation(tx, authz, q);
}
