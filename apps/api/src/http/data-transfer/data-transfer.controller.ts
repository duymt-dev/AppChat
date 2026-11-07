// Đọc nhập / xuất dữ liệu (TIP-038b, DC-374): `GET /v1/data-transfer/capabilities` (thực thể × quyền người gọi), `/plans/:id` (kế hoạch
// của chính người gọi — người khác 404), `/plans/:id/rows?check&cursor&limit` (dòng xem trước / lỗi, keyset). Ghi là action `transfer.*`
// qua ActionExecutor (`POST /v1/actions/:id`).
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TransferReadService } from '@appchat/core';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('data-transfer')
export class DataTransferController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TransferReadService) private readonly reads: TransferReadService,
  ) {}

  @Get('capabilities')
  async capabilities(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: this.reads.capabilities(a.authz) };
  }

  @Get('plans/:id')
  async plan(@Param('id') id: string, @Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.reads.plan(a.workspaceId, a.userId, id) };
  }

  @Get('plans/:id/rows')
  async rows(
    @Param('id') id: string,
    @Query() q: Record<string, string | undefined>,
    @Req() req: IncomingMessage,
  ) {
    const a = await this.actors.resolve(req);
    return this.reads.rows(a.workspaceId, a.userId, id, { check: q.check, cursor: q.cursor, limit: q.limit });
  }
}
