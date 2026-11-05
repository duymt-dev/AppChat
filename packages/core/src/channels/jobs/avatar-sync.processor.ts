// Đồng bộ ảnh đại diện trên worker giữ phiên (TIP-014b D). Job `avatars` đi chung hàng đợi thao tác `chop-<tài khoản>` (concurrency 1 —
// không chồng với thu hồi / cảm xúc / lịch sử; chỉ nơi giữ lease mới gọi nhà cung cấp). Mỗi job tối đa `batchesPerJob` lô ≤ 20 id,
// nghỉ giữa lô, dừng khi chạm trần lượt kiểm / ngày; còn việc thì đẩy job trễ. Ảnh tải bằng safeFetch (chặn địa chỉ nội bộ, ≤ 2MB, chỉ
// ảnh qua cổng `guardUpload`) rồi ghi Storage `purpose = avatar` — không bao giờ hotlink CDN nhà cung cấp. URL nguồn không đổi → không
// tải lại. Lỗi nhà cung cấp / mạng → lùi theo số lần (`avatarBackoffMs`), hết lượt → `failed`.
import type { ChannelAdapter, ProviderProfile } from '@appchat/channels';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { FilesService } from '../../kernel/files/files.service';
import { safeFetch, type SafeFetchOptions } from '../../kernel/http/safe-fetch';
import type { AppLogger } from '../../kernel/logger/logger';
import { AVATAR_LIMITS, dueAvatars, lookupsToday, settleAvatar, sourceHashOf, type DueAvatar } from '../operations/avatar-store';
import { assertGeneration } from '../operations/session-generation';

export interface AvatarJob {
  ws: string;
}

export interface AvatarDeps {
  tenants: TenantDbResolver;
  files: FilesService | null;
  log: AppLogger;
  now: () => Date;
  limits?: Partial<typeof AVATAR_LIMITS>;
  fetchOptions?: SafeFetchOptions;
  sleep?: (ms: number) => Promise<void>;
}

/** `more` + `delayMs`: còn dòng chờ (đến hạn ngay hoặc đang lùi) — người gọi hẹn job sau `delayMs`. */
export type AvatarRunResult = { status: 'done' | 'more' | 'capped' | 'unsupported' | 'stale'; checked: number; delayMs?: number };

const MIME_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

/** Một lần chạy: trả `more` khi còn việc đến hạn (người gọi đẩy job trễ). */
export async function runAvatarSync(d: AvatarDeps, accountId: string, adapter: ChannelAdapter, j: AvatarJob, generation?: number): Promise<AvatarRunResult> {
  const lim = { ...AVATAR_LIMITS, ...d.limits };
  const ops = adapter.operations;
  if (!ops?.profiles) return { status: 'unsupported', checked: 0 };
  const db = await d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
  let checked = 0;
  for (let b = 0; b < lim.batchesPerJob; b++) {
    // Chủ phiên cũ (mất lease / tạm dừng) không gọi kênh nữa.
    try {
      await db.$transaction((tx) => assertGeneration(tx, accountId, generation));
    } catch {
      return { status: 'stale', checked };
    }
    const room = lim.perDay - (await lookupsToday(db, accountId, d.now()));
    if (room <= 0) return { status: 'capped', checked };
    const due = await dueAvatars(db, accountId, d.now(), Math.min(lim.batch, room));
    if (!due.length) return later(db, accountId, d.now(), checked);
    if (b > 0) await (d.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(lim.pauseMs);
    let got: ProviderProfile[];
    try {
      got = await ops.profiles(accountId, due.map((x) => x.externalId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'profiles_failed';
      d.log.warn({ account: accountId, err: msg }, 'avatar profiles lookup failed');
      for (const x of due) await settleAvatar(db, accountId, x.externalId, { status: 'error', error: msg, attempts: x.attempts + 1 }, d.now());
      return later(db, accountId, d.now(), checked);
    }
    const byId = new Map(got.map((p) => [p.id, p]));
    for (const x of due) await settleAvatar(db, accountId, x.externalId, await fetchOne(d, db, j.ws, x, byId.get(x.externalId), lim), d.now());
    checked += due.length;
  }
  return later(db, accountId, d.now(), checked);
}

/** Còn dòng `queued` (kể cả đang lùi) → hẹn theo mốc sớm nhất; hết → done. */
async function later(db: TenantDb, accountId: string, now: Date, checked: number): Promise<AvatarRunResult> {
  const next = await db.channelAvatar.findFirst({ where: { channelAccountId: accountId, status: 'queued' }, orderBy: { nextAt: 'asc' }, select: { nextAt: true } });
  return next ? { status: 'more', checked, delayMs: Math.max(0, next.nextAt.getTime() - now.getTime()) } : { status: 'done', checked };
}

async function fetchOne(d: AvatarDeps, db: TenantDb, ws: string, x: DueAvatar, p: ProviderProfile | undefined, lim: typeof AVATAR_LIMITS) {
  if (!p?.avatarUrl) return { status: 'none' as const };
  const hash = sourceHashOf(p.avatarUrl);
  if (x.fileId && x.sourceHash === hash) return { status: 'ok' as const, fileId: x.fileId, sourceHash: hash, synced: false };
  if (!d.files) return { status: 'error' as const, error: 'storage_unavailable', attempts: x.attempts + 1 };
  try {
    const r = await safeFetch(p.avatarUrl, { timeoutMs: lim.timeoutMs, ...d.fetchOptions, maxBytes: lim.maxBytes });
    if (r.status < 200 || r.status >= 300) return { status: 'error' as const, error: `http_${r.status}`, attempts: x.attempts + 1 };
    const mime = (r.headers['content-type'] ?? 'application/octet-stream').split(';')[0]!.trim().toLowerCase();
    const f = await d.files.upload(db, ws, { name: `avatar.${MIME_EXT[mime] ?? 'bin'}`, mime: MIME_EXT[mime] ? mime : 'application/octet-stream', body: r.body, purpose: 'avatar', uploadedBy: null });
    await db.file.updateMany({ where: { id: f.id }, data: { confirmed: true } });
    return { status: 'ok' as const, fileId: f.id, sourceHash: hash, synced: true };
  } catch (err) {
    // Ảnh không hợp lệ (không phải ảnh / quá lớn / địa chỉ nội bộ) cũng lùi + hết lượt → failed, không ghi tệp.
    const msg = (err instanceof Error ? err.message : 'avatar_fetch_failed').replace(/^[A-Z_]+$/, 'avatar_rejected');
    return { status: 'error' as const, error: msg, attempts: x.attempts + 1 };
  }
}
