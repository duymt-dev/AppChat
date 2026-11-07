// Email tóm tắt (TIP-038 pha 4, DC-241 / DC-366) — hai bước của action system-only `digest.dispatch` cho MỘT workspace:
//   plan  — người nhận đủ điều kiện (thành viên hoạt động, email đã xác minh, prefs daily / weekly) → một dòng sổ cho kỳ VỪA ĐÓNG (unique
//           người nhận + nhịp + kỳ: chạy lại / hai worker không tạo trùng); mốc gửi = 08:00 ngày đóng kỳ, lùi qua DND. Không dồn kỳ cũ.
//   send  — claim (trong transaction của action): lô dòng tới hạn, kiểm lại prefs + thành viên + quyền HIỆN TẠI, dựng nội dung theo quyền
//           đó (selector Việc cần tôi / việc follow / AI trong kỳ — cùng service Tổng quan), giành `queued → sending` + `attempted_at`, commit
//           cùng action_log TRƯỚC khi gọi nhà cung cấp. deliver (sau commit): gửi, CAS kết quả — `sent` + provider_id; từ chối rõ (4xx) →
//           `failed`; lỗi không chắc (mạng / 5xx) → `unknown`. Sập giữa claim và kết quả → dòng `sending` quá hạn → `unknown`, KHÔNG gửi lại
//           mù (không hứa exactly-once). Không LLM, không Credit, log không chứa email / nội dung.
import type { PlatformDb, TenantDb } from '@appchat/db';
import { DEFAULT_NOTIFY_PREFS, type AuthzContext, type NotifyPrefsData } from '@appchat/shared';
import { MailSendError, type MailMessage, type MailProvider } from '@appchat/integrations';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { aiWindow, dayBounds } from '../services/dashboard-blocks';
import { visibleFollowUps } from '../services/follow-ups';
import { workItems } from '../services/work-items';
import { insightAuthz } from '../metrics/common';
import { afterQuietHours, expired, lastClosedPeriod, type Cadence } from './digest-period';
import { digestMail } from './digest-template';

export const DIGEST_BATCH = 50;
/** `sending` lâu hơn mốc này = worker đã chết sau khi giành → không biết đã gửi chưa → `unknown`. */
export const DIGEST_STALE_SENDING_MS = 10 * 60_000;
const WORK_CAP = 100;

export interface DigestDeps {
  platform: Pick<PlatformDb, 'workspace' | 'membership' | 'user' | 'notificationPref'>;
  /** Transaction tenant của action `digest.dispatch` (plan / claim chạy trong đó). */
  db: TenantTx;
  mail: MailProvider | null;
  authzOf: (ws: string, userId: string) => Promise<AuthzContext | null>;
  publicUrl: string;
  now: () => Date;
}

type Out = { planned: number; sent: number; skipped: number; unknown: number; failed: number };
const zero = (): Out => ({ planned: 0, sent: 0, skipped: 0, unknown: 0, failed: 0 });

const prefsOf = (row: { dnd: unknown; digest: string } | null): Pick<NotifyPrefsData, 'dnd' | 'digest'> => ({
  dnd: { ...DEFAULT_NOTIFY_PREFS.dnd, ...((row?.dnd ?? {}) as object) },
  digest: (row?.digest as NotifyPrefsData['digest'] | undefined) ?? DEFAULT_NOTIFY_PREFS.digest,
});

/** Người nhận còn hợp lệ: thành viên hoạt động + email đã xác minh (Owner cũng phải có membership — thiếu là không gửi). */
async function recipients(d: DigestDeps, ws: string, userIds?: string[]) {
  const members = await d.platform.membership.findMany({
    where: { workspaceId: ws, status: 'active', ...(userIds ? { userId: { in: userIds } } : {}) },
    select: { userId: true },
  });
  const ids = members.map((m) => m.userId);
  if (!ids.length)
    return new Map<string, { email: string; locale: string; prefs: ReturnType<typeof prefsOf> }>();
  const [users, prefs] = await Promise.all([
    d.platform.user.findMany({
      where: { id: { in: ids }, emailVerifiedAt: { not: null } },
      select: { id: true, email: true, locale: true },
    }),
    d.platform.notificationPref.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, dnd: true, digest: true },
    }),
  ]);
  const p = new Map(prefs.map((r) => [r.userId, r]));
  return new Map(
    users.map((u) => [u.id, { email: u.email, locale: u.locale, prefs: prefsOf(p.get(u.id) ?? null) }]),
  );
}

export async function planDigests(d: DigestDeps, ws: string): Promise<Out> {
  const out = zero();
  const now = d.now();
  const w = await d.platform.workspace.findUnique({ where: { id: ws }, select: { timezone: true } });
  const timeZone = w?.timezone ?? 'Asia/Ho_Chi_Minh';
  for (const [userId, r] of await recipients(d, ws)) {
    if (r.prefs.digest === 'off') continue;
    const p = lastClosedPeriod(r.prefs.digest as Cadence, now, timeZone);
    if (expired(p, now)) continue;
    const at = afterQuietHours(p.sendAt, r.prefs.dnd, timeZone);
    const row = await d.db.digestDelivery.createMany({
      data: [
        {
          id: uuidv7(now.getTime()),
          userId,
          cadence: p.cadence,
          periodStart: p.start,
          periodEnd: p.end,
          nextAttemptAt: at,
          createdAt: now,
          updatedAt: now,
        },
      ],
      skipDuplicates: true,
    });
    out.planned += row.count;
  }
  return out;
}

