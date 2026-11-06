// Huỷ nhận tin công khai (TIP-037): GET /v1/public/campaign-unsubscribe/:token — chỉ đọc (tên doanh nghiệp + đã huỷ chưa); POST …/confirm
// — action hệ thống campaign.unsubscribe qua Executor (token kiểm ở server; không nhận contact_id / workspace). Không log token; giới hạn tần
// suất theo nhóm `/v1/public/*` (api-rate-limit.guard).
import { Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { UnsubscribeService } from '@appchat/core';

@Controller('public/campaign-unsubscribe')
export class MarketingUnsubscribeController {
  constructor(@Inject(UnsubscribeService) private readonly svc: UnsubscribeService) {}

  @Get(':token')
  async view(@Param('token') token: string) {
    return { data: await this.svc.view(token) };
  }

  @Post(':token/confirm')
  @HttpCode(200)
  async confirm(@Param('token') token: string) {
    return { data: await this.svc.confirm(token) };
  }
}
