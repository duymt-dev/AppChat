// Trang xem báo giá công khai (COMMERCE §3 "Link xem báo giá ghi nhận viewed"): `GET /v1/public/quotes/:token` (không đăng nhập —
// token ký HMAC theo APP_ENC_KEY, sai → 404) trả dữ liệu cho khách + ghi nhận lần xem đầu; `GET /v1/public/quotes/:token/pdf` tải
// PDF đã đóng băng lúc gửi. Không có ghi chú / trao đổi nội bộ / người phụ trách nội bộ.
import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import { QuotesReadService } from '@appchat/core';
import { sendPdf } from './quotes.controller';

@Controller('public/quotes')
export class PublicQuotesController {
  constructor(@Inject(QuotesReadService) private readonly read: QuotesReadService) {}

  @Get(':token')
  async view(@Param('token') token: string) {
    return { data: await this.read.publicView(token.slice(0, 200)) };
  }

  @Get(':token/pdf')
  async pdf(@Param('token') token: string, @Res() res: ServerResponse) {
    const r = await this.read.publicPdf(token.slice(0, 200));
    sendPdf(res, r.name, r.pdf, 'attachment');
  }
}
