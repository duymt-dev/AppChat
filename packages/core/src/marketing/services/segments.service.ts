// Phân khúc + tập người nhận (TIP-037, REQ-I01 / I03, Blueprint §2.2 segment.filter): biên dịch AST ĐÓNG (shared segment-filter, đã
// validate) → điều kiện SQL tham số hoá trên alias `c` (contact) — trường / toán tử là hằng của bảng dưới, giá trị qua tham số; ngày tương
// đối tính từ Clock server. Tập người nhận = (phân khúc ∪ khách chọn tay ∪ lô nhập) ∩ scope CRM người gọi, khử trùng theo id khách (một
// khách chỉ đếm một lần). "Gửi được" loại khách đã huỷ nhận tin, không có kênh nhận trên kênh chiến dịch, đã được chiến dịch khác chạm
// trong 48 giờ. Đọc thuần — không ghi log nghiệp vụ.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, CAMPAIGN_ACCOUNT_TYPE, CAMPAIGN_COOLDOWN_HOURS, segmentFilterSchema, type AuthzContext, type CampaignChannel, type SegmentLeaf, type SegmentNode } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { crmScopeSql } from '../../crm/public';

type Db = Pick<TenantTx, '$queryRaw' | 'segment'>;
const DAY_MS = 86_400_000;

const tagExists = (names: string[]) =>
  Prisma.sql`EXISTS (SELECT 1 FROM contact_tag ct JOIN tag t ON t.id = ct.tag_id WHERE ct.contact_id = c.id AND t.name = ANY(${names}::text[]))`;
const liveOrders = Prisma.sql`o.contact_id = c.id AND o.deleted_at IS NULL AND o.status <> 'cancelled'`;
const inList = (col: Prisma.Sql, v: string[], neg: boolean, nullable: boolean) =>
  neg ? (nullable ? Prisma.sql`(${col} IS NULL OR NOT (${col} = ANY(${v}::text[])))` : Prisma.sql`NOT (${col} = ANY(${v}::text[]))`) : Prisma.sql`${col} = ANY(${v}::text[])`;

function leaf(n: SegmentLeaf, now: Date): Prisma.Sql {
  switch (n.field) {
    case 'tag':
      if (n.op === 'has_any') return tagExists(n.value);
      if (n.op === 'has_none') return Prisma.sql`NOT ${tagExists(n.value)}`;
      return Prisma.join(n.value.map((v) => tagExists([v])), ' AND ');
    case 'stage':
      return inList(Prisma.raw('c.stage::text'), n.value, n.op === 'not_in', false);
    case 'group':
      return inList(Prisma.raw('c."group"::text'), n.value, n.op === 'not_in', true);
    case 'source':
      return inList(Prisma.raw('c.source'), n.value, n.op === 'not_in', false);
    case 'tier':
      return inList(Prisma.raw('c.tier_key'), n.value, n.op === 'not_in', true);
    case 'total_spent':
      if (n.op === 'gte') return Prisma.sql`c.total_spent >= ${BigInt(n.value)}`;
      if (n.op === 'lte') return Prisma.sql`c.total_spent <= ${BigInt(n.value)}`;
      return Prisma.sql`c.total_spent BETWEEN ${BigInt(n.value)} AND ${BigInt(n.value2 ?? n.value)}`;
    case 'order_count': {
      const cnt = Prisma.sql`(SELECT count(*) FROM "order" o WHERE ${liveOrders})`;
      return n.op === 'gte' ? Prisma.sql`${cnt} >= ${n.value}` : Prisma.sql`${cnt} <= ${n.value}`;
    }
    case 'purchased_product': {
      const ids = n.value.filter((v) => UUID.test(v));
      const any = Prisma.sql`EXISTS (SELECT 1 FROM "order" o JOIN order_item oi ON oi.order_id = o.id WHERE ${liveOrders} AND oi.product_id = ANY(${ids}::uuid[]))`;
      return n.op === 'any_of' ? any : Prisma.sql`NOT ${any}`;
    }
    case 'last_order_at':
    case 'last_interaction_at': {
      const col = Prisma.raw(n.field === 'last_order_at' ? 'c.last_order_at' : 'c.last_interaction_at');
      if (n.op === 'never') return Prisma.sql`${col} IS NULL`;
      if (n.op === 'older_than_days') return Prisma.sql`${col} < ${new Date(now.getTime() - n.value * DAY_MS)}`;
      if (n.op === 'within_days') return Prisma.sql`${col} >= ${new Date(now.getTime() - n.value * DAY_MS)}`;
      const at = new Date(`${n.value}T00:00:00Z`);
      return n.op === 'before' ? Prisma.sql`${col} < ${at}` : Prisma.sql`${col} >= ${at}`;
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function segmentSql(n: SegmentNode, now: Date): Prisma.Sql {
  if (!('children' in n)) return Prisma.sql`(${leaf(n, now)})`;
  return Prisma.sql`(${Prisma.join(n.children.map((c) => segmentSql(c, now)), n.op === 'and' ? ' AND ' : ' OR ')})`;
}

/** Bộ lọc đã lưu đọc lại từ DB vẫn kiểm schema (bản ghi cũ / sửa tay) — sai thì 422, không chạy SQL lạ. */
export function parseFilter(raw: unknown): SegmentNode {
  const r = segmentFilterSchema.safeParse(raw);
  if (!r.success) throw new AppError('VALIDATION_FAILED', 422, { filter: 'invalid' });
  return r.data;
}

export interface AudienceSpec {
  segmentIds?: string[];
  filter?: SegmentNode;
  contactIds?: string[];
  /** Khách đã lưu cho chiến dịch (chọn tay + lô nhập) — `campaign_audience`. */
  campaignId?: string;
}

/** Bộ lọc của các phân khúc còn sống; thiếu / đã xoá → 422 (không âm thầm bỏ phân khúc). */
export async function segmentFilters(tx: Db, ids: string[]): Promise<SegmentNode[]> {
  if (!ids.length) return [];
  const rows = await tx.segment.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, filter: true } });
  if (rows.length !== new Set(ids).size) throw new AppError('VALIDATION_FAILED', 422, { segment_ids: 'not_found' });
  return rows.map((r) => parseFilter(r.filter));
}

