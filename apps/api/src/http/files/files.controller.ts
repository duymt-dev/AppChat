// Tệp tải lên (Blueprint §4.4 misc): `POST /v1/files` multipart (`file`, `purpose`) ≤ 25MB → `{ file_id, name, size }` — thành viên
// workspace. Tệp dùng ở action sau (vd. `kb.add_source { file_id }`); `GET /v1/files/:id` tải về (người upload hoặc `kb.manage` khi
// purpose kb). Tên tệp gốc chỉ lưu metadata, không dùng làm đường dẫn lưu trữ. `GET /v1/files/:id/raw?ws=&sig=` (TIP-025): link ký của
// tệp đính kèm tin nhắn — không cần đăng nhập (thẻ <img>, worker kênh tải về khi gửi); ảnh hiện inline, loại khác tải xuống.
// TIP-032d: purpose `record_attachment` (đơn / đề nghị) bắt buộc `parent_type` + `parent_id`, kiểm quyền ghi cha rồi tạo staging; tệp đã
// thuộc bản ghi chỉ tải được khi người xem còn đọc được bản ghi (người tải / Owner không còn là đường tắt), link ký raw từ chối tệp bản ghi.
import { Controller, Get, Inject, Optional, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ENC_KEY, FilesService, MAX_UPLOAD_BYTES, TENANT_RESOLVER, claimedFileAccess, isPrivateRecordFile, uploadRecordAttachment, verifyFileSig } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INLINE = /^image\/(png|jpe?g|gif|webp)$/i;

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
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | null,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async upload(@Req() req: IncomingMessage & { body?: { purpose?: string; parent_type?: string; parent_id?: string } }, @UploadedFile() file?: Upload) {
    const a = await this.actors.resolve(req);
    if (!file) throw new AppError('VALIDATION_FAILED', 422, { file: 'required' });
    const purpose = req.body?.purpose ?? 'attachment';
    if (purpose === 'kb' && !a.authz.isOwner && !a.authz.permissions.has('kb.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'kb.manage' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    // multer giải tên tệp theo latin1 — đổi lại utf8 để giữ tiếng Việt.
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (purpose === 'record_attachment')
      return { data: await uploadRecordAttachment(db, this.files, { ws: a.workspaceId, userId: a.userId, authz: a.authz, parentType: req.body?.parent_type, parentId: req.body?.parent_id, name, mime: file.mimetype, body: file.buffer }) };
    const f = await this.files.upload(db, a.workspaceId, { name, mime: file.mimetype, body: file.buffer, purpose, uploadedBy: a.userId });
    return { data: { file_id: f.id, name: f.name, size: f.size, mime: f.mime } };
  }

  @Get(':id/raw')
  async raw(@Param('id') id: string, @Query('ws') ws: string | undefined, @Query('sig') sig: string | undefined, @Res() res: ServerResponse) {
    if (!this.key || !UUID.test(id) || !ws || !UUID.test(ws) || !sig || !verifyFileSig(this.key, ws, id, sig)) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const db = await this.tenants.get(TenantContexts.system(ws, 'files.raw'));
    if (await isPrivateRecordFile(db, id)) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const f = await this.files.read(db, id);
    if (!f) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    res.setHeader('content-type', f.row.mime);
    res.setHeader('content-disposition', `${INLINE.test(f.row.mime) ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.row.name)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'private, max-age=86400');
    res.end(f.body);
  }

  @Get(':id')
  async download(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const a = await this.actors.resolve(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const row = await db.file.findUnique({ where: { id }, select: { uploadedBy: true, purpose: true } });
    const claimed = row ? await db.$transaction((tx) => claimedFileAccess(tx, a.authz, id)) : null;
    // Tệp thuộc bản ghi: chỉ quyền đọc bản ghi hiện hành; staging chưa gắn: chỉ người tải. Còn lại giữ luật cũ.
    const staged = row && claimed === null && row.purpose === 'record_attachment';
    const allowed = row && (claimed !== null ? claimed : staged ? row.uploadedBy === a.userId : row.uploadedBy === a.userId || a.authz.isOwner || (row.purpose === 'kb' && a.authz.permissions.has('kb.manage')));
    if (!allowed) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const f = (await this.files.read(db, id))!;
    res.setHeader('content-type', f.row.mime);
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.row.name)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    if (row?.purpose === 'record_attachment') res.setHeader('cache-control', 'no-store');
    res.end(f.body);
  }
}
