// POST /hooks/payments/:provider (Blueprint §4.7; ngoài tiền tố /v1 — prefix.ts): tiền gói AppChat về tài khoản nền tảng.
// Public, không JWT; adapter kiểm chữ ký trên body gốc; chỉ chạm DB nền tảng; idempotent theo mã giao dịch provider (TIP-010).
import { Controller, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PlatformBankHook } from '@appchat/core';
import { AppError } from '@appchat/shared';

const MAX_BODY = 64 * 1024;

@Controller('hooks/payments')
export class PaymentsHookController {
  constructor(@Inject(PlatformBankHook) private readonly hook: PlatformBankHook | null) {}

  @Post(':provider')
  @HttpCode(200)
  async receive(@Param('provider') provider: string, @Req() req: RawBodyRequest<IncomingMessage>) {
    if (!this.hook) throw new AppError('NOT_FOUND', 404);
    const raw = req.rawBody;
    if (!raw || raw.length > MAX_BODY) throw new AppError('VALIDATION_FAILED', 400, { body: raw ? 'too_large' : 'missing' });
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    return { data: await this.hook.receive(provider, headers, raw.toString('utf8')) };
  }
}
