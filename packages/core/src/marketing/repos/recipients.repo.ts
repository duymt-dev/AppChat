// Người nhận chiến dịch (TIP-037): đếm số đo từ bằng chứng, nhận lô gửi kế tiếp có kiểm lại (huỷ nhận tin / xoá / 48 giờ) dưới khoá
// `campaign_contact_touch` (một dòng mỗi khách — hai chiến dịch chạy song song không cùng gửi một khách trong 48 giờ), giải phóng khoá khi
// lỗi chắc chắn chưa gửi, giữ khoá khi kết quả chưa rõ. Mọi truy vấn theo (campaign_id, status, id) — index campaign_recipient_status_idx.
import { CAMPAIGN_COOLDOWN_HOURS } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { emptyCounts, type RecipientCounts } from '../services/campaign-policy';

export type RecipientRow = NonNullable<Awaited<ReturnType<TenantTx['campaignRecipient']['findUnique']>>>;
type Raw = Pick<TenantTx, '$queryRaw' | '$executeRaw'>;

/** Đếm theo trạng thái cho nhiều chiến dịch một lần (danh sách) — không N+1. */
export async function countsFor(tx: Pick<TenantTx, '$queryRaw'>, ids: string[]): Promise<Map<string, RecipientCounts>> {
  const out = new Map<string, RecipientCounts>();
  if (!ids.length) return out;
  const rows = await tx.$queryRaw<{ campaign_id: string; status: string; unknown: bigint; read: bigint; n: bigint; revenue: bigint }[]>`
    SELECT campaign_id, status, count(*) FILTER (WHERE outcome = 'unknown')::bigint AS unknown, count(read_at)::bigint AS read,
           count(*)::bigint AS n, coalesce(sum(revenue), 0)::bigint AS revenue
    FROM campaign_recipient WHERE campaign_id = ANY(${ids}::uuid[]) GROUP BY campaign_id, status`;
  for (const r of rows) {
    const c = out.get(r.campaign_id) ?? emptyCounts();
    const n = Number(r.n);
    const unknown = Number(r.unknown);
    c.total += n;
    c.read += Number(r.read);
    c.revenue += BigInt(r.revenue);
    if (r.status === 'failed') {
      c.failed += n - unknown;
      c.unknown += unknown;
    } else if (r.status in c) (c as unknown as Record<string, number>)[r.status] = ((c as unknown as Record<string, number>)[r.status] ?? 0) + n;
    out.set(r.campaign_id, c);
  }
  return out;
}

export interface Claimed {
  id: string;
  contactId: string;
  conversationId: string | null;
  endpoint: string;
  variant: string;
}

/**
 * Nhận tối đa `limit` người nhận `pending` chưa nhận lô (khoá SKIP LOCKED — hai lượt quét không nhận trùng), kiểm lại từng người: khách đã
 * xoá / huỷ nhận tin → skipped; giành khoá 48 giờ (`campaign_contact_touch`): khách đã được chiến dịch khác chạm trong 48 giờ → skipped
 * cooldown. Người qua kiểm → `claimed_at` + fence. Trả danh sách để đẩy hàng đợi gửi sau commit.
 */
export async function claimBatch(tx: TenantTx, campaignId: string, limit: number, now: Date): Promise<{ claimed: Claimed[]; skipped: number }> {
  const rows = await tx.$queryRaw<{ id: string; contact_id: string; conversation_id: string | null; endpoint: string; variant: string; opt_out: boolean | null; deleted: boolean }[]>`
    SELECT r.id, r.contact_id, r.conversation_id, r.endpoint, r.variant, c.marketing_opt_out AS opt_out, (c.id IS NULL OR c.deleted_at IS NOT NULL) AS deleted
    FROM campaign_recipient r LEFT JOIN contact c ON c.id = r.contact_id
    WHERE r.campaign_id = ${campaignId}::uuid AND r.status = 'pending' AND r.claimed_at IS NULL
    ORDER BY r.id LIMIT ${limit} FOR UPDATE OF r SKIP LOCKED`;
  const claimed: Claimed[] = [];
  let skipped = 0;
  const cutoff = new Date(now.getTime() - CAMPAIGN_COOLDOWN_HOURS * 3_600_000);
  for (const r of rows) {
    const reason = r.deleted ? 'deleted' : r.opt_out ? 'opt_out' : (await takeTouch(tx, r.contact_id, campaignId, r.id, cutoff, now)) ? null : 'cooldown';
    if (reason) {
      await skip(tx, r.id, reason, now);
      skipped++;
      continue;
    }
    await tx.campaignRecipient.update({ where: { id: r.id }, data: { claimedAt: now, claimFence: { increment: 1 }, updatedAt: now } });
    claimed.push({ id: r.id, contactId: r.contact_id, conversationId: r.conversation_id, endpoint: r.endpoint, variant: r.variant });
  }
  return { claimed, skipped };
}

