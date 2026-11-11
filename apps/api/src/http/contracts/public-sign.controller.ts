// Trang ký công khai (COMMERCE §9 C1; Blueprint §4.4 public): không đăng nhập — token một lần; rate limit theo token + IP trong
// service. GET `/:token` + `/pdf` CHỈ ĐỌC (TIP-030c). POST `/open` / `/otp` / `/sign` / `/decline` mang `request_id` (UUID) — ghi qua action
// chuẩn (capability niêm phong). `POST /v1/public/sign/:token/open` (ghi nhận một lần mỗi request_id),
// `/otp`, `/sign {otp, signature_png, consent:true}`, `/decline {reason?}`, `GET /:token/pdf`. Không lộ dữ liệu nội bộ.
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PublicSignService, type SignClient } from '@appchat/core';
import { clientIp } from '../identity/http-util';
import { sendPdf } from '../sales/quotes.controller';

const clientOf = (req: IncomingMessage): SignClient => {
  const ua = req.headers['user-agent'];
  return { ip: clientIp(req) ?? null, userAgent: (Array.isArray(ua) ? ua[0] : ua)?.slice(0, 300) ?? null };
};
const obj = (b: unknown) => (b && typeof b === 'object' ? (b as Record<string, unknown>) : {});

@Controller('public/sign')
export class PublicSignController {
  constructor(@Inject(PublicSignService) private readonly sign: PublicSignService) {}

  @Get(':token')
  async get(@Param('token') token: string, @Req() req: IncomingMessage) {
    return { data: await this.sign.read(token, clientOf(req)) };
  }

  @Post(':token/open')
  @HttpCode(200)
  async open(@Param('token') token: string, @Req() req: IncomingMessage, @Body() body: unknown) {
    return { data: await this.sign.open(token, clientOf(req), obj(body).request_id) };
  }

  @Post(':token/otp')
  @HttpCode(200)
  async otp(@Param('token') token: string, @Req() req: IncomingMessage, @Body() body: unknown) {
    return { data: await this.sign.otp(token, clientOf(req), obj(body).request_id) };
  }

  @Post(':token/sign')
  @HttpCode(200)
  async doSign(@Param('token') token: string, @Req() req: IncomingMessage, @Body() body: unknown) {
    return { data: await this.sign.sign(token, clientOf(req), obj(body)) };
  }

  @Post(':token/decline')
  @HttpCode(200)
  async decline(@Param('token') token: string, @Req() req: IncomingMessage, @Body() body: unknown) {
    const b = obj(body);
    return { data: await this.sign.decline(token, clientOf(req), b.request_id, typeof b.reason === 'string' ? b.reason : undefined) };
  }

  @Get(':token/pdf')
  async pdf(@Param('token') token: string, @Req() req: IncomingMessage, @Res() res: ServerResponse) {
    const r = await this.sign.pdf(token, clientOf(req));
    sendPdf(res, r.name, r.pdf, 'attachment');
  }
}
