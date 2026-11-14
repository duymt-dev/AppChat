// Kênh poll (manifest `session = 'poll'` — Email TIP-018, Blueprint §6 "IMAP poll 60 giây"): MỌI worker ROLE=channels nạp
// credential của tài khoản có route `connected` (adapter.start) + mở worker gửi; mỗi tài khoản poll một lần / POLL_INTERVAL_MS
// do đúng một worker (khoá Redis `SET NX PX`). Thư mới → `channel-inbound` (job id chống trùng) + `email_thread`; mốc lưu ở
// `channel_account.settings.poll_cursor`. Sai đăng nhập → `expired` + thông báo; route đổi (tạm dừng / ngắt) → đóng.
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { ChannelAuthError, type ChannelAdapter, type ChannelRegistry, type NormalizedInbound } from '@appchat/channels';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { decryptSecret } from '../../kernel/crypto';
import type { AppLogger } from '../../kernel/logger/logger';
import { recordInboundThread } from '../email/threads';
import { settingsOf } from '../services/accounts.service';
import type { ControlOp } from '../services/control';
import { scanRoutes } from './lease';

export const POLL_INTERVAL_MS = 60_000;
export const pollKey = (accountId: string) => `poll:channel:${accountId}`;

export interface PollerDeps {
  platform: Pick<PlatformDb, 'tenantChannelRoute'>;
  tenants: TenantDbResolver;
  registry: ChannelRegistry;
  redis: Pick<Redis, 'set' | 'del'>;
  inbound: Pick<Queue, 'add'>;
  key: Buffer;
  log: AppLogger;
  now: () => Date;
  open: (accountId: string, ws: string, adapter: ChannelAdapter) => Promise<void>;
  close: (accountId: string) => Promise<void>;
  expire: (ws: string, accountId: string) => Promise<void>;
}

interface Opened {
  ws: string;
  adapter: ChannelAdapter;
}

/** Job id ổn định của tin vào — trùng định dạng ChannelSessions (chống trùng ở hàng đợi). */
export const inboundJobId = (m: NormalizedInbound) => `in-${m.channelAccountId}-${m.externalMsgId}`.replaceAll(':', '_');

export class ChannelPollers {
  private readonly opened = new Map<string, Opened>();
  private readonly running = new Set<string>();
  private ticking = false;

  constructor(private readonly d: PollerDeps) {}

  private types(): string[] {
    return this.d.registry.manifests().filter((m) => m.session === 'poll' && this.d.registry.hasAdapter(m.type)).map((m) => m.type);
  }

  isOpen(accountId: string): boolean {
    return this.opened.has(accountId);
  }

  async tick(): Promise<void> {
    const types = this.types();
    if (this.ticking || !types.length) return;
    this.ticking = true;
    try {
      // Quét route theo trang (TIP-014b C) — chỉ giữ tập id còn sống, không nạp cả bảng.
      const live = new Set<string>();
      await scanRoutes(this.d.platform, types, async (r) => {
        live.add(r.channelAccountId);
        if (!this.opened.has(r.channelAccountId)) await this.load(r.channelAccountId, r.workspaceId).catch((err: unknown) => this.d.log.warn({ err, account: r.channelAccountId }, 'poll channel open failed'));
        // Poll chạy nền (không chờ) — lỗi ngoài try của poll (vd. Redis đã đóng lúc tắt tiến trình) chỉ ghi log, không thành unhandled rejection.
        if (this.opened.has(r.channelAccountId)) void this.poll(r.channelAccountId).catch((err: unknown) => this.d.log.warn({ err, account: r.channelAccountId }, 'channel poll aborted'));
      });
      for (const id of [...this.opened.keys()]) if (!live.has(id)) await this.drop(id);
    } catch (err) {
      this.d.log.error({ err }, 'poll channels tick failed');
    } finally {
      this.ticking = false;
    }
  }

