// POST /hooks/tenant-payments/:provider/:feedId (Blueprint §4.7; ngoài tiền tố /v1): tiền khách của DN về tài khoản DN (SePay / Casso).
// Public, không JWT; adapter kiểm chữ ký bằng bí mật của feed trên body gốc; idempotent theo mã giao dịch provider (TIP-032).
import { Controller, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TenantBankHook } from '@appchat/core';
import { AppError } from '@appchat/shared';

const MAX_BODY = 64 * 1024;

@Controller('hooks/tenant-payments')
export class TenantPaymentsHookController {
  constructor(@Inject(TenantBankHook) private readonly hook: TenantBankHook | null) {}

  @Post(':provider/:feedId')
  @HttpCode(200)
  async receive(@Param('provider') provider: string, @Param('feedId') feedId: string, @Req() req: RawBodyRequest<IncomingMessage>) {
    if (!this.hook) throw new AppError('NOT_FOUND', 404);
    const raw = req.rawBody;
    if (!raw || raw.length > MAX_BODY) throw new AppError('VALIDATION_FAILED', 400, { body: raw ? 'too_large' : 'missing' });
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    return { data: await this.hook.receive(provider, feedId, headers, raw.toString('utf8')) };
  }
}
