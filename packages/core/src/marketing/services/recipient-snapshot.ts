// Snapshot người nhận lúc gửi duyệt (TIP-037, REQ-I03): tập (phân khúc ∪ chọn tay ∪ lô nhập) ∩ scope CRM của người gửi duyệt, khử trùng
// theo khách → một dòng `campaign_recipient` mỗi khách, kèm lý do loại tại thời điểm chụp (huỷ nhận tin / không có kênh nhận trên tài khoản
// gửi / chiến dịch khác đã chạm trong 48 giờ). Biến thể A/B 50/50 tất định (md5 chiến dịch + khách — cùng công thức `variantOf`). Băm
// snapshot (thứ tự id khách) chốt cùng bản duyệt: sau duyệt phân khúc có đổi thì tập người nhận vẫn giữ nguyên. Trước khi gửi từng người
// nhận vẫn kiểm lại (campaign-dispatch).
import { TenantSql as Prisma } from '@appchat/db';
import { CAMPAIGN_ACCOUNT_TYPE, CAMPAIGN_COOLDOWN_HOURS, type AuthzContext, type CampaignChannel, type SegmentNode } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { audienceIds } from './segments.service';

/** Trần người nhận một chiến dịch (snapshot một transaction). */
export const SNAPSHOT_MAX = 50_000;

export interface SnapshotInput {
  campaignId: string;
  channel: CampaignChannel;
  accountId: string;
  segmentIds: string[];
  /** Bộ lọc của gợi ý AI nguồn (chiến dịch tạo từ gợi ý). */
  filter?: SegmentNode;
  ab: boolean;
}

export interface Snapshot {
  total: number;
  eligible: number;
  hash: string;
}

/** Xoá snapshot cũ (gửi lại sau khi rút / bị từ chối) rồi chụp mới. Chỉ gọi khi chiến dịch chưa từng được duyệt. */
export async function takeSnapshot(tx: TenantTx, authz: AuthzContext, s: SnapshotInput, now: Date): Promise<Snapshot> {
  await tx.campaignRecipient.deleteMany({ where: { campaignId: s.campaignId } });
  const ids = await audienceIds(tx, authz, { segmentIds: s.segmentIds, campaignId: s.campaignId, filter: s.filter }, now, SNAPSHOT_MAX);
  if (!ids.length) return { total: 0, eligible: 0, hash: '' };
  const cutoff = new Date(now.getTime() - CAMPAIGN_COOLDOWN_HOURS * 3_600_000);
  const conv =
    s.channel === 'zalo'
      ? Prisma.sql`(SELECT cv.id FROM conversation cv WHERE cv.contact_id = c.id AND cv.channel_type = ${CAMPAIGN_ACCOUNT_TYPE.zalo} AND cv.kind = 'direct'
           AND cv.archived_at IS NULL AND cv.channel_account_id = ${s.accountId}::uuid ORDER BY cv.last_message_at DESC LIMIT 1)`
      : Prisma.sql`(SELECT cv.id FROM conversation cv WHERE cv.contact_id = c.id AND cv.channel_type = 'email' AND cv.kind = 'direct'
           AND cv.archived_at IS NULL AND cv.channel_account_id = ${s.accountId}::uuid ORDER BY cv.last_message_at DESC LIMIT 1)`;
  const endpoint = s.channel === 'email' ? Prisma.sql`lower(coalesce(c.email, ''))` : Prisma.sql`coalesce(nullif(c.zalo, ''), c.phone, '')`;
  const variant = s.ab ? Prisma.sql`CASE WHEN (('x' || substr(md5(${s.campaignId} || c.id::text), 1, 8))::bit(32)::int & 1) = 1 THEN 'b' ELSE 'a' END` : Prisma.sql`'a'`;
  await tx.$executeRaw`
    WITH src AS (
      SELECT c.id AS contact_id, c.marketing_opt_out AS opt_out, ${conv} AS conversation_id, ${endpoint} AS endpoint, ${variant} AS variant,
             EXISTS (SELECT 1 FROM campaign_contact_touch tt WHERE tt.contact_id = c.id AND tt.touched_at > ${cutoff} AND tt.campaign_id <> ${s.campaignId}::uuid) AS cooled
      FROM contact c WHERE c.id = ANY(${ids}::uuid[]) AND c.deleted_at IS NULL
    ), ins AS (SELECT gen_random_uuid() AS id, src.* FROM src)
    INSERT INTO campaign_recipient (id, campaign_id, contact_id, status, skip_reason, variant, conversation_id, endpoint, delivery_ref, created_at, updated_at)
    SELECT ins.id, ${s.campaignId}::uuid, ins.contact_id,
      CASE WHEN ins.opt_out OR ins.endpoint = '' OR (${s.channel} = 'zalo' AND ins.conversation_id IS NULL) OR ins.cooled THEN 'skipped' ELSE 'pending' END,
      CASE WHEN ins.opt_out THEN 'opt_out' WHEN ins.endpoint = '' OR (${s.channel} = 'zalo' AND ins.conversation_id IS NULL) THEN 'no_endpoint' WHEN ins.cooled THEN 'cooldown' END,
      ins.variant, ins.conversation_id, ins.endpoint, 'cr_' || ins.id::text, ${now}, ${now}
    FROM ins`;
  const r = await tx.$queryRaw<{ total: bigint; eligible: bigint; hash: string | null }[]>`
    SELECT count(*)::bigint AS total, count(*) FILTER (WHERE status = 'pending')::bigint AS eligible,
           md5(string_agg(contact_id::text || ':' || status || ':' || variant, ',' ORDER BY contact_id)) AS hash
    FROM campaign_recipient WHERE campaign_id = ${s.campaignId}::uuid`;
  return { total: Number(r[0]?.total ?? 0), eligible: Number(r[0]?.eligible ?? 0), hash: r[0]?.hash ?? '' };
}

/** Băm lại snapshot hiện có (bản duyệt so với lúc gửi duyệt — người nhận không đổi giữa hai bước). */
export async function snapshotHash(tx: Pick<TenantTx, '$queryRaw'>, campaignId: string): Promise<string> {
  const r = await tx.$queryRaw<{ hash: string | null }[]>`
    SELECT md5(string_agg(contact_id::text || ':' || status || ':' || variant, ',' ORDER BY contact_id)) AS hash FROM campaign_recipient WHERE campaign_id = ${campaignId}::uuid`;
  return r[0]?.hash ?? '';
}
