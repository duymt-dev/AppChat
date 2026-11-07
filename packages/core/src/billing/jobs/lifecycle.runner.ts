// Lượt vòng đời gói (TIP-039, DC-242) — ROLE=jobs: subscription tới hạn (cấp Credit kỳ tháng / hết kỳ đã trả / hạ gói kỳ sau) → action
// system-only `billing.lifecycle_step` qua ActionExecutor từng workspace (sổ thao tác + biên nhận — event không mất khi tiến trình chết).
// Chọn bằng index (`subscription_grant_due_idx`, `subscription_period_end_idx`), phân trang keyset theo id, lô bounded. Workspace đã lưu trữ /
// xoá không cấp. Lỗi một workspace không chặn lượt. Subscription trước 039 (chưa có neo) khởi tạo neo một lần, không cấp hồi tố.
import { anchorOf, monthAt } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { billingCtx } from '../payments/fulfil';

export const LIFECYCLE_BATCH = 100;

export interface LifecycleDeps {
  platform: PlatformDb;
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

/** Neo kỳ cho subscription trả phí cũ: từ `current_period_start` (ngày đã trả) — không đổi ngày hết hạn, không cấp lại kỳ đang chạy. */
export async function initLegacyAnchors(
  d: Pick<LifecycleDeps, 'platform' | 'now'>,
  limit = LIFECYCLE_BATCH,
): Promise<number> {
  const rows = await d.platform.subscription.findMany({
    where: { status: 'active', anchorDay: null },
    select: { id: true, workspaceId: true, currentPeriodStart: true, currentPeriodEnd: true },
    take: limit,
    orderBy: { id: 'asc' },
  });
  let n = 0;
  for (const s of rows) {
    const ws = await d.platform.workspace.findUnique({
      where: { id: s.workspaceId },
      select: { timezone: true },
    });
    const a = anchorOf(s.currentPeriodStart, ws?.timezone ?? 'Asia/Ho_Chi_Minh');
    // Kỳ tháng đang chạy coi như đã cấp (lúc kích hoạt cũ); kỳ sau cấp bởi job.
    const next = s.currentPeriodEnd ? monthAt(d.now(), a).end : null;
    const r = await d.platform.subscription.updateMany({
      where: { id: s.id, anchorDay: null },
      data: {
        anchorDay: a.day,
        anchorHm: a.hm,
        anchorTz: a.timeZone,
        nextGrantAt: next && s.currentPeriodEnd && next < s.currentPeriodEnd ? next : null,
      },
    });
    n += r.count;
  }
  return n;
}

/** Workspace có việc tới hạn (cấp kỳ / hết kỳ), keyset theo id. */
async function dueWorkspaces(
  p: PlatformDb,
  now: Date,
  after: string | null,
  limit: number,
): Promise<{ id: string; workspaceId: string }[]> {
  return p.subscription.findMany({
    where: {
      status: 'active',
      OR: [{ nextGrantAt: { lte: now } }, { currentPeriodEnd: { lte: now }, termPrice: { not: null } }],
      ...(after ? { id: { gt: after } } : {}),
    },
    orderBy: { id: 'asc' },
    take: limit,
    select: { id: true, workspaceId: true },
  });
}

export async function runLifecycle(
  d: LifecycleDeps,
  limit = LIFECYCLE_BATCH,
): Promise<{ workspaces: number; granted: number; expired: number; switched: number; failed: number }> {
  const out = { workspaces: 0, granted: 0, expired: 0, switched: 0, failed: 0 };
  await initLegacyAnchors(d);
  const now = d.now();
  const rows = await dueWorkspaces(d.platform, now, null, limit);
  const live = new Set(
    (
      await d.platform.workspace.findMany({
        where: { id: { in: rows.map((r) => r.workspaceId) }, dbStatus: 'active', archivedAt: null },
        select: { id: true },
      })
    ).map((w) => w.id),
  );
  for (const r of rows) {
    if (!live.has(r.workspaceId)) continue;
    out.workspaces++;
    try {
      const res = (await d.executor.execute(billingCtx(r.workspaceId), 'billing.lifecycle_step', {})) as {
        status: number;
        data: { result?: { granted?: number; expired?: boolean; switched?: boolean } };
      };
      out.granted += res.data.result?.granted ?? 0;
      if (res.data.result?.expired) out.expired++;
      if (res.data.result?.switched) out.switched++;
    } catch (err) {
      out.failed++;
      d.onError?.(r.workspaceId, err);
    }
  }
  return out;
}