  /** Lệnh từ API: `start` → nạp + poll ngay; `stop` → đóng; `sync` → bỏ mốc, nạp lại rồi poll ngay. */
  async control(cmd: ControlOp): Promise<void> {
    if (cmd.op === 'stop') return this.drop(cmd.account_id);
    if (cmd.op === 'sync') {
      // Đồng bộ lại: bỏ mốc + nạp lại (history_days mới) → lượt sau lấy theo ngày; thư đã có bị chặn ở UNIQUE external_msg_id.
      const o = this.opened.get(cmd.account_id);
      if (!o) return;
      const db = await this.db(o.ws);
      await db.$executeRaw`UPDATE channel_account SET settings = settings - 'poll_cursor' WHERE id = ${cmd.account_id}::uuid`;
      await this.drop(cmd.account_id);
    }
    await this.tick();
    if (this.opened.has(cmd.account_id)) {
      await this.d.redis.del(pollKey(cmd.account_id));
      await this.poll(cmd.account_id);
    }
  }

  /** Một lượt poll nếu tới hạn và giành được khoá (`force` bỏ qua khoá — test). Trả số thư đẩy vào hàng đợi. */
  async poll(accountId: string, force = false): Promise<number> {
    const o = this.opened.get(accountId);
    if (!o?.adapter.poll || this.running.has(accountId)) return 0;
    if (!force && (await this.d.redis.set(pollKey(accountId), '1', 'PX', POLL_INTERVAL_MS, 'NX')) !== 'OK') return 0;
    this.running.add(accountId);
    try {
      const db = await this.db(o.ws);
      const row = await db.channelAccount.findUnique({ where: { id: accountId }, select: { settings: true } });
      if (!row) return 0;
      const cursor = (row.settings as { poll_cursor?: unknown } | null)?.poll_cursor ?? null;
      const r = await o.adapter.poll(accountId, cursor, this.d.now());
      for (const m of r.messages) {
        if (o.adapter.manifest.type === 'email') await recordInboundThread(db, m);
        await this.d.inbound.add('inbound', { ws: o.ws, message: m }, { jobId: inboundJobId(m), attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 });
      }
      // Chỉ ghi khoá `poll_cursor` (không ghi đè cấu hình người dùng vừa đổi ở channel.update_settings).
      await db.$executeRaw`UPDATE channel_account SET settings = jsonb_set(settings, '{poll_cursor}', ${JSON.stringify(r.cursor ?? null)}::jsonb, true) WHERE id = ${accountId}::uuid`;
      if (r.messages.length) await db.channelAccount.update({ where: { id: accountId }, data: { lastEventAt: this.d.now() } });
      return r.messages.length;
    } catch (err) {
      if (err instanceof ChannelAuthError) {
        await this.d.expire(o.ws, accountId).catch((e: unknown) => this.d.log.error({ err: e }, 'poll channel mark expired failed'));
        await this.drop(accountId);
      } else this.d.log.warn({ account: accountId, err: err instanceof Error ? err.message : 'error' }, 'channel poll failed');
      return 0;
    } finally {
      this.running.delete(accountId);
    }
  }

  async drop(accountId: string): Promise<void> {
    const o = this.opened.get(accountId);
    if (!o) return;
    this.opened.delete(accountId);
    await o.adapter.stop?.(accountId).catch(() => undefined);
    await this.d.close(accountId);
  }

  async shutdown(): Promise<void> {
    for (const id of [...this.opened.keys()]) await this.drop(id);
  }

  /** Nạp credential (giải mã từ DB tenant) vào adapter + mở worker gửi của tài khoản. */
  private async load(accountId: string, ws: string): Promise<void> {
    const db = await this.db(ws);
    const row = await db.channelAccount.findUnique({ where: { id: accountId } });
    const adapter = row && this.d.registry.get(row.type)?.adapter;
    if (!row || !adapter?.start || row.status !== 'connected' || row.pausedAt || !row.credentialsEnc) return;
    const credentials = JSON.parse(decryptSecret(row.credentialsEnc, this.d.key)) as unknown;
    await adapter.start({ id: row.id, workspaceId: ws, type: row.type, credentials, settings: { ...settingsOf(row) } }, { push: async () => undefined, status: () => undefined });
    this.opened.set(accountId, { ws, adapter });
    await this.d.open(accountId, ws, adapter);
  }

  private db(ws: string): Promise<TenantDb> {
    return this.d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
  }
}
