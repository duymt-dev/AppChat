// traceId mỗi request (ops §1.3): nhận X-Request-Id hợp lệ hoặc sinh uuidv7, trả lại header, chạy request trong RequestContext,
// log một dòng `info` khi request kết thúc (method, path, status, ms). Query string không vào log (có thể chứa PII).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RequestContext, acceptTraceId, uuidv7, type AppLogger } from '@appchat/core';

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
      });
      next();
    });
  };
}
