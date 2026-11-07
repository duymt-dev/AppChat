// Audit workspace (TIP-045b annex A2): GET /v1/settings/audit · /v1/settings/ai-audit — cần `audit.view` + membership hiện tại (resolver
// đọc epoch / owner từ DB). Không tham số → mảng (tương thích bản trước, trang đầu); có `page=1` / `cursor` / bộ lọc → `{ data, next_cursor }`.
// Đọc audit không tự ghi audit. Audit nền tảng của admin (platform_audit_log) không phục vụ ở đây.
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { AuditReadService, PLATFORM_DB, TENANT_RESOLVER } from '@appchat/core';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError, auditQuerySchema, type AuditQuery } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from './request-actor';

type Raw = Record<string, string | undefined>;

@Controller()
export class AuditController {
  private readonly read: AuditReadService;

  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(PLATFORM_DB) platform: PlatformDb,
  ) {
    this.read = new AuditReadService(platform);
  }

  private async open(req: IncomingMessage, raw: Raw) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('audit.view')) throw new AppError('FORBIDDEN', 403, { permission: 'audit.view' });
    const p = auditQuerySchema.safeParse(Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== '')));
    if (!p.success) throw new AppError('VALIDATION_FAILED', 400, Object.fromEntries(p.error.issues.map((i) => [String(i.path[0] ?? 'query'), 'invalid'])));
    const paged = Object.keys(p.data).length > 0;
    return { a, q: p.data as AuditQuery, paged, db: await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId)) };
  }

  @Get('settings/audit')
  async audit(@Req() req: IncomingMessage, @Query() raw: Raw) {
    const { a, q, paged, db } = await this.open(req, raw);
    const page = await this.read.workspaceAudit(db, a.workspaceId, q);
    return paged ? page : { data: page.data };
  }

  @Get('settings/ai-audit')
  async aiAudit(@Req() req: IncomingMessage, @Query() raw: Raw) {
    const { q, paged, db } = await this.open(req, raw);
    const page = await this.read.aiAudit(db, q);
    return paged ? page : { data: page.data };
  }
}
