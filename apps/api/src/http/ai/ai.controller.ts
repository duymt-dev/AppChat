// Runtime AI (TIP-019, Blueprint §4.4 ai): GET /v1/settings/ai (Cài đặt › Mô hình AI — `ai.governance`, mức theo gói + credit / 1k token
// rẻ nhất mỗi mức) · GET /v1/runs?root_run_id=&status= (khung "Trợ lý AI đang điều phối" — `assistant.use`). Ghi: ai_settings.update, run.cancel.
import { Controller, Get, Inject, Optional, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CLOCK, KB_EMBEDDER, PLATFORM_DB, ProviderStore, QuotaService, TENANT_RESOLVER, aiSettingsDto, listRuns, readAiSetting, readKbWithIndex, runScope, type Clock, type RunFilter } from '@appchat/core';
import type { Embedder } from '@appchat/ai';
import type { PlatformDb } from '@appchat/db';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type PermissionKey } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['live', 'running', 'waiting_approval', 'done'] as const;

@Controller()
export class AiController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(QuotaService) private readonly quota: QuotaService,
    @Inject(ProviderStore) private readonly providers: ProviderStore | null,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Optional() @Inject(KB_EMBEDDER) private readonly embedder: Embedder | null = null,
    @Optional() @Inject(CLOCK) private readonly clock: Clock | null = null,
  ) {}

  private async db(req: IncomingMessage, perm: PermissionKey) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return { a, db: await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId)) };
  }

  @Get('settings/ai')
  async settings(@Req() req: IncomingMessage) {
    const { a, db } = await this.db(req, 'ai.governance');
    const [row, limits, credits] = await Promise.all([readAiSetting(db), this.quota.limits(a.workspaceId), this.providers?.tierCredits() ?? {}]);
    return { data: aiSettingsDto(row, limits.planKey, credits) };
  }

  @Get('runs')
  async runs(@Req() req: IncomingMessage, @Query('root_run_id') root?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    const { a, db } = await this.db(req, 'assistant.use');
    if (root && !UUID.test(root)) return { data: [], next_cursor: null };
    if (status && status !== 'all' && !(STATUSES as readonly string[]).includes(status)) throw new AppError('VALIDATION_FAILED', 400, { status: 'invalid' });
    const n = limit === undefined ? undefined : Number(limit);
    if (n !== undefined && (!Number.isInteger(n) || n < 1)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    const f: RunFilter = { ...runScope(a.authz), ...(root ? { rootRunId: root } : {}), ...(status && status !== 'all' ? { status: status as RunFilter['status'] } : {}), ...(n ? { limit: n } : {}) };
    return { data: await listRuns(db, f), next_cursor: null };
  }

  @Get('settings/kb')
  async kb(@Req() req: IncomingMessage, @Query('nav') nav?: string, @Query('folder') folder?: string, @Query('q') q?: string) {
    const { a, db } = await this.db(req, 'kb.manage');
    if (folder && !UUID.test(folder)) folder = undefined;
    const names = async (ids: string[]) =>
      new Map((ids.length ? await this.platform.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : []).map((u) => [u.id, u.name || u.email]));
    // TIP-020e: kèm trạng thái chỉ mục embedding (đánh dấu cũ khi route embed đổi — không tự chạy job trả tiền).
    return { data: await readKbWithIndex(db, a.workspaceId, { nav: nav ?? 'all', folder: folder ?? null, q: (q ?? '').slice(0, 100) }, names, this.embedder, this.clock?.now() ?? new Date()) };
  }
}
