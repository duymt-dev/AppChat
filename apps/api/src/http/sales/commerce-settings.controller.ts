// Chính sách bán hàng (TIP-032b P1): `GET /v1/settings/sales-policy` — ngưỡng duyệt báo giá của workspace + trần giảm giá agent (AI
// Governance). Quyền xem trong service (quote.view hoặc settings.manage); ghi qua action `sales_settings.update` (Chủ sở hữu).
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CommerceSettingsService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('settings')
export class CommerceSettingsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CommerceSettingsService) private readonly svc: CommerceSettingsService | null,
  ) {}

  @Get('sales-policy')
  async get(@Req() req: IncomingMessage) {
    if (!this.svc) throw new AppError('NOT_IMPLEMENTED', 501);
    return { data: await this.svc.get(await this.actors.resolve(req)) };
  }
}
