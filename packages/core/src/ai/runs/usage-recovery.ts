// Khôi phục usage AI (TIP-019b §2.4) — chạy trên lịch `consistency-scheduler` của 045b (ROLE=jobs), không thêm bộ điều phối thứ hai.
// Mỗi workspace: biên nhận `usage_known` quá hạn (index `ai_usage_receipt_unresolved_idx`) → quyết toán lại (ví trừ theo ref: đã trừ thì
// trả đúng số cũ, tenant chỉ cộng một lần). Biên nhận `dispatched` / `unknown` KHÔNG bao giờ gửi lại nhà cung cấp và không tự gỡ cách
// ly theo thời gian — chỉ báo số lượng; usage muộn có bằng chứng mới được ghi.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { UsageWallet } from '../../billing/services/usage-receipt';
import type { MeteredDb } from './metered-db';
import { settleReceipt } from './usage-settlement';

/** Biên nhận trẻ hơn mức này để run đang chạy tự quyết toán. */
export const USAGE_RECOVERY_GRACE_MS = 60_000;
const BATCH = 50;

export interface UsageRecoveryReport {
  workspaces: number;
  settled: number;
  unresolved: number;
}

export async function recoverUsage(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; wallet: UsageWallet; now: () => Date; onError?: (ws: string, err: unknown) => void }): Promise<UsageRecoveryReport> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const out: UsageRecoveryReport = { workspaces: wss.length, settled: 0, unresolved: 0 };
  const before = new Date(d.now().getTime() - USAGE_RECOVERY_GRACE_MS);
  for (const w of wss) {
    try {
      const db = (await d.tenants.get(TenantContexts.system(w.id, 'ai.usage-recovery'))) as unknown as MeteredDb;
      const due = await db.aiUsageReceipt.findMany({ where: { status: { in: ['usage_known', 'dispatched', 'unknown'] }, updatedAt: { lt: before } }, orderBy: [{ status: 'asc' }, { updatedAt: 'asc' }, { id: 'asc' }], take: BATCH, select: { id: true, status: true, source: true } });
      for (const r of due) {
        if (r.status !== 'usage_known') {
          out.unresolved++;
          continue;
        }
        await settleReceipt({ db, wallet: d.wallet, workspaceId: w.id, now: d.now }, r.id, { source: r.source }).catch((err) => {
          if ((err as { code?: string })?.code !== 'CREDIT_EXHAUSTED') throw err;
        });
        out.settled++;
      }
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return out;
}
