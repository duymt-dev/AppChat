// Việc dữ liệu nặng (TIP-045b annex D): GET /v1/data-jobs/:id (trạng thái + đếm từ biên nhận + link tải khi còn hợp lệ), /:id/items
// (biên nhận theo seq, `?only=failed`, con trỏ), /:id/download (tệp xuất — chỉ người tạo, còn quyền, trong 24 giờ, chính sách trường không
// đổi; khác → 404 / 410). Đọc không xếp việc / chạy lại; huỷ và thử lại là action `data_job.cancel` / `data_job.retry` qua ActionExecutor.
import { Controller, Get, Inject, Optional, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DataJobStatusService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from './request-actor';

@Controller('data-jobs')
export class DataJobsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Optional() @Inject(DataJobStatusService) private readonly jobs: DataJobStatusService | null,
  ) {}

  private svc(): DataJobStatusService {
    if (!this.jobs) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'DataJobStatusService chưa cấu hình');
    return this.jobs;
  }

  @Get(':id')
  async status(@Param('id') id: string, @Req() req: IncomingMessage) {
    return { data: await this.svc().status(await this.actors.resolve(req), id) };
  }

  @Get(':id/items')
  async items(@Param('id') id: string, @Query() q: Record<string, string | undefined>, @Req() req: IncomingMessage) {
    const limit = q.limit === undefined || q.limit === '' ? undefined : Number(q.limit);
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    if (q.only !== undefined && q.only !== 'failed') throw new AppError('VALIDATION_FAILED', 400, { only: 'invalid' });
    return this.svc().items(await this.actors.resolve(req), id, { cursor: q.cursor, limit, only: q.only });
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: IncomingMessage, @Res() res: ServerResponse) {
    const f = await this.svc().download(await this.actors.resolve(req), id);
    res.setHeader('content-type', f.mime);
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    res.end(f.body);
  }
}
