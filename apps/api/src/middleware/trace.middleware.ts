// traceId mỗi request (ops §1.3): nhận X-Request-Id hợp lệ hoặc sinh uuidv7, trả lại header, chạy request trong RequestContext,
// log một dòng `info` khi request kết thúc (method, path, status, ms) + metric thời gian theo mẫu route (TIP-045b). Query string không vào
// log (có thể chứa PII).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RequestContext, acceptTraceId, appMetrics, uuidv7, type AppLogger } from '@appchat/core';

export function traceMiddleware(log: AppLogger) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const traceId = acceptTraceId(req.headers['x-request-id']) ?? uuidv7();
    res.setHeader('X-Request-Id', traceId);
    const started = process.hrtime.bigint();
    RequestContext.run({ traceId, source: 'http' }, () => {
      res.on('finish', () => {
        const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
        const path = (req.url ?? '').split('?')[0];
        log.info({ method: req.method, path, status: res.statusCode, ms }, 'request');
        // http_request_duration_seconds theo MẪU route của Nest (vd /v1/contacts/:id) — route lạ / 404 gộp `unmatched` (không nhãn từ URL).
        const route = (req as IncomingMessage & { route?: { path?: string } }).route?.path;
        appMetrics().httpDuration.observe({ route: route ? `/v1${route.startsWith('/') ? '' : '/'}${route}`.replace('/v1/v1', '/v1').slice(0, 80) : 'unmatched', method: req.method ?? 'GET', status: String(res.statusCode) }, ms / 1000);
      });
      next();
    });
  };
}
