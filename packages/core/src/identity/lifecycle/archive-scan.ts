// Quét lưu trữ gói Miễn phí không hoạt động (TIP-041 §1, Blueprint §2.0 bước 5, D23). Mỗi lượt (đêm) theo lô IDs-first:
//   - ứng viên: workspace active + db active + gói có `archive_inactive_days` (Miễn phí = 90; trial / trả phí null → không bao giờ) +
//     mốc hoạt động ĐÃ BIẾT. Không có mốc (chưa từng ghi / mất) → bỏ qua + đếm `unknown` (KHÔNG coi là không hoạt động rồi DROP).
//   - còn ≤ 14 ngày tới ngưỡng → cảnh báo Owner một lần mỗi cửa sổ (cửa sổ = mốc hoạt động đã dựa vào; hoạt động mới → cửa sổ mới) qua
//     outbox tenant `notify.requested` (in-app + email) khi DB còn active; biên nhận ghi ngày lưu trữ hiệu lực ≥ lúc giao + 14 ngày.
//   - tới ngày hiệu lực + cảnh báo đã giao → lệnh `archive` (nguồn scan, `basis_at` = mốc hoạt động). Chưa giao được → không lưu trữ.
//     Worker kiểm lại hoạt động sau quiesce (archive-run) — có hoạt động mới hơn `basis_at` → huỷ.
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { writeOutbox, markDirty } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { uuidv7 } from '../../kernel/ids';
import { createLifecycleJob } from './jobs';

export const WARN_DAYS = 14;
const DAY = 86_400_000;
const PAGE = 200;

export interface ScanDeps {
  platform: PlatformDb;
  resolver: TenantDbResolver;
  kv: KeyValueStore;
  now: () => Date;
  /** Đánh thức worker cho lệnh vừa tạo. */
  wake: (jobId: string) => Promise<void>;
}

export interface ScanReport {
  scanned: number;
  warned: number;
  archived: number;
  /** Gói có ngưỡng nhưng chưa có mốc hoạt động — bỏ qua. */
  unknown: number;
  /** Tới ngưỡng nhưng cảnh báo cửa sổ hiện tại chưa giao — không lưu trữ. */
  undelivered: number;
}

/** Ngày dự kiến lưu trữ (UTC, 00:00) = mốc hoạt động + ngưỡng ngày. */
export const archiveOn = (lastActive: Date, days: number) => new Date(Math.floor((lastActive.getTime() + days * DAY) / DAY) * DAY);
/** Cửa sổ cảnh báo gắn với MỐC HOẠT ĐỘNG đã dựa vào — hoạt động mới → cửa sổ mới (cảnh báo cũ hết hiệu lực). */
const windowKey = (lastActive: Date) => lastActive.toISOString();
const day = (d: Date) => d.toISOString().slice(0, 10);

interface Candidate {
  id: string;
  owner_user_id: string;
  last_active_at: Date | null;
  days: number;
}

/** Một lô ứng viên (IDs-first theo `workspace.id > after`): ngưỡng gói = equality trên plan có ngưỡng; LEFT JOIN thống kê. */
async function page(db: PlatformDb, after: string | null): Promise<Candidate[]> {
  return db.$queryRaw<Candidate[]>`
    SELECT w.id, w.owner_user_id, st.last_active_at, p.archive_inactive_days AS days
    FROM workspace w
    JOIN subscription s ON s.workspace_id = w.id AND s.status = 'active'
    JOIN plan p ON p.id = s.plan_id AND p.archive_inactive_days IS NOT NULL
    LEFT JOIN workspace_stats st ON st.workspace_id = w.id
    WHERE w.status = 'active' AND w.db_status = 'active' AND (${after}::uuid IS NULL OR w.id > ${after}::uuid)
    ORDER BY w.id
    LIMIT ${PAGE}`;
}

const noticeKey = (c: Candidate) => ({ workspaceId_windowKey_channel: { workspaceId: c.id, windowKey: windowKey(c.last_active_at!), channel: 'in_app' } });

