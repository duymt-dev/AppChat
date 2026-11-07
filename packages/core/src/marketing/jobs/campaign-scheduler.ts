// Quét chiến dịch tới hạn (TIP-037, ROLE=jobs): mỗi phút, mọi workspace đang hoạt động — chiến dịch đã duyệt / hẹn giờ đã tới / đang chạy
// (index campaign_due_idx) → action hệ thống campaign.dispatch (Executor — audit + outbox; lô 50 người nhận, khoá 48 giờ). Người nhận đã nhận
// lô quá 10 phút mà chưa gọi kênh (Redis mất / worker sập trước khi gửi) → đẩy lại hàng gửi cùng jobId (BullMQ không tạo job trùng nếu job
// còn). Không có Redis → không quét (không giả chạy). Trạng thái nằm ở DB nên khởi động lại không mất / không reset trần / khoá 48 giờ.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { ChannelSendQueue } from '../../channels/public';
import { staleClaims } from '../repos/recipients.repo';
import { buildMessage, refOf } from './campaign-dispatch';
import { MARKETING_ACTORS, systemCtx } from '../services/marketing-system';
import type { UnsubLinks } from '../services/unsubscribe-token';

export const MARKETING_SCHEDULER_QUEUE = 'marketing-scheduler';
export const CAMPAIGN_TICK_JOB = 'marketing.campaign-tick';
export const STALE_CLAIM_MS = 10 * 60_000;

export interface TickDeps {
  platform: PlatformDb;
  tenants: TenantDbResolver;
  executor: Pick<ActionExecutor, 'execute'>;
  send: ChannelSendQueue | null;
  links: UnsubLinks | null;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

/** Một workspace: chiến dịch tới hạn → dispatch; người nhận treo → đẩy lại. */
export async function tickWorkspace(d: TickDeps, ws: string): Promise<{ dispatched: number; requeued: number }> {
  const db = await d.tenants.get(TenantContexts.system(ws, CAMPAIGN_TICK_JOB));
  const now = d.now();
  const due = await db.campaign.findMany({
    // Cùng vị từ với index một phần campaign_due_idx (status IN …) — điều kiện giờ hẹn lọc trên index.
    where: { deletedAt: null, status: { in: ['approved', 'scheduled', 'running'] }, OR: [{ status: { not: 'scheduled' } }, { scheduledAt: { lte: now } }] },
    select: { id: true, approvedVersion: true },
    orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
    take: 50,
  });
  let dispatched = 0;
  let requeued = 0;
  const minute = Math.floor(now.getTime() / 60_000);
  for (const c of due) {
    if (!c.approvedVersion) continue;
    const r = (await d.executor.execute(systemCtx(ws, MARKETING_ACTORS.dispatch, `${c.id}:dispatch:${minute}`), 'campaign.dispatch', { campaign_id: c.id, approved_version: c.approvedVersion, batch: minute })) as { result?: { claimed?: number } };
    dispatched += r.result?.claimed ?? 0;
    if (!d.send) continue;
    const stale = await staleClaims(db, c.id, new Date(now.getTime() - STALE_CLAIM_MS), 200);
    if (!stale.length) continue;
    const row = await db.campaign.findUnique({ where: { id: c.id } });
    if (!row || row.status !== 'running') continue;
    for (const s of stale) {
      const m = await buildMessage(db, row, s, d.links, ws, now);
      if (!m) continue;
      await d.send.enqueue({ ws, account_id: m.accountId, ref_id: refOf(s.id), message: m.message, proactive: true, deferrable: true });
      requeued++;
    }
  }
  return { dispatched, requeued };
}

export async function tickCampaigns(d: TickDeps): Promise<{ dispatched: number; requeued: number }> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const total = { dispatched: 0, requeued: 0 };
  for (const w of wss) {
    try {
      const r = await tickWorkspace(d, w.id);
      total.dispatched += r.dispatched;
      total.requeued += r.requeued;
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}