/** Điều kiện "thuộc tập người nhận" trên alias `c` (OR các nguồn) — rỗng → FALSE. */
async function audienceSql(tx: Db, a: AudienceSpec, now: Date): Promise<Prisma.Sql> {
  const or: Prisma.Sql[] = [];
  for (const f of await segmentFilters(tx, a.segmentIds ?? [])) or.push(segmentSql(f, now));
  if (a.filter) or.push(segmentSql(a.filter, now));
  const ids = (a.contactIds ?? []).filter((x) => UUID.test(x));
  if (ids.length) or.push(Prisma.sql`c.id = ANY(${ids}::uuid[])`);
  if (a.campaignId) or.push(Prisma.sql`EXISTS (SELECT 1 FROM campaign_audience ca WHERE ca.campaign_id = ${a.campaignId}::uuid AND ca.contact_id = c.id)`);
  return or.length ? Prisma.sql`(${Prisma.join(or, ' OR ')})` : Prisma.sql`FALSE`;
}

/** Có kênh nhận trên kênh chiến dịch: Zalo = hội thoại 1-1 trên tài khoản Zalo còn sống; email = có địa chỉ. */
export function endpointSql(channel: CampaignChannel, accountId: string | null): Prisma.Sql {
  if (channel === 'email') return Prisma.sql`(c.email IS NOT NULL AND c.email <> '')`;
  const acc = accountId ? Prisma.sql`AND cv.channel_account_id = ${accountId}::uuid` : Prisma.empty;
  return Prisma.sql`EXISTS (SELECT 1 FROM conversation cv WHERE cv.contact_id = c.id AND cv.channel_type = ${CAMPAIGN_ACCOUNT_TYPE.zalo} AND cv.kind = 'direct' AND cv.archived_at IS NULL ${acc})`;
}

/** Khách vừa được chiến dịch KHÁC chạm trong 48 giờ (khoá chung mọi chiến dịch). */
export const cooldownSql = (now: Date, exceptCampaign: string | null = null) =>
  Prisma.sql`EXISTS (SELECT 1 FROM campaign_contact_touch tt WHERE tt.contact_id = c.id AND tt.touched_at > ${new Date(now.getTime() - CAMPAIGN_COOLDOWN_HOURS * 3_600_000)} ${exceptCampaign ? Prisma.sql`AND tt.campaign_id <> ${exceptCampaign}::uuid` : Prisma.empty})`;

/** Đếm tập người nhận (đã khử trùng) + số gửi được — trong scope CRM của người gọi. */
export async function countAudience(tx: Db, authz: AuthzContext, a: AudienceSpec, channel: CampaignChannel | null, now: Date): Promise<{ count: number; reachable: number }> {
  const where = Prisma.sql`c.deleted_at IS NULL AND ${crmScopeSql(authz)} AND ${await audienceSql(tx, a, now)}`;
  const reach = channel ? Prisma.sql`NOT c.marketing_opt_out AND ${endpointSql(channel, null)} AND NOT ${cooldownSql(now)}` : Prisma.sql`NOT c.marketing_opt_out AND NOT ${cooldownSql(now)}`;
  const rows = await tx.$queryRaw<{ count: bigint; reachable: bigint }[]>`
    SELECT count(*)::bigint AS count, count(*) FILTER (WHERE ${reach})::bigint AS reachable FROM contact c WHERE ${where}`;
  return { count: Number(rows[0]?.count ?? 0), reachable: Number(rows[0]?.reachable ?? 0) };
}

/** Id khách thuộc tập người nhận (đã khử trùng, thứ tự id) — snapshot lúc gửi duyệt. Giới hạn `max` để chặn tập vượt trần. */
export async function audienceIds(tx: Db, authz: AuthzContext, a: AudienceSpec, now: Date, max: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM contact c WHERE c.deleted_at IS NULL AND ${crmScopeSql(authz)} AND ${await audienceSql(tx, a, now)} ORDER BY c.id LIMIT ${max + 1}`;
  if (rows.length > max) throw new AppError('VALIDATION_FAILED', 422, { audience: `too_large:${max}` });
  return rows.map((r) => r.id);
}
