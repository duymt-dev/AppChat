// Tệp tải lên (Blueprint §4.4 misc): `POST /v1/files` multipart (`file`, `purpose`) ≤ 25MB → `{ file_id, name, size }` — thành viên
// workspace. Tệp dùng ở action sau (vd. `kb.add_source { file_id }`); `GET /v1/files/:id` tải về (người upload hoặc `kb.manage` khi
// purpose kb). Tên tệp gốc chỉ lưu metadata, không dùng làm đường dẫn lưu trữ.
import { Controller, Get, Inject, Param, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { FilesService, MAX_UPLOAD_BYTES, TENANT_RESOLVER } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Upload {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Controller('files')
export class FilesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async upload(@Req() req: IncomingMessage & { body?: { purpose?: string } }, @UploadedFile() file?: Upload) {
    const a = await this.actors.resolve(req);
    if (!file) throw new AppError('VALIDATION_FAILED', 422, { file: 'required' });
    const purpose = req.body?.purpose ?? 'attachment';
    if (purpose === 'kb' && !a.authz.isOwner && !a.authz.permissions.has('kb.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'kb.manage' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    // multer giải tên tệp theo latin1 — đổi lại utf8 để giữ tiếng Việt.
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const f = await this.files.upload(db, a.workspaceId, { name, mime: file.mimetype, body: file.buffer, purpose, uploadedBy: a.userId });
    return { data: { file_id: f.id, name: f.name, size: f.size, mime: f.mime } };
  }

  @Get(':id')
  async download(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const a = await this.actors.resolve(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const row = await db.file.findUnique({ where: { id }, select: { uploadedBy: true, purpose: true } });
    const allowed = row && (row.uploadedBy === a.userId || a.authz.isOwner || (row.purpose === 'kb' && a.authz.permissions.has('kb.manage')));
    if (!allowed) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const f = (await this.files.read(db, id))!;
    res.setHeader('content-type', f.row.mime);
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.row.name)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    res.end(f.body);
  }
}