/** Giành khoá 48 giờ cho khách: chưa có / đã quá 48 giờ / của chính người nhận này → giành được. Một câu (ON CONFLICT) — không đua. */
async function takeTouch(tx: Raw, contactId: string, campaignId: string, recipientId: string, cutoff: Date, now: Date): Promise<boolean> {
  const n = await tx.$executeRaw`
    INSERT INTO campaign_contact_touch (contact_id, campaign_id, recipient_id, state, touched_at) VALUES (${contactId}::uuid, ${campaignId}::uuid, ${recipientId}::uuid, 'reserved', ${now})
    ON CONFLICT (contact_id) DO UPDATE SET campaign_id = EXCLUDED.campaign_id, recipient_id = EXCLUDED.recipient_id, state = 'reserved', touched_at = EXCLUDED.touched_at
    WHERE campaign_contact_touch.touched_at <= ${cutoff} OR campaign_contact_touch.recipient_id = EXCLUDED.recipient_id`;
  return n > 0;
}

export async function skip(tx: Pick<TenantTx, 'campaignRecipient'>, id: string, reason: string, now: Date) {
  await tx.campaignRecipient.update({ where: { id }, data: { status: 'skipped', skipReason: reason, updatedAt: now } });
}

/** Đã gửi (kênh nhận) → khoá 48 giờ tính từ lúc gửi. */
export async function touchSent(tx: Raw, recipientId: string, now: Date) {
  await tx.$executeRaw`UPDATE campaign_contact_touch SET state = 'sent', touched_at = ${now} WHERE recipient_id = ${recipientId}::uuid`;
}

/** Lỗi chắc chắn chưa tới khách / bị loại trước khi gửi → nhả khoá (chiến dịch khác gửi được). Kết quả chưa rõ: KHÔNG gọi. */
export async function releaseTouch(tx: Raw, recipientId: string) {
  await tx.$executeRaw`DELETE FROM campaign_contact_touch WHERE recipient_id = ${recipientId}::uuid AND state = 'reserved'`;
}

/** Người nhận đã nhận lô mà chưa có kết quả quá `staleMs` và chưa từng gọi kênh — đẩy lại hàng đợi (Redis mất / worker sập). */
export async function staleClaims(tx: Pick<TenantTx, '$queryRaw'>, campaignId: string, before: Date, limit: number): Promise<Claimed[]> {
  const rows = await tx.$queryRaw<{ id: string; contact_id: string; conversation_id: string | null; endpoint: string; variant: string }[]>`
    SELECT id, contact_id, conversation_id, endpoint, variant FROM campaign_recipient
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending' AND outcome IS NULL AND claimed_at IS NOT NULL AND claimed_at < ${before} AND send_state = 'none'
    ORDER BY claimed_at LIMIT ${limit}`;
  return rows.map((r) => ({ id: r.id, contactId: r.contact_id, conversationId: r.conversation_id, endpoint: r.endpoint, variant: r.variant }));
}

/** Còn người nhận chưa kết thúc (chưa nhận lô hoặc đang chờ kết quả). */
export async function hasOpen(tx: Pick<TenantTx, 'campaignRecipient'>, campaignId: string): Promise<boolean> {
  return !!(await tx.campaignRecipient.findFirst({ where: { campaignId, status: 'pending' }, select: { id: true } }));
}

/** Huỷ: người nhận chưa gọi kênh → skipped cancelled + nhả khoá; đang gọi kênh dở (reserved) giữ nguyên để kết quả về ghi đúng. */
export async function cancelPending(tx: TenantTx, campaignId: string, now: Date): Promise<number> {
  await tx.$executeRaw`
    DELETE FROM campaign_contact_touch t USING campaign_recipient r
    WHERE t.recipient_id = r.id AND r.campaign_id = ${campaignId}::uuid AND r.status = 'pending' AND r.send_state = 'none' AND t.state = 'reserved'`;
  return tx.$executeRaw`
    UPDATE campaign_recipient SET status = 'skipped', skip_reason = 'cancelled', updated_at = ${now}
    WHERE campaign_id = ${campaignId}::uuid AND status = 'pending' AND send_state = 'none'`;
}
