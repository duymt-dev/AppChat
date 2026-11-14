// Đọc cơ hội (TIP-026c §4.1): danh sách theo khách (keyset updated_at DESC, id DESC — deferred join qua PK), thẻ hiện hành 360°, chi tiết
// drawer (chuỗi chứng từ + lịch sử), tóm tắt cơ hội mở cho cả trang (cột Khách hàng / chip Hộp thư — MỘT truy vấn, không N+1). Tiền ẩn khi
// người xem thiếu quote.view: VẮNG + `amount_hidden` (không "0" giả). Quyền khách cha kiểm mỗi lần đọc (scope hiện tại); đọc theo HỌ khách.
import { AppError, can, forecastOf, OPPORTUNITY_PROBABILITY, opportunityRank, type AuthzContext, type OpenOpportunitySummaryDto, type OpportunityCardDto, type OpportunityDetailDto, type OpportunityItemDto, type OpportunityPageDto, type OpportunityStage } from '@appchat/shared';
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { bookingScopeSql } from '../../booking/booking-access';
import { quoteScopeSql } from '../../sales/quotes/quote-access';
import { canReadAmount, readableParent } from '../activities/authority';
import { decodeCursor, encodeCursor } from '../activities/repository';
import { inFamilySql } from '../lifecycle/family-sql';
import { UUID, scopeSql, visibleContact } from '../services/access';
import { opportunityChain } from './chain';
import { nextStepOf } from './next-step';
import type { OpportunityRecord } from './locks';

export interface OppReadCtx {
  authz: AuthzContext;
  names: (ids: string[]) => Promise<Map<string, string>>;
  now: Date;
}

const DEFAULT_LIMIT = 20;
const notFound = () => new AppError('NOT_FOUND', 404, { opportunity_id: 'not_found' });
const MAX_LIMIT = 50;
type Item = { productId: string | null; name: string; qty: number; opportunityId: string };

function itemDto(o: OpportunityRecord, items: Item[], names: Map<string, string>, a: AuthzContext): OpportunityItemDto {
  const money = canReadAmount(a)
    ? { amount_vnd: o.amountVnd === null ? null : String(o.amountVnd), forecast_vnd: forecastOf(o.amountVnd, o.stage) }
    : { amount_hidden: true };
  return {
    id: o.id,
    contact_id: o.contactId,
    title: o.title,
    need: o.need,
    ...money,
    stage: o.stage,
    probability: OPPORTUNITY_PROBABILITY[o.stage],
    expected_close_date: o.expectedCloseDate ? o.expectedCloseDate.toISOString().slice(0, 10) : null,
    owner: o.ownerUserId ? { id: o.ownerUserId, name: names.get(o.ownerUserId) ?? '' } : null,
    source_kind: o.sourceKind as OpportunityItemDto['source_kind'],
    lost_reason: (o.lostReason ?? null) as OpportunityItemDto['lost_reason'],
    items: items.filter((i) => i.opportunityId === o.id).map((i) => ({ product_id: i.productId, name: i.name, qty: i.qty })),
    closed_at: o.closedAt?.toISOString() ?? null,
    stage_changed_at: o.stageChangedAt.toISOString(),
    archived: !!o.archivedAt,
    updated_at: o.updatedAt.toISOString(),
    version: o.version,
  };
}

/** Nạp bản ghi theo id (giữ thứ tự) + sản phẩm + tên phụ trách một lần cho cả trang. */
export async function load(tx: TenantTx, ids: string[], c: OppReadCtx): Promise<OpportunityItemDto[]> {
  if (!ids.length) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const [rows, items] = await Promise.all([
    tx.contactOpportunity.findMany({ where: { id: { in: ids } } }),
    tx.contactOpportunityItem.findMany({ where: { opportunityId: { in: ids } }, orderBy: [{ opportunityId: 'asc' }, { position: 'asc' }] }),
  ]);
  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const names = await c.names(rows.map((r) => r.ownerUserId).filter((x): x is string => !!x));
  return rows.map((r) => itemDto(r, items, names, c.authz));
}

