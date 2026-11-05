// Giữ phiên tài khoản kênh trong worker ROLE=channels (Blueprint §6 "Account lease"): mỗi nhịp 10 giây gia hạn lease đang giữ
// (mất lease → dừng phiên) và nhận tài khoản `connected` (route DB nền tảng) chưa ai giữ; credential giải từ DB tenant. Tin vào →
// queue `channel-inbound` (job id chống trùng); phiên hết hạn → `expired` + thông báo; lệnh từ API (dừng / chạy / đồng bộ) qua pub/sub.
// TIP-014b C: mỗi lần giành phiên = thế hệ mới (`session_generation`); callback / đặt chỗ của phiên cũ bị fence. Nhịp lease so thế hệ DB —
// lệch (tạm dừng / ngắt mà lệnh pub/sub bị lỡ) → dừng phiên. Tắt: ngừng nhận trước, đóng worker gửi / thao tác (chờ job đang chạy), dừng
// listener, fence thế hệ rồi mới nhả lease. Quét route theo trang; thời gian theo Clock.
import type { Queue } from 'bullmq';
import { ChannelAuthError, type ChannelAdapter, type ChannelRegistry, type HealthStatus, type InboundSink, type NormalizedInbound } from '@appchat/channels';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { decryptSecret } from '../../kernel/crypto';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { ChannelAccounts, routeStatusOf, settingsOf, type AccountStatus } from '../services/accounts.service';
import type { ControlOp } from '../services/control';
import { LEASE_HEARTBEAT_MS, scanRoutes, type ChannelLeases } from './lease';
import { claimGeneration, currentGeneration, fenceGeneration } from '../operations/session-generation';
import { enqueueProviderEvent } from './provider-events.processor';

export interface SessionDeps {
  platform: Pick<PlatformDb, 'tenantChannelRoute'>;
  tenants: TenantDbResolver;
  registry: ChannelRegistry;
  accounts: ChannelAccounts;
  leases: ChannelLeases;
  inbound: Pick<Queue, 'add'>;
  /** Sự kiện kênh ngoài tin vào (TIP-014b: self-listen / thu hồi / cảm xúc) — queue `channel-provider-event`. Vắng → bỏ. */
  providerEvents?: Pick<Queue, 'add'>;
  kv: KeyValueStore;
  key: Buffer;
  log: AppLogger;
  now: () => Date;
  /** Gọi khi phiên bắt đầu / dừng — mở / đóng worker gửi của tài khoản (send.processor). */
  onStarted?: (accountId: string, ws: string, adapter: ChannelAdapter, generation: number) => Promise<void>;
  onStopped?: (accountId: string) => Promise<void>;
}

interface Held {
  ws: string;
  adapter: ChannelAdapter;
  generation: number;
}

/** Chờ trước khi thử nhận lại tài khoản vừa khởi động lỗi (không phải lỗi credential). */
const RETRY_AFTER_MS = 60_000;

