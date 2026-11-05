// Theo dõi lần nhập sản phẩm (TIP-032b): `GET /v1/product-imports/:id` (trạng thái + đếm từ biên nhận), `/rows` và `/errors` (D42 page +
// limit ≤ 100). Chỉ người gọi lần nhập (hoặc Owner) có `catalog.manage` — khác → 404 như không có. Đọc không xếp việc / chạy lại; huỷ và
// chạy lại là action `product.import_cancel` / `product.import_retry` qua ActionExecutor.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { ImportStatusService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};

@Controller('product-imports')
export class ProductImportController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(ImportStatusService) private readonly imports: ImportStatusService,
  ) {}

  @Get(':id')
  async status(@Param('id') id: string, @Req() req: IncomingMessage) {
    return { data: await this.imports.status(await this.actors.resolve(req), id) };
  }

  @Get(':id/rows')
  async rows(@Param('id') id: string, @Query() q: Record<string, string | undefined>, @Req() req: IncomingMessage) {
    return this.imports.rows(await this.actors.resolve(req), id, { page: int(q.page, 'page'), limit: int(q.limit, 'limit') });
  }

  @Get(':id/errors')
  async errors(@Param('id') id: string, @Query() q: Record<string, string | undefined>, @Req() req: IncomingMessage) {
    return this.imports.rows(await this.actors.resolve(req), id, { page: int(q.page, 'page'), limit: int(q.limit, 'limit'), only: 'failed' });
  }
}
