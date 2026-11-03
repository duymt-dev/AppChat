// Cổng dịch vụ Trợ lý cho controller HTTP (TIP-023): gom phụ thuộc (executor, runner, Redis, gói) và mở DB tenant theo người gọi.
// Thiếu runtime AI (chưa có engine) → lượt hội thoại 501; phần đọc (home, phiên, nhật ký) vẫn chạy.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb, TenantDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import { QuotaService } from '../../billing/public';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ActionExecutor } from '../../kernel/actions/executor';
import { REDIS, type KeyValueStore } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AiRunner } from '../runs/runner';
import { listActionLogs, type LogFilter } from './action-logs.read';
import { editPreview } from './edit-preview';
import { assistantHome } from './home.read';
import { runTrace } from './run-trace.read';
import { listSessions, sessionMessages } from './sessions';
import { assistantConfirm, assistantTurn, type AssistantDeps, type ConfirmRequest, type TurnRequest } from './turn.service';

export interface Caller {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

@Injectable()
export class AssistantService {
  constructor(
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | null,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(REDIS) private readonly kv: KeyValueStore | null,
    @Inject(QuotaService) private readonly quota: QuotaService | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private db(c: Caller): Promise<TenantDb> {
    if (!this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'Tenant DB chưa cấu hình');
    return this.tenants.get(TenantContexts.fromMembership(c.workspaceId, c.userId));
  }

  private deps(): AssistantDeps {
    if (!this.executor || !this.runner || !this.kv) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019' }, 'AI runtime chưa cấu hình');
    const quota = this.quota;
    return { executor: this.executor, runner: this.runner, kv: this.kv, now: () => this.clock.now(), planKey: async (ws) => (quota ? (await quota.limits(ws)).planKey : 'free') };
  }

  /** Tên, locale, vai trò của người gọi (system prompt + ngôn ngữ trả lời). */
  async profile(c: Caller): Promise<{ name: string; locale: string; role: string }> {
    const [u, m] = this.platform
      ? await Promise.all([
          this.platform.user.findUnique({ where: { id: c.userId }, select: { name: true, locale: true } }),
          this.platform.membership.findUnique({ where: { workspaceId_userId: { workspaceId: c.workspaceId, userId: c.userId } }, select: { roleKey: true } }),
        ])
      : [null, null];
    return { name: u?.name ?? '', locale: u?.locale ?? 'vi', role: c.authz.isOwner ? 'owner' : (m?.roleKey ?? 'member') };
  }

  async turn(c: Caller, q: Omit<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'>) {
    const deps = this.deps();
    const p = await this.profile(c);
    return assistantTurn(deps, await this.db(c), { ...q, ws: c.workspaceId, userId: c.userId, authz: c.authz, userName: p.name, locale: p.locale, role: p.role });
  }

  async confirm(c: Caller, q: Pick<ConfirmRequest, 'token' | 'decision'>) {
    return assistantConfirm(this.deps(), await this.db(c), { ...q, ws: c.workspaceId, userId: c.userId, authz: c.authz });
  }

  /** Sửa thẻ xem trước (REQ-E03b): chỉ xem trước lại → thẻ mới, token cũ mất hiệu lực. */
  async editPreview(c: Caller, token: string, input: Record<string, unknown>) {
    const d = this.deps();
    const p = await this.profile(c);
    return editPreview({ executor: d.executor, kv: d.kv, now: d.now }, await this.db(c), { ws: c.workspaceId, userId: c.userId, authz: c.authz, role: p.role, token, input });
  }

  async home(c: Caller) {
    return assistantHome(await this.db(c), (await this.profile(c)).locale);
  }

  async sessions(c: Caller, q: string) {
    return listSessions(await this.db(c), c.userId, q);
  }

  async messages(c: Caller, id: string) {
    return sessionMessages(await this.db(c), c.userId, id);
  }

  /** Vết run của chính người gọi (bộ câu thử model thật — TIP-023b R1.4). */
  async trace(c: Caller, runId: string) {
    return runTrace(await this.db(c), c.userId, runId);
  }

  async actionLogs(c: Caller, f: Omit<LogFilter, 'locale'>) {
    return listActionLogs(await this.db(c), c.authz, { ...f, locale: (await this.profile(c)).locale }, this.clock.now());
  }
}
