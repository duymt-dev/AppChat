// POST /hooks/integrations/:connector/:connectionId (provider-ports §6; ngoài tiền tố /v1 — prefix.ts): public, không JWT.
// Chữ ký kiểm trong adapter trên body gốc (rawBody); lưu sự kiện thô idempotent rồi trả 200 nhanh — xử lý ở queue.
import { Controller, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { IntegrationWebhooks } from '@appchat/core';
import { AppError } from '@appchat/shared';

const MAX_BODY = 256 * 1024;

@Controller('hooks/integrations')
export class IntegrationHooksController {
  constructor(@Inject(IntegrationWebhooks) private readonly hooks: IntegrationWebhooks | null) {}

  @Post(':connector/:connectionId')
  @HttpCode(200)
  async receive(@Param('connector') connector: string, @Param('connectionId') connectionId: string, @Req() req: RawBodyRequest<IncomingMessage>) {
    if (!this.hooks) throw new AppError('NOT_FOUND', 404);
    const raw = req.rawBody;
    if (!raw || raw.length > MAX_BODY) throw new AppError('VALIDATION_FAILED', 400, { body: raw ? 'too_large' : 'missing' });
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    return { data: await this.hooks.receive(connector, connectionId, { headers, rawBody: raw.toString('utf8') }) };
  }
}
