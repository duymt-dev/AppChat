// Đối soát nền tảng ↔ tenant hằng giờ (TIP-045b annex E, việc 9): ghế, hạn mức kênh / agent, ví credit ↔ sổ, trừ tiền AI ↔ biên nhận
// tenant. Mốc cắt = giờ tròn trước lúc chạy (cùng mốc cho mọi workspace của lượt). Duyệt workspace active theo trang id (keyset), song
// song có giới hạn, lỗi một workspace không chặn workspace khác; checkpoint mỗi workspace. Phát hiện ghi `reconcile_finding` với khoá
// ổn định (workspace, check, reference, cutoff) — chạy lại cùng mốc không ghi trùng — + metric + log cảnh báo đã che. KHÔNG tự sửa ví,
// gói, thành viên hay thanh toán; trang Quản trị nền tảng (TIP-040) đọc bảng phát hiện, sửa qua action được cấp quyền riêng (DC-361).
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { appMetrics } from '../../kernel/metrics';
import { QuotaService } from '../services/quota.service';
import { checkSeats } from './reconcile-membership';
import { checkQuotas } from './reconcile-quota';
import type { Finding } from './reconcile-types';
import { checkUsageReceipts, checkWalletLedger } from './reconcile-wallet';

export const RECONCILE_JOB = 'billing.reconcile';
export const RECONCILE_EVERY_MS = 3_600_000;
const PAGE = 200;
const CONCURRENCY = 4;

export interface ReconcileDeps {
  platform: PlatformDb;
  tenants: TenantDbResolver;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
  onFinding?: (ws: string, f: Finding) => void;
}

export interface ReconcileReport {
  cutoff: Date;
  workspaces: number;
  findings: number;
  failed: number;
}

/** Giờ tròn trước `now` (UTC) — mốc cắt chung của lượt. */
export const cutoffOf = (now: Date) => new Date(Math.floor(now.getTime() / RECONCILE_EVERY_MS) * RECONCILE_EVERY_MS);

/** Một workspace: mọi phép kiểm trên dữ liệu trước mốc → danh sách phát hiện (chưa ghi). */
export async function reconcileWorkspace(platform: PlatformDb, tenant: TenantDb, workspaceId: string, cutoff: Date): Promise<Finding[]> {
  const limits = await new QuotaService(platform).limits(workspaceId);
  const r = { workspaceId, cutoff, limits };
  const groups = await Promise.all([
    checkSeats(platform, r),
    checkQuotas(tenant, platform, r),
    checkWalletLedger(platform, r),
    checkUsageReceipts(platform, tenant, r),
  ]);
  return groups.flat();
}

/** Ghi phát hiện (idempotent theo khoá ổn định) + checkpoint; trả số phát hiện MỚI ghi ở lượt này. */
async function record(platform: PlatformDb, ws: string, cutoff: Date, now: Date, findings: Finding[]): Promise<number> {
  const r = findings.length
    ? await platform.reconcileFinding.createMany({
        data: findings.map((f) => ({ id: uuidv7(now.getTime()), workspaceId: ws, check: f.check, reference: f.reference, cutoff, severity: f.severity, detail: f.detail, createdAt: now })),
        skipDuplicates: true,
      })
    : { count: 0 };
  await platform.reconcileCheckpoint.upsert({
    where: { workspaceId: ws },
    create: { workspaceId: ws, cutoff, checkedAt: now, findings: findings.length },
    update: { cutoff, checkedAt: now, findings: findings.length },
  });
  return r.count;
}

export async function reconcileAll(d: ReconcileDeps): Promise<ReconcileReport> {
  const now = d.now();
  const cutoff = cutoffOf(now);
  const metric = appMetrics().reconcileFindings;
  const report: ReconcileReport = { cutoff, workspaces: 0, findings: 0, failed: 0 };
  let after: string | undefined;
  for (;;) {
    const page = await d.platform.workspace.findMany({
      where: { dbStatus: 'active', ...(after ? { id: { gt: after } } : {}) },
      orderBy: { id: 'asc' },
      take: PAGE,
      select: { id: true },
    });
    if (!page.length) break;
    after = page.at(-1)!.id;
    const queue = page.map((w) => w.id);
    const worker = async () => {
      for (let ws = queue.shift(); ws; ws = queue.shift()) {
        try {
          const tenant = await d.tenants.get(TenantContexts.system(ws, RECONCILE_JOB));
          const found = await reconcileWorkspace(d.platform, tenant, ws, cutoff);
          report.findings += await record(d.platform, ws, cutoff, now, found);
          for (const f of found) {
            metric.inc({ check: f.check, severity: f.severity });
            d.onFinding?.(ws, f);
          }
          report.workspaces++;
        } catch (err) {
          report.failed++;
          d.onError?.(ws, err);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (page.length < PAGE) break;
  }
  return report;
}
