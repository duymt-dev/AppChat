// Giữ phiên tài khoản kênh trong worker ROLE=channels (Blueprint §6 "Account lease"): mỗi nhịp 10 giây gia hạn lease đang giữ
// (mất lease → dừng phiên) và nhận tài khoản `connected` (route DB nền tảng) chưa ai giữ; credential giải từ DB tenant. Tin vào →
// queue `channel-inbound` (job id chống trùng); phiên hết hạn → `expired` + thông báo; lệnh từ API (dừng / chạy / đồng bộ) qua pub/sub.
import type { Queue } from 'bullmq';
import { ChannelAuthError, type ChannelAdapter, type ChannelRegistry, type HealthStatus, type InboundSink, type NormalizedInbound } from '@appchat/channels';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { decryptSecret } from '../../kernel/crypto';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { ChannelAccounts, routeStatusOf, settingsOf, type AccountStatus } from '../services/accounts.service';
import type { ControlOp } from '../services/control';
import { LEASE_HEARTBEAT_MS, type ChannelLeases } from './lease';

export interface SessionDeps {
  platform: Pick<PlatformDb, 'tenantChannelRoute'>;
  tenants: TenantDbResolver;
  registry: ChannelRegistry;
  accounts: ChannelAccounts;
  leases: ChannelLeases;
  inbound: Pick<Queue, 'add'>;
  kv: KeyValueStore;
  key: Buffer;
  log: AppLogger;
  now: () => Date;
  /** Gọi khi phiên bắt đầu / dừng — mở / đóng worker gửi của tài khoản (send.processor). */
  onStarted?: (accountId: string, ws: string, adapter: ChannelAdapter) => Promise<void>;
  onStopped?: (accountId: string) => Promise<void>;
}

interface Held {
  ws: string;
  adapter: ChannelAdapter;
}

/** Chờ trước khi thử nhận lại tài khoản vừa khởi động lỗi (không phải lỗi credential). */
const RETRY_AFTER_MS = 60_000;

export class ChannelSessions {
  private readonly held = new Map<string, Held>();
  private readonly failedAt = new Map<string, number>();
  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(private readonly d: SessionDeps) {}

  /** Loại kênh giữ phiên bằng lease và có adapter trong worker này. */
  private leaseTypes(): string[] {
    return this.d.registry.manifests().filter((m) => m.session === 'lease' && this.d.registry.hasAdapter(m.type)).map((m) => m.type);
  }

