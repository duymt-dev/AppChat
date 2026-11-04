// Job đăng nhập QR (queue `channel-login`, ROLE=channels — Blueprint §6 Zalo cá nhân): adapter.beginLogin → QR (Redis cho
// `/settings/channels/:id/login` + WS `channel.zalo.qr` tới người bấm) → quét → credential mã hoá vào `credentials_enc`, tên /
// uid Zalo, `connected` + route + outbox `channel.connected`; worker nhận phiên ngay (claim). Hết hạn / từ chối → `expired`.
import { Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { ChannelRegistry, LoginEvent } from '@appchat/channels';
import { serverMessages } from '@appchat/shared';
import { TenantContexts, WorkspaceNotFoundError, type TenantDbResolver } from '@appchat/db';
import { encryptSecret } from '../../kernel/crypto';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { rooms } from '../../notify/realtime/envelope';
import type { RealtimeEmitter } from '../../notify/realtime/emitter';
import { ChannelAccounts } from '../services/accounts.service';
import { CHANNEL_LOGIN_QUEUE, type ChannelControl, type LoginJob } from '../services/control';

/** Quá thời gian này chưa quét xong → bỏ (zca-js tự hết hạn QR sau 100 giây). */
export const LOGIN_TIMEOUT_MS = 150_000;

export interface LoginDeps {
  tenants: TenantDbResolver;
  registry: ChannelRegistry;
  accounts: ChannelAccounts;
  control: ChannelControl;
  emitter: RealtimeEmitter;
  kv: KeyValueStore;
  key: Buffer;
  log: AppLogger;
  now: () => Date;
  /** Nhận phiên ngay sau khi kết nối (ChannelSessions.claim). */
  claim: (accountId: string, ws: string) => Promise<void>;
}

export async function runLogin(d: LoginDeps, j: LoginJob): Promise<'connected' | 'skipped' | 'failed'> {
  // Job còn trong hàng đợi của workspace đã xoá (test / huỷ workspace) → bỏ, không báo lỗi.
  const db = await d.tenants.get(TenantContexts.system(j.ws, 'channel.login')).catch((err: unknown) => {
    if (err instanceof WorkspaceNotFoundError) return null;
    throw err;
  });
  if (!db) return 'skipped';
  const row = await db.channelAccount.findUnique({ where: { id: j.account_id } });
  if (!row || row.status !== 'connecting') return 'skipped';
  // Đã có lần kết nối mới hơn (quét lại) → job này cũ, bỏ.
  const cur = await d.control.login(row.id);
  if (j.attempt && cur?.attempt && cur.attempt !== j.attempt) return 'skipped';
  const adapter = d.registry.get(row.type)?.adapter;
  const set = (status: Parameters<ChannelControl['setLogin']>[0]['status'], qr: string | null = null, expires: string | null = null) =>
    d.control.setLogin({ account_id: row.id, status, qr, expires_at: expires, ...(j.attempt ? { attempt: j.attempt } : {}) });
  if (!adapter?.beginLogin) {
    await set('failed');
    return 'failed';
  }
  const defaultName = serverMessages('vi').channels.name.zalo_personal;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), LOGIN_TIMEOUT_MS);
  let last: LoginEvent['type'] | null = null;
  const onEvent = (e: LoginEvent) => {
    last = e.type;
    if (e.type === 'qr') {
      void set('waiting', e.image, e.expiresAt);
      if (j.user_id) d.emitter.publish({ ws: j.ws, rooms: [rooms.user(j.user_id)], event: 'channel.zalo.qr', data: { account_id: row.id, qr_png_base64: e.image, expires_at: e.expiresAt, ...(j.attempt ? { attempt: j.attempt } : {}) }, require: { permission: 'channels.manage' } });
    } else if (e.type === 'scanned') void set('scanned');
    else void set(e.type);
  };
  try {
    const res = await adapter.beginLogin(row.id, onEvent, ac.signal);
    const now = d.now();
    const out = await db.$transaction(async (tx) => {
      const cur = await tx.channelAccount.findUnique({ where: { id: row.id } });
      // Người dùng đã ngắt / bấm lại trong lúc chờ quét → bỏ kết quả này.
      if (!cur || cur.status !== 'connecting') return null;
      // Cùng Zalo đã gắn vào tài khoản khác đang dùng → không tạo bản trùng (unique partial `channel_account_external_live_key`).
      const dup = await tx.channelAccount.findFirst({ where: { type: cur.type, externalId: res.externalId, status: { not: 'disconnected' }, id: { not: cur.id } }, select: { id: true } });
      if (dup) return 'duplicate' as const;
      await tx.channelAccount.update({
        where: { id: cur.id },
        data: {
          externalId: res.externalId,
          credentialsEnc: new Uint8Array(encryptSecret(JSON.stringify(res.credentials), d.key)),
          // Nhãn người dùng đặt ở bước 2 giữ nguyên; nhãn mặc định ("Zalo cá nhân") thay bằng tên + SĐT Zalo.
          ...(cur.name === defaultName ? { name: res.name.slice(0, 60) } : {}),
        },
      });
      const { row: next, event } = await d.accounts.setStatus(tx, { ...cur, externalId: res.externalId }, { status: 'connected', pausedAt: null, health: { status: 'connected' } }, now);
      await writeOutbox(tx, j.ws, [{ topic: 'channel.connected', payload: { channel_account_id: cur.id, type: cur.type, name: next.name } }, ...(event ? [event] : [])], now);
      return next;
    });
    if (out === 'duplicate') {
      await set('failed');
      d.log.warn({ account: row.id }, 'channel login duplicate account');
      return 'failed';
    }
    if (!out) return 'skipped';
    await d.accounts.route(j.ws, out, 'connected');
    await markDirty(d.kv, j.ws);
    await set('connected');
    await d.claim(out.id, j.ws);
    return 'connected';
  } catch {
    // Hết hạn / từ chối / huỷ / lỗi mạng: tài khoản chờ "Kết nối lại" (không giữ tài khoản treo `connecting`).
    const now = d.now();
    await db.$transaction(async (tx) => {
      const cur = await tx.channelAccount.findUnique({ where: { id: row.id } });
      if (!cur || cur.status !== 'connecting') return;
      await d.accounts.setStatus(tx, cur, { status: 'expired', health: { status: 'expired', detail: last ?? 'login_failed' } }, now);
    });
    const cur = await db.channelAccount.findUnique({ where: { id: row.id } });
    if (cur?.status === 'expired') await d.accounts.route(j.ws, cur, 'expired');
    await set(last === 'declined' ? 'declined' : 'expired');
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

export function startLoginWorker(redis: Redis, d: LoginDeps): Worker {
  const w = new Worker<LoginJob>(CHANNEL_LOGIN_QUEUE, async (job) => runLogin(d, job.data), { connection: redis.duplicate(), concurrency: 4 });
  w.on('failed', (_job, err) => d.log.error({ err }, 'channel login job failed'));
  return w;
}
