// TenantDbResolver.get(ctx) — cổng duy nhất tới DB tenant (Blueprint §2.0, tenant-db §4).
// Kiểm context đã xác thực TRƯỚC khi tra registry / mở kết nối; cache registry 60s; LRU client theo workspace.
import { withDatabase } from './env';
import { createTenantDb, type TenantDb } from './clients';
import { assertTenantDbName } from './db-name';
import { TenantContextError, WorkspaceNotFoundError, WorkspaceUnavailableError } from './errors';
import { IdleLru } from './lru';
import type { WorkspaceDbInfo, WorkspaceRegistry } from './registry';
import { isVerifiedContext, type TenantContext } from './tenant-context';

export interface TenantResolverOptions {
  registry: WorkspaceRegistry;
  /** URL appchat_tenant_app; tên DB thay theo registry. */
  baseUrl: string;
  poolMax?: number;
  cacheSize?: number;
  idleMs?: number;
  registryTtlMs?: number;
  now?: () => number;
  /** Cho test thay cách tạo client. */
  createClient?: (url: string, poolMax: number) => TenantDb;
}

export class TenantDbResolver {
  private readonly clients: IdleLru<TenantDb>;
  private readonly info = new Map<string, { at: number; row: WorkspaceDbInfo | null }>();
  private readonly now: () => number;
  private timer: NodeJS.Timeout | undefined;
  private gen: { at: number; value: bigint } | null = null;

  constructor(private readonly opts: TenantResolverOptions) {
    this.now = opts.now ?? Date.now;
    this.clients = new IdleLru<TenantDb>({
      max: opts.cacheSize ?? 100,
      idleMs: opts.idleMs ?? 600_000,
      now: this.now,
      onEvict: (_k, db) => db.$disconnect(),
    });
  }

  /** Bật dọn client idle định kỳ (api / worker gọi lúc boot). Chu kỳ mặc định = nửa `idleMs` (≤ 60 giây) — idle ngắn thì quét dày. */
  startSweeper(everyMs = Math.min(60_000, Math.max(1_000, Math.floor((this.opts.idleMs ?? 600_000) / 2)))): void {
    this.timer ??= setInterval(() => this.clients.sweep(), everyMs);
    this.timer.unref();
  }

  async get(ctx: TenantContext): Promise<TenantDb> {
    if (!isVerifiedContext(ctx)) throw new TenantContextError();
    const row = await this.lookup(ctx.workspaceId);
    if (!row) throw new WorkspaceNotFoundError(ctx.workspaceId);
    if (row.dbStatus !== 'active') throw new WorkspaceUnavailableError(ctx.workspaceId, row.dbStatus);

    const key = `${row.dbHost ?? ''}/${assertTenantDbName(row.dbName)}`;
    const hit = this.clients.get(key);
    if (hit) return hit;
    const make = this.opts.createClient ?? createTenantDb;
    const db = make(withDatabase(this.opts.baseUrl, row.dbName, row.dbHost), this.opts.poolMax ?? 3);
    this.clients.set(key, db);
    return db;
  }

  /** Bỏ cache registry của workspace (đổi db_status / chuyển host). */
  invalidate(workspaceId: string): void {
    this.info.delete(workspaceId);
  }

  get openClients(): number {
    return this.clients.size;
  }

  sweepIdle(): number {
    return this.clients.sweep();
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.clients.clear();
  }

  /** Thế hệ trạng thái đổi (tiến trình khác tạm dừng / mở lại workspace) → bỏ toàn bộ cache registry; kiểm tối đa mỗi 2 giây. */
  private async refreshGeneration(): Promise<void> {
    const g = this.opts.registry.generation;
    if (!g || (this.gen && this.now() - this.gen.at < 2_000)) return;
    const value = await g.call(this.opts.registry);
    if (this.gen && this.gen.value !== value) this.info.clear();
    this.gen = { at: this.now(), value };
  }

  private async lookup(workspaceId: string): Promise<WorkspaceDbInfo | null> {
    await this.refreshGeneration();
    const ttl = this.opts.registryTtlMs ?? 60_000;
    const c = this.info.get(workspaceId);
    if (c && this.now() - c.at < ttl) return c.row;
    const row = await this.opts.registry.find(workspaceId);
    // Chỉ cache workspace `active`: đang khởi tạo / khôi phục thì tra lại mỗi lần — worker ở tiến trình khác đổi trạng thái,
    // cache 60s sẽ giữ 503 WORKSPACE_UNAVAILABLE tới một phút sau khi DB đã sẵn sàng (TIP-011).
    if (row?.dbStatus === 'active') this.info.set(workspaceId, { at: this.now(), row });
    else this.info.delete(workspaceId);
    return row;
  }
}