/** Danh sách cơ hội của khách (họ khách), chưa lưu trữ. Index contact_opportunity_contact_idx (contact_id, updated_at DESC, id DESC). */
export async function listForContact(tx: TenantTx, contactId: string, q: { cursor?: string; limit?: number }, c: OppReadCtx): Promise<OpportunityPageDto> {
  await readableParent(tx, c.authz, contactId);
  const limit = Math.min(Math.max(q.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cur = decodeCursor(q.cursor, 'opportunities');
  const after = cur ? Prisma.sql`AND (updated_at, id) < (${String(cur.v[0])}::timestamptz, ${cur.id}::uuid)` : Prisma.empty;
  const rows = await tx.$queryRaw<{ id: string; s1: string }[]>`SELECT id, updated_at::text AS s1 FROM contact_opportunity
    WHERE ${inFamilySql('contact_id', contactId)} AND archived_at IS NULL ${after}
    ORDER BY updated_at DESC, id DESC LIMIT ${limit + 1}`;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { items: await load(tx, page.map((r) => r.id), c), next_cursor: rows.length > limit && last ? encodeCursor({ k: 'opportunities', v: [last.s1, null], id: last.id }) : null };
}

/** Báo giá mới nhất + lịch hẹn sắp tới của cơ hội theo quyền người xem (thẻ + bước tiếp). */
async function refsOf(tx: TenantTx, a: AuthzContext, id: string, now: Date) {
  const [quote, appt] = await Promise.all([
    can(a, 'quote.view')
      ? tx.$queryRaw<{ id: string; code: string; status: string; viewed_at: Date | null }[]>`SELECT q.id, q.code, q.status::text AS status, q.viewed_at FROM quote q
          WHERE q.opportunity_id = ${id}::uuid AND q.deleted_at IS NULL AND ${quoteScopeSql(a)} ORDER BY q.created_at DESC, q.id DESC LIMIT 1`.then((r) => r[0] ?? null)
      : null,
    can(a, 'booking.view')
      ? tx.$queryRaw<{ code: string }[]>`SELECT a.code FROM appointment a WHERE a.opportunity_id = ${id}::uuid AND a.deleted_at IS NULL AND a.start_at >= ${now.toISOString()}::timestamptz
          AND a.status IN ('pending', 'confirmed') AND ${bookingScopeSql(a)} ORDER BY a.start_at ASC, a.id ASC LIMIT 1`.then((r) => r[0] ?? null)
      : null,
  ]);
  return { quote, appt };
}

/** Gợi ý AI còn hiệu lực: event `ai_suggested` mới nhất, sau lần đổi giai đoạn cuối, đích còn khác giai đoạn hiện tại. */
async function suggestionOf(tx: TenantTx, o: OpportunityRecord): Promise<OpportunityCardDto['suggestion']> {
  const s = await tx.contactOpportunityEvent.findFirst({ where: { opportunityId: o.id, kind: 'ai_suggested', createdAt: { gt: o.stageChangedAt } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  if (!s?.toStage || s.toStage === o.stage) return null;
  const reason = typeof (s.params as Record<string, unknown>)?.reason === 'string' ? String((s.params as Record<string, unknown>).reason) : 'ai';
  return { id: s.id, to_stage: s.toStage as OpportunityStage, reason_key: reason, created_at: s.createdAt.toISOString() };
}

async function cardOf(tx: TenantTx, id: string, c: OppReadCtx): Promise<OpportunityCardDto | null> {
  const [item] = await load(tx, [id], c);
  const o = await tx.contactOpportunity.findUnique({ where: { id } });
  if (!item || !o) return null;
  const { quote, appt } = await refsOf(tx, c.authz, id, c.now);
  const closed = o.stage === 'won' || o.stage === 'lost';
  return {
    ...item,
    quote: quote ? { id: quote.id, code: quote.code, status: quote.status, viewed_at: quote.viewed_at?.toISOString() ?? null } : null,
    next_step: closed ? null : nextStepOf({ stage: o.stage, quoteCode: quote?.code ?? null, appointmentCode: appt?.code ?? null }),
    suggestion: closed ? null : await suggestionOf(tx, o),
  };
}

/** Thẻ 360°: cơ hội mở cập nhật mới nhất, không có thì mới nhất đã đóng (badge thật). Không có cơ hội → null. */
export async function currentCard(tx: TenantTx, contactId: string, c: OppReadCtx): Promise<{ card: OpportunityCardDto | null; count: number }> {
  const fam = inFamilySql('contact_id', contactId);
  const [pick] = await tx.$queryRaw<{ id: string | null; n: number }[]>`
    SELECT (SELECT id FROM contact_opportunity WHERE ${fam} AND archived_at IS NULL
             ORDER BY (stage IN ('won', 'lost')) ASC, updated_at DESC, id DESC LIMIT 1) AS id,
           (SELECT count(*)::int FROM contact_opportunity WHERE ${fam} AND archived_at IS NULL) AS n`;
  return { card: pick?.id ? await cardOf(tx, pick.id, c) : null, count: pick?.n ?? 0 };
}

/** Drawer chi tiết (`contact_opportunity.get`, GET /v1/opportunities/:id): thẻ + chuỗi chứng từ + lịch sử. Ngoài scope → 404. */
export async function opportunityDetail(tx: TenantTx, id: string, c: OppReadCtx): Promise<OpportunityDetailDto> {
  const o = UUID.test(id) ? await tx.contactOpportunity.findUnique({ where: { id }, select: { contactId: true } }) : null;
  if (!o) throw notFound();
  const { writable } = await visibleContact(tx, c.authz, o.contactId).catch(() => {
    throw notFound();
  });
  const card = (await cardOf(tx, id, c))!;
  const [chain, events] = await Promise.all([
    opportunityChain(tx, c.authz, id),
    tx.contactOpportunityEvent.findMany({ where: { opportunityId: id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50 }),
  ]);
  const names = await c.names(events.filter((e) => e.actorType === 'user' && e.actorId).map((e) => e.actorId!));
  return {
    ...card,
    chain,
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      from_stage: e.fromStage,
      to_stage: e.toStage,
      ref: e.refType && e.refId ? { type: e.refType, id: e.refId } : null,
      params: (e.params ?? {}) as Record<string, unknown>,
      actor: { type: e.actorType, name: e.actorType === 'user' && e.actorId ? (names.get(e.actorId) ?? '') : '' },
      created_at: e.createdAt.toISOString(),
    })),
    can_edit: writable,
  };
}

/**
 * Tóm tắt cơ hội MỞ cho cả trang (cột "Cơ hội đang mở" / chip Hộp thư): MỘT truy vấn GROUP BY trên index partial
 * `contact_opportunity_open_idx (contact_id) INCLUDE (stage, amount_vnd)`. Gộp khách dời `contact_id` của cơ hội sang gốc (merge/relations)
 * nên khách sống đọc thẳng theo id. Tự áp crm.view + scope khách (chip Hộp thư: người trực hộp thư chưa chắc thấy khách) — không thấy → vắng.
 */
export async function openSummary(tx: Pick<TenantTx, '$queryRaw'>, a: AuthzContext, contactIds: readonly string[]): Promise<Map<string, OpenOpportunitySummaryDto>> {
  const ids = [...new Set(contactIds.filter((x) => UUID.test(x)))];
  const out = new Map<string, OpenOpportunitySummaryDto>();
  if (!ids.length || !can(a, 'crm.view')) return out;
  const rows = await tx.$queryRaw<{ contact_id: string; n: number; total: bigint | null; stages: OpportunityStage[] }[]>`
    SELECT o.contact_id, count(*)::int AS n, sum(o.amount_vnd) AS total, array_agg(DISTINCT o.stage::text) AS stages
      FROM contact_opportunity o JOIN contact c ON c.id = o.contact_id
     WHERE o.contact_id = ANY(${ids}::uuid[]) AND o.archived_at IS NULL AND o.stage NOT IN ('won', 'lost') AND c.deleted_at IS NULL AND ${scopeSql(a)}
     GROUP BY o.contact_id`;
  const money = canReadAmount(a);
  for (const r of rows) {
    const top = r.stages.reduce((best, s) => (opportunityRank(s) > opportunityRank(best) ? s : best), r.stages[0]!);
    out.set(r.contact_id, { count: r.n, top_stage: top, ...(money ? { amount_vnd: r.total === null ? null : String(r.total) } : { amount_hidden: true }) });
  }
  return out;
}