const finish = (
  db: Pick<TenantDb, 'digestDelivery'>,
  id: string,
  version: number,
  now: Date,
  data: Record<string, unknown>,
) =>
  db.digestDelivery.updateMany({
    where: { id, version },
    data: { ...data, version: version + 1, updatedAt: now },
  });

export interface Claimed {
  id: string;
  version: number;
  mail: MailMessage;
}

/** Trong transaction của action: dòng `sending` bỏ dở → unknown; lô tới hạn kiểm lại điều kiện, dựng nội dung, giành `queued → sending`. */
export async function claimDigests(d: DigestDeps, ws: string): Promise<Out & { claimed: Claimed[] }> {
  const out = { ...zero(), claimed: [] as Claimed[] };
  const now = d.now();
  const stale = await d.db.digestDelivery.updateMany({
    where: { state: 'sending', attemptedAt: { lt: new Date(now.getTime() - DIGEST_STALE_SENDING_MS) } },
    data: { state: 'unknown', reason: 'interrupted', updatedAt: now },
  });
  out.unknown += stale.count;
  const due = await d.db.digestDelivery.findMany({
    where: { state: 'queued', nextAttemptAt: { lte: now } },
    orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
    take: DIGEST_BATCH,
  });
  if (!due.length) return out;
  const w = await d.platform.workspace.findUnique({
    where: { id: ws },
    select: { name: true, timezone: true },
  });
  const timeZone = w?.timezone ?? 'Asia/Ho_Chi_Minh';
  const who = await recipients(d, ws, [...new Set(due.map((x) => x.userId))]);
  for (const row of due) {
    const r = who.get(row.userId);
    // Kiểm lại ngay trước khi gửi: tắt / đổi nhịp / rời workspace / chưa xác minh / quá hạn kỳ / chưa có nhà cung cấp → bỏ.
    const skip = !r
      ? 'removed'
      : r.prefs.digest !== row.cadence
        ? 'off'
        : expired({ sendAt: row.nextAttemptAt }, now)
          ? 'expired'
          : !d.mail
            ? 'no_provider'
            : null;
    const authz = !skip ? await d.authzOf(ws, row.userId) : null;
    if (skip || !authz) {
      if (
        (await finish(d.db, row.id, row.version, now, { state: 'skipped', reason: skip ?? 'no_access' }))
          .count
      )
        out.skipped++;
      continue;
    }
    const mail = await content(d, row, r!, authz, w?.name ?? '', timeZone);
    const claimed = await d.db.digestDelivery.updateMany({
      where: { id: row.id, version: row.version, state: 'queued' },
      data: {
        state: 'sending',
        attemptedAt: now,
        attempts: { increment: 1 },
        version: row.version + 1,
        updatedAt: now,
      },
    });
    if (claimed.count) out.claimed.push({ id: row.id, version: row.version + 1, mail });
  }
  return out;
}

/** Sau commit (ngoài transaction): gọi nhà cung cấp từng dòng đã giành, ghi kết quả bằng CAS. Từ chối rõ (4xx) → failed; còn lại → unknown. */
export async function deliverDigests(
  db: Pick<TenantDb, 'digestDelivery'>,
  mail: MailProvider,
  jobs: Claimed[],
  now: () => Date,
): Promise<Pick<Out, 'sent' | 'failed' | 'unknown'>> {
  const out = { sent: 0, failed: 0, unknown: 0 };
  for (const j of jobs) {
    try {
      const res = await mail.send(j.mail);
      await finish(db, j.id, j.version, now(), {
        state: 'sent',
        sentAt: now(),
        providerId: res.id.slice(0, 200),
        reason: null,
      });
      out.sent++;
    } catch (err) {
      const rejected =
        err instanceof MailSendError &&
        err.status >= 400 &&
        err.status < 500 &&
        err.status !== 408 &&
        err.status !== 429;
      await finish(db, j.id, j.version, now(), {
        state: rejected ? 'failed' : 'unknown',
        reason: err instanceof MailSendError ? `provider_${err.status}` : 'provider_error',
      });
      if (rejected) out.failed++;
      else out.unknown++;
    }
  }
  return out;
}

/** Nội dung theo quyền HIỆN TẠI của người nhận (cùng selector Tổng quan); kỳ = [period_start, period_end). */
async function content(
  d: DigestDeps,
  row: { cadence: string; periodStart: Date; periodEnd: Date },
  r: { email: string; locale: string },
  authz: AuthzContext,
  workspace: string,
  timeZone: string,
) {
  const now = d.now();
  const place = { timeZone, locale: r.locale === 'en' ? 'en' : 'vi' };
  // `d.db` là transaction của action (claim) — đọc thẳng, không mở transaction lồng.
  const tx = d.db;
  const work = await workItems(tx, authz, now, place, WORK_CAP);
  const follow =
    authz.isOwner || authz.permissions.has('crm.view')
      ? (await visibleFollowUps(tx, insightAuthz(authz), 1, dayBounds(now, timeZone).to)).total
      : 0;
  const ai = await aiWindow(tx, authz, { from: row.periodStart, to: row.periodEnd });
  const period = new Intl.DateTimeFormat(place.locale === 'en' ? 'en-GB' : 'vi-VN', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(row.periodStart);
  return digestMail({
    to: r.email,
    locale: place.locale,
    workspace,
    cadence: row.cadence as Cadence,
    period,
    work,
    followUps: follow,
    ai,
    publicUrl: d.publicUrl,
  });
}