export class ChannelSessions {
  private readonly held = new Map<string, Held>();
  private readonly failedAt = new Map<string, number>();
  private timer?: NodeJS.Timeout;
  private ticking = false;
  /** Đang tắt: không giành phiên mới, không nhận lệnh `start`. */
  private closing = false;

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
    this.closing = true;
    if (this.timer) clearInterval(this.timer);
    // Nhả lease khi tắt (Blueprint §11 reload) — worker khác nhận ngay, không chờ hết TTL. `drop` đóng worker gửi / thao tác (chờ job đang
    // chạy ghi xong biên nhận) và fence thế hệ TRƯỚC khi nhả lease → không có hai chủ gửi chồng nhau.
    for (const id of [...this.held.keys()]) await this.drop(id);
  }

  /** Thế hệ phiên đang giữ (đặt chỗ gửi / thao tác kiểm) — không giữ → undefined. */
  generation(accountId: string): number | undefined {
    return this.held.get(accountId)?.generation;
  }

  isHeld(accountId: string): boolean {
    return this.held.has(accountId);
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      for (const [id, h] of [...this.held]) {
        if (!(await this.d.leases.renew(id).catch(() => false))) {
          this.d.log.warn({ account: id }, 'channel lease lost');
          await this.drop(id, false);
          continue;
        }
        // Thế hệ DB đã đổi (tạm dừng / ngắt / kết nối lại mà lệnh pub/sub bị lỡ) → dừng phiên này; nhịp sau giành lại nếu còn connected.
        const g = await currentGeneration(await this.db(h.ws), id).catch(() => h.generation);
        if (g !== h.generation) {
          this.d.log.warn({ account: id }, 'channel session generation changed');
          await this.drop(id);
        }
      }
      const types = this.leaseTypes();
      if (!types.length || this.closing) return;
      // Lỗi của một tài khoản (workspace đã xoá / DB đang khôi phục) không chặn các tài khoản khác.
      await scanRoutes(this.d.platform, types, (r) => this.claim(r.channelAccountId, r.workspaceId).catch(() => void this.failedAt.set(r.channelAccountId, this.ms())));
    } catch (err) {
      this.d.log.error({ err }, 'channel sessions tick failed');
    } finally {
      this.ticking = false;
    }
  }

  /** Nhận một tài khoản nếu chưa ai giữ lease (lệnh `start` từ API gọi ngay, không chờ nhịp). */
  async claim(accountId: string, ws?: string): Promise<void> {
    if (this.held.has(accountId) || this.closing) return;
    if (this.ms() - (this.failedAt.get(accountId) ?? 0) < RETRY_AFTER_MS) return;
    const wsId = ws ?? (await this.d.platform.tenantChannelRoute.findUnique({ where: { channelAccountId: accountId }, select: { workspaceId: true } }))?.workspaceId;
    if (!wsId || !(await this.d.leases.acquire(accountId))) return;
    let db: TenantDb;
    try {
      db = await this.db(wsId);
    } catch {
      // Workspace không còn / chưa sẵn sàng → nhả lease, thử lại sau RETRY_AFTER_MS.
      await this.d.leases.release(accountId);
      this.failedAt.set(accountId, this.ms());
      return;
    }
    try {
      const row = await db.channelAccount.findUnique({ where: { id: accountId } });
      const adapter = row && this.d.registry.get(row.type)?.adapter;
      if (!row || !adapter?.start || adapter.manifest.session !== 'lease' || row.status !== 'connected' || row.pausedAt || !row.credentialsEnc) {
        // Route lệch với tài khoản (đổi trạng thái chưa kịp ghi route) → sửa route theo DB tenant.
        if (row) await this.d.accounts.route(wsId, row, routeStatusOf(row.status as AccountStatus, row.pausedAt));
        await this.d.leases.release(accountId);
        return;
      }
      const credentials = JSON.parse(decryptSecret(row.credentialsEnc, this.d.key)) as unknown;
      const generation = (await claimGeneration(db, accountId))!;
      const held: Held = { ws: wsId, adapter, generation };
      this.held.set(accountId, held);
      await adapter.start({ id: row.id, workspaceId: wsId, type: row.type, credentials, settings: { ...settingsOf(row) } }, this.sink(wsId, held));
      this.failedAt.delete(accountId);
      await this.d.onStarted?.(accountId, wsId, adapter, generation);
      this.d.log.info({ account: accountId, type: row.type }, 'channel session started');
    } catch (err) {
      this.held.delete(accountId);
      await this.d.leases.release(accountId);
      if (err instanceof ChannelAuthError) await this.markDown(wsId, accountId, 'expired');
      else this.failedAt.set(accountId, this.ms());
      this.d.log.warn({ account: accountId, err: err instanceof Error ? err.name : 'error' }, 'channel session start failed');
    }
  }

  async control(cmd: ControlOp): Promise<void> {
    if (cmd.op === 'stop') return this.drop(cmd.account_id);
    if (cmd.op === 'start') {
      if (this.closing) return;
      this.failedAt.delete(cmd.account_id);
      return this.claim(cmd.account_id);
    }
    // `sync` của kênh lease: lịch sử là lệnh bền `channel_history_run` (TIP-014b C) — pub/sub chỉ đánh thức, không làm gì ở đây.
  }

  /**
   * Dừng phiên (`release=false` khi lease đã mất). Thứ tự: bỏ khỏi danh sách giữ (callback của phiên này bị fence) → đóng worker gửi /
   * thao tác (chờ job đang chạy ghi xong biên nhận bền) → dừng listener → fence thế hệ (chỉ khi DB còn thế hệ của mình) → nhả lease.
   */
  async drop(accountId: string, release = true): Promise<void> {
    const h = this.held.get(accountId);
    if (!h) return;
    this.held.delete(accountId);
    await this.d.onStopped?.(accountId);
    await h.adapter.stop?.(accountId).catch(() => undefined);
    await fenceGeneration(await this.db(h.ws), accountId, h.generation).catch((err: unknown) => this.d.log.warn({ err, account: accountId }, 'channel generation fence failed'));
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

  /** Callback của phiên đã thay / đã dừng (thế hệ cũ) → bỏ, không đẩy tin / sự kiện nữa. */
  private live(accountId: string, held: Held): boolean {
    return this.held.get(accountId) === held;
  }

  private sink(ws: string, held: Held): InboundSink {
    return {
      push: async (m: NormalizedInbound) => {
        if (!this.live(m.channelAccountId, held)) throw new Error('stale_session');
        // Job id ổn định = chống trùng ở hàng đợi (lớp DB: UNIQUE(channel_account_id, external_msg_id) — TIP-016).
        const id = `in-${m.channelAccountId}-${m.externalMsgId}`.replaceAll(':', '_');
        await this.d.inbound.add('inbound', { ws, message: m }, { jobId: id, attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 });
        await this.touch(ws, m.channelAccountId);
      },
      event: async (e) => {
        if (!this.live(e.accountId, held)) throw new Error('stale_session');
        if (this.d.providerEvents) await enqueueProviderEvent(this.d.providerEvents, ws, e);
      },
      status: (accountId: string, health: HealthStatus, detail?: string) => {
        if (!this.live(accountId, held)) return;
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

  private ms(): number {
    return this.d.now().getTime();
  }

  private db(ws: string): Promise<TenantDb> {
    return this.d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
  }
}

