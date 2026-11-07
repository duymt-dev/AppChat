// Mẫu chứng từ (Blueprint §4.4 `GET /v1/doc-templates?kind=` — shape packages/shared/src/api/documents.ts) + PDF xem trước
// (`GET /v1/doc-templates/:id/preview`, dữ liệu minh hoạ). Quyền `documents.manage` (Cài đặt › Mẫu chứng từ); người tạo báo giá /
// hợp đồng đọc danh sách để chọn mẫu (`quote.create` / `contract.draft`). Ghi qua action doc_template.*.
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DocumentsReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const READERS = ['documents.manage', 'quote.create', 'contract.draft'] as const;

@Controller('doc-templates')
export class DocTemplatesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(DocumentsReadService) private readonly read: DocumentsReadService,
  ) {}

  private async viewer(req: IncomingMessage, perms: readonly string[]) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !perms.some((p) => a.authz.permissions.has(p as never))) throw new AppError('FORBIDDEN', 403, { permission: perms[0]! });
    return { workspaceId: a.workspaceId, userId: a.userId };
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Query('kind') kind?: string) {
    return { data: await this.read.list(await this.viewer(req, READERS), kind || undefined), next_cursor: null };
  }

  @Get(':id/preview')
  async preview(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const r = await this.read.preview(await this.viewer(req, ['documents.manage']), id);
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `inline; filename*=UTF-8''${encodeURIComponent(`${r.name}.pdf`)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    res.end(r.pdf);
  }
}
