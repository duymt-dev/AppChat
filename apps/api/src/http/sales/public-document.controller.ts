// Trang chứng từ công khai (TIP-032b P2): `GET /v1/public/documents/:token` (thông tin hiển thị) và `/pdf` (tải đúng tệp đã gửi). Không
// đăng nhập — token ký HMAC miền "doc:", platform `commerce_link` định tuyến workspace; hỏng / hết hạn / thu hồi → 410 một kiểu.
// Header an toàn: no-store, nosniff, tải về dạng attachment (không mở inline nội dung thực thi được).
import { Controller, Get, Inject, Param, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PublicDocumentService } from '@appchat/core';
import { clientIp } from '../identity/http-util';
import { sendPdf } from './quotes.controller';

@Controller('public/documents')
export class PublicDocumentController {
  constructor(@Inject(PublicDocumentService) private readonly docs: PublicDocumentService) {}

  @Get(':token')
  async view(@Req() req: IncomingMessage, @Param('token') token: string, @Res({ passthrough: true }) res: ServerResponse) {
    res.setHeader('cache-control', 'no-store');
    return { data: await this.docs.view(token, clientIp(req) ?? null) };
  }

  @Get(':token/pdf')
  async pdf(@Req() req: IncomingMessage, @Param('token') token: string, @Res() res: ServerResponse) {
    const f = await this.docs.file(token, clientIp(req) ?? null);
    sendPdf(res, f.name, f.body, 'attachment');
  }
}
