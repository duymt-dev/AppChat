// `GET /metrics` của API (TIP-045b annex B, Blueprint §11): ngoài tiền tố /v1, chỉ trả cho loopback không qua proxy hoặc Bearer
// `METRICS_TOKEN` (Prometheus cùng máy) — còn lại 404 như route không tồn tại. nginx không chuyển `/metrics` ra ngoài (infra).
import { Controller, Get, Inject, Optional, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ENV_SOURCE, metricsAllowed, renderMetrics } from '@appchat/core';

@Controller('metrics')
export class MetricsController {
  constructor(@Optional() @Inject(ENV_SOURCE) private readonly env?: Record<string, string | undefined>) {}

  @Get()
  async metrics(@Req() req: IncomingMessage, @Res() res: ServerResponse): Promise<void> {
    if (!metricsAllowed(req, (this.env ?? process.env).METRICS_TOKEN)) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
      return;
    }
    const r = await renderMetrics();
    res.setHeader('content-type', r.contentType);
    res.setHeader('cache-control', 'no-store');
    res.end(r.body);
  }
}