/**
 * Cảnh báo Owner (outbox `notify.requested` → thông báo trong app + email theo kênh mặc định loại `archive_warning`) rồi ghi biên nhận
 * `sent` với ngày lưu trữ HIỆU LỰC = max(ngưỡng, lúc giao + 14 ngày) — Owner luôn có đủ 14 ngày sau cảnh báo đã giao. Lỗi → `failed` +
 * thử lại sau 1 giờ (không gia hạn theo lần thử: ngày hiệu lực tính từ lúc giao thành công).
 */
async function warn(d: ScanDeps, c: Candidate, on: Date): Promise<boolean> {
  const now = d.now();
  const effective = new Date(Math.max(on.getTime(), Math.ceil((now.getTime() + WARN_DAYS * DAY) / DAY) * DAY));
  const where = noticeKey(c);
  const base = { id: uuidv7(now.getTime()), workspaceId: c.id, windowKey: windowKey(c.last_active_at!), channel: 'in_app', createdAt: now };
  try {
    const db = await d.resolver.get(TenantContexts.system(c.id, 'lifecycle.archive-scan'));
    await db.$transaction((tx) =>
      writeOutbox(tx, c.id, [{ topic: 'notify.requested', payload: { kind: 'archive_warning', to: { user_ids: [c.owner_user_id] }, params: { date: day(effective) }, link: '/dashboard' } }], now),
    );
    await markDirty(d.kv, c.id);
    await d.platform.workspaceLifecycleNotice.upsert({
      where,
      create: { ...base, status: 'sent', attempts: 1, archiveOn: effective, sentAt: now },
      update: { status: 'sent', attempts: { increment: 1 }, archiveOn: effective, sentAt: now, lastError: null },
    });
    return true;
  } catch (e) {
    const retry = new Date(now.getTime() + 3_600_000);
    await d.platform.workspaceLifecycleNotice.upsert({
      where,
      create: { ...base, status: 'failed', attempts: 1, archiveOn: effective, lastError: (e as Error).name, nextAttemptAt: retry },
      update: { status: 'failed', attempts: { increment: 1 }, lastError: (e as Error).name, nextAttemptAt: retry },
    });
    return false;
  }
}

export async function scanArchiveCandidates(d: ScanDeps, maxPages = 50): Promise<ScanReport> {
  const r: ScanReport = { scanned: 0, warned: 0, archived: 0, unknown: 0, undelivered: 0 };
  const now = d.now();
  let after: string | null = null;
  for (let p = 0; p < maxPages; p++) {
    const rows = await page(d.platform, after);
    if (!rows.length) break;
    after = rows.at(-1)!.id;
    for (const c of rows) {
      r.scanned++;
      if (!c.last_active_at) {
        r.unknown++;
        continue;
      }
      const on = archiveOn(c.last_active_at, c.days);
      if (now.getTime() < on.getTime() - WARN_DAYS * DAY) continue;
      const n = await d.platform.workspaceLifecycleNotice.findUnique({ where: noticeKey(c), select: { status: true, archiveOn: true, nextAttemptAt: true } });
      if (n?.status !== 'sent') {
        // Chưa cảnh báo được cho mốc hoạt động này → cảnh báo (lỗi lần trước: chờ tới lượt thử lại). Chưa giao thì KHÔNG lưu trữ.
        if (n && n.nextAttemptAt.getTime() > now.getTime()) r.undelivered++;
        else if (await warn(d, c, on)) r.warned++;
        else r.undelivered++;
        continue;
      }
      if (now.getTime() < n.archiveOn.getTime()) continue;
      const job = await d.platform
        .$transaction(async (tx) => {
          const j = await createLifecycleJob(tx, { workspaceId: c.id, op: 'archive', expectedVersion: null, source: 'scan', now });
          await tx.workspaceLifecycleJob.update({ where: { id: j.id }, data: { basisAt: c.last_active_at } });
          return j;
        })
        .catch(() => null);
      if (job) {
        r.archived++;
        await d.wake(job.id).catch(() => undefined);
      }
    }
    if (rows.length < PAGE) break;
  }
  return r;
}