  start(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), LEASE_HEARTBEAT_MS);
  }

  async shutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    // Nhả lease trước khi tắt (Blueprint §11 reload) — worker khác nhận ngay, không chờ hết TTL.
    for (const id of [...this.held.keys()]) await this.drop(id);
  }

  isHeld(accountId: string): boolean {
    return this.held.has(accountId);
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      for (const id of [...this.held.keys()]) {
        if (!(await this.d.leases.renew(id).catch(() => false))) {
          this.d.log.warn({ account: id }, 'channel lease lost');
          await this.drop(id, false);
        }
      }
      const types = this.leaseTypes();
      if (!types.length) return;
      const routes = await this.d.platform.tenantChannelRoute.findMany({ where: { status: 'connected', type: { in: types } }, select: { channelAccountId: true, workspaceId: true } });
      // Lỗi của một tài khoản (workspace đã xoá / DB đang khôi phục) không chặn các tài khoản khác.
      for (const r of routes) await this.claim(r.channelAccountId, r.workspaceId).catch(() => this.failedAt.set(r.channelAccountId, Date.now()));
    } catch (err) {
      this.d.log.error({ err }, 'channel sessions tick failed');
    } finally {
      this.ticking = false;
    }
  }

  /** Nhận một tài khoản nếu chưa ai giữ lease (lệnh `start` từ API gọi ngay, không chờ nhịp). */
  async claim(accountId: string, ws?: string): Promise<void> {
    if (this.held.has(accountId)) return;
    if (Date.now() - (this.failedAt.get(accountId) ?? 0) < RETRY_AFTER_MS) return;
    const wsId = ws ?? (await this.d.platform.tenantChannelRoute.findUnique({ where: { channelAccountId: accountId }, select: { workspaceId: true } }))?.workspaceId;
    if (!wsId || !(await this.d.leases.acquire(accountId))) return;
    let db: TenantDb;
    try {
      db = await this.db(wsId);
    } catch {
      // Workspace không còn / chưa sẵn sàng → nhả lease, thử lại sau RETRY_AFTER_MS.
      await this.d.leases.release(accountId);
      this.failedAt.set(accountId, Date.now());
      return;
    }
    try {
      const row = await db.channelAccount.findUnique({ where: { id: accountId } });
      const adapter = row && this.d.registry.get(row.type)?.adapter;
      if (!row || !adapter?.start || row.status !== 'connected' || row.pausedAt || !row.credentialsEnc) {
        // Route lệch với tài khoản (đổi trạng thái chưa kịp ghi route) → sửa route theo DB tenant.
        if (row) await this.d.accounts.route(wsId, row, routeStatusOf(row.status as AccountStatus, row.pausedAt));
        await this.d.leases.release(accountId);
        return;
      }
      const credentials = JSON.parse(decryptSecret(row.credentialsEnc, this.d.key)) as unknown;
      this.held.set(accountId, { ws: wsId, adapter });
      await adapter.start({ id: row.id, workspaceId: wsId, type: row.type, credentials, settings: { ...settingsOf(row) } }, this.sink(wsId));
      this.failedAt.delete(accountId);
      await this.d.onStarted?.(accountId, wsId, adapter);
      this.d.log.info({ account: accountId, type: row.type }, 'channel session started');
    } catch (err) {
      this.held.delete(accountId);
      await this.d.leases.release(accountId);
      if (err instanceof ChannelAuthError) await this.markDown(wsId, accountId, 'expired');
      else this.failedAt.set(accountId, Date.now());
      this.d.log.warn({ account: accountId, err: err instanceof Error ? err.name : 'error' }, 'channel session start failed');
    }
  }

  async control(cmd: ControlOp): Promise<void> {
    if (cmd.op === 'stop') return this.drop(cmd.account_id);
    if (cmd.op === 'start') {
      this.failedAt.delete(cmd.account_id);
      return this.claim(cmd.account_id);
    }
    const h = this.held.get(cmd.account_id);
    await h?.adapter.syncHistory?.(cmd.account_id, cmd.days).catch((err: unknown) => this.d.log.warn({ account: cmd.account_id, err }, 'channel history sync failed'));
  }

  /** Dừng phiên + đóng worker gửi + nhả lease (`release=false` khi lease đã mất). */
  async drop(accountId: string, release = true): Promise<void> {
    const h = this.held.get(accountId);
    if (!h) return;
    this.held.delete(accountId);
    await h.adapter.stop?.(accountId).catch(() => undefined);
    await this.d.onStopped?.(accountId);
    if (release) await this.d.leases.release(accountId).catch(() => undefined);
  }

  /** Hết phiên / lỗi xác thực: `expired` + outbox `channel.status_changed` (reason → thông báo `channel_down`). */
  async markDown(ws: string, accountId: string, reason: 'expired' | 'send_errors', detail?: string): Promise<void> {
    const db = await this.db(ws);
    const now = this.d.now();
    const res = await db.$transaction(async (tx) => {
      const row = await tx.channelAccount.findUnique({ where: { id: accountId } });
      if (!row || row.status === 'disconnected') return null;
      const patch = reason === 'expired' ? { status: 'expired' as const, health: { status: 'expired' as const, detail } } : { pausedAt: now, health: { status: 'degraded' as const, detail } };
      const { row: next, event } = await this.d.accounts.setStatus(tx, row, patch, now, reason);
      if (event) await writeOutbox(tx, ws, [event], now);
      return next;
    });
    if (!res) return;
    await this.d.accounts.route(ws, res, routeStatusOf(res.status as AccountStatus, res.pausedAt));
    await markDirty(this.d.kv, ws);
    await this.drop(accountId);
  }

  private sink(ws: string): InboundSink {
    return {
      push: async (m: NormalizedInbound) => {
        // Job id ổn định = chống trùng ở hàng đợi (lớp DB: UNIQUE(channel_account_id, external_msg_id) — TIP-016).
        const id = `in-${m.channelAccountId}-${m.externalMsgId}`.replaceAll(':', '_');
        await this.d.inbound.add('inbound', { ws, message: m }, { jobId: id, attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 });
        await this.touch(ws, m.channelAccountId);
      },
      status: (accountId: string, health: HealthStatus, detail?: string) => {
        if (health === 'expired') void this.markDown(ws, accountId, 'expired', detail).catch((err: unknown) => this.d.log.error({ err }, 'channel mark expired failed'));
        else void this.health(ws, accountId, health, detail);
      },
    };
  }

  private async health(ws: string, accountId: string, status: HealthStatus, detail?: string) {
    const db = await this.db(ws);
    await db.channelAccount.update({ where: { id: accountId }, data: { health: { status, detail, checked_at: this.d.now().toISOString() } } }).catch(() => undefined);
  }

  private async touch(ws: string, accountId: string) {
    const db = await this.db(ws);
    await db.channelAccount.update({ where: { id: accountId }, data: { lastEventAt: this.d.now() } }).catch(() => undefined);
  }

  private db(ws: string): Promise<TenantDb> {
    return this.d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
  }
}

