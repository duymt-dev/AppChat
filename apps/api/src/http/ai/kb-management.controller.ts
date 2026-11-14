// Tải nguồn kho tri thức (TIP-020b): GET /v1/kb/sources/:id/download — quyền `kb.manage`, tenant theo người gọi, nguồn còn sống; file id
// lấy từ nguồn (không nhận file_id tự do). Có tệp / văn bản → byte (Content-Disposition UTF-8, nosniff, no-store); URL / catalog → JSON
// `{ data: { kind, url | product_id } }` để FE mở tab / điều hướng — server không tải lại website (không SSRF).
import { Controller, Get, Inject, Optional, Param, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { FilesService, TENANT_RESOLVER, sourceDownload } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class KbManagementController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Optional() @Inject(FilesService) private readonly files: FilesService | undefined,
  ) {}

  @Get('kb/sources/:id/download')
  async download(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('kb.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'kb.manage' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const d = await sourceDownload(db, this.files ?? null, id);
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    if (d.kind !== 'file') {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ data: d }));
      return;
    }
    res.setHeader('content-type', d.mime);
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(d.name)}`);
    res.end(d.body);
  }
}
