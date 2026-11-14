// Tệp của hợp đồng (TIP-030b spec 17–18): `GET /v1/contracts/:id/files` (nguồn / bản chưa ký / bản đã ký) và
// `GET /v1/contracts/:id/files/:fileId` tải bytes thật (đúng tên + mime). Quyền `contract.view` (hoặc `contract.draft`); data scope sales
// + tệp thuộc đúng hợp đồng kiểm trong service. Ghi tệp nguồn qua action `contract.create` / `contract.attach_file`.
import { Controller, Get, Inject, Param, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ContractsReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('contracts/:id/files')
export class ContractFilesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(ContractsReadService) private readonly read: ContractsReadService,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    const p = a.authz.permissions;
    if (!a.authz.isOwner && !p.has('contract.view') && !p.has('contract.draft')) throw new AppError('FORBIDDEN', 403, { permission: 'contract.view' });
    return a;
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.files(await this.viewer(req), id) };
  }

  @Get(':fileId')
  async download(@Req() req: IncomingMessage, @Param('id') id: string, @Param('fileId') fileId: string, @Res() res: ServerResponse) {
    if (!UUID.test(fileId)) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const f = await this.read.file(await this.viewer(req), id, fileId);
    res.setHeader('content-type', f.row.mime);
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.row.name)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    res.end(f.body);
  }
}
