// Job đăng nhập QR (queue `channel-login`, ROLE=channels — Blueprint §6 Zalo cá nhân): adapter.beginLogin → QR (Redis cho
// `/settings/channels/:id/login` + WS `channel.zalo.qr` tới người bấm) → quét → credential mã hoá vào `credentials_enc`, tên /
// uid Zalo, `connected` + route + outbox `channel.connected`; worker nhận phiên ngay (claim). Hết hạn / từ chối → `expired`.
import { Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { ChannelRegistry, LoginEvent } from '@appchat/channels';
import { TenantContexts, WorkspaceNotFoundError, type TenantDbResolver } from '@appchat/db';
import { encryptSecret } from '../../kernel/crypto';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { rooms } from '../../notify/realtime/envelope';
import type { RealtimeEmitter } from '../../notify/realtime/emitter';
import { ChannelAccounts } from '../services/accounts.service';
import { CHANNEL_LOGIN_QUEUE, type ChannelControl, type LoginJob } from '../services/control';
import type { SystemOutput } from '@appchat/actions';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { runSystemAction } from '../../kernel/actions/system';
import { loginTrigger } from '../system/sources';
import { stageLogin } from '../system/staging';

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
  /** TIP-003c: chốt kết quả qua action riêng `channel.system_transition` (commit_login_result). */
  executor: Pick<ActionExecutor, 'execute'>;
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
    // Kết quả đã xác thực: mã hoá NGOÀI hiệu ứng, stage theo (tài khoản, lần đăng nhập); action riêng chốt trong transaction (tài khoản
    // còn `connecting`, không trùng Zalo đang dùng). Không attempt (job cũ) → dùng id job làm lần đăng nhập.
    const attempt = j.attempt ?? `job-${row.id}`;
    await stageLogin(d.kv, row.id, attempt, { externalId: res.externalId, name: res.name, credentialsEnc: encryptSecret(JSON.stringify(res.credentials), d.key).toString('base64') });
    const r = await runSystemAction<SystemOutput>(d.executor, d.tenants, loginTrigger(j.ws, row.id, attempt));
    const result = (r.data as { result: SystemOutput }).result;
    const out = result.disposition === 'applied' ? await db.channelAccount.findUnique({ where: { id: row.id } }) : result.reason_code === 'duplicate' ? ('duplicate' as const) : null;
    if (out === 'duplicate') {
      await set('failed');
      d.log.warn({ account: row.id }, 'channel login duplicate account');
      return 'failed';
    }
    if (!out) return 'skipped';
    // Route nền tảng cập nhật sau commit bởi handler (afterCommit).
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
