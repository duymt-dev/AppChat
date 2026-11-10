// GET /v1/docs (JSON OpenAPI 3.1) + /v1/docs/ui (trang tĩnh tối giản, không CDN / script ngoài) — TIP-003d. Bật khi không phải production
// hoặc `API_DOCS=1`; tắt → 404 như route không tồn tại. Document dựng một lần mỗi tiến trình (route + registry cố định sau boot), cache
// theo SHA build (`APP_BUILD_SHA`, ETag + 304). Trang UI render sẵn ở server (bảng method / path / tag), không script / style ngoài —
// chạy được dưới CSP `default-src 'none'` chung của API (cors-policy.ts).
import { Controller, Get, Header, Inject, Optional, Req, Res } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isInternalAction, registry } from '@appchat/actions';
import { ENV_SOURCE } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { buildDocument, type OpenApiDocument } from '../../openapi/document';
import { scanRoutes } from '../../openapi/route-scan';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Docs bật khi không phải production, hoặc production có `API_DOCS=1`. */
export const docsEnabled = (env: Record<string, string | undefined>) => env.API_DOCS === '1' || (env.NODE_ENV !== 'production' && env.API_DOCS !== '0');

@Controller('docs')
export class OpenApiController {
  private doc: OpenApiDocument | null = null;
  private readonly env: Record<string, string | undefined>;

  constructor(
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
    @Optional() @Inject(ENV_SOURCE) env: Record<string, string | undefined> | null = null,
  ) {
    this.env = env ?? process.env;
  }

  private version = () => this.env.APP_BUILD_SHA || 'dev';

  private document(): OpenApiDocument {
    if (!docsEnabled(this.env)) throw new AppError('NOT_FOUND', 404, { route: 'not_found' });
    return (this.doc ??= buildDocument({ routes: scanRoutes(this.discovery), actions: registry.filter((a) => !isInternalAction(a)), version: this.version() }));
  }

  @Get()
  json(@Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    const doc = this.document();
    const etag = `"oas-${this.version()}"`;
    res.setHeader('etag', etag);
    res.setHeader('cache-control', 'private, max-age=300');
    if (req.headers['if-none-match'] === etag) {
      res.statusCode = 304;
      return undefined;
    }
    return doc;
  }

  @Get('ui')
  @Header('content-type', 'text/html; charset=utf-8')
  ui(): string {
    const doc = this.document();
    const rows = Object.entries(doc.paths)
      .flatMap(([path, ops]) => Object.entries(ops).map(([m, op]) => ({ m, path, tag: String((op.tags as string[])[0] ?? ''), untyped: op['x-untyped'] === true, risk: op['x-risk'] as string | undefined })))
      .map((r) => `<tr><td>${esc(r.tag)}</td><td><b>${r.m.toUpperCase()}</b></td><td><code>${esc(r.path)}</code></td><td>${r.risk ? esc(r.risk) : r.untyped ? 'untyped' : ''}</td></tr>`)
      .join('');
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.info.title)} ${esc(doc.info.version)}</title></head><body><h1>${esc(doc.info.title)}</h1><p>${esc(doc.info.description)} · JSON: <a href="../docs">/v1/docs</a></p><table border="1" cellpadding="4">${rows}</table></body></html>`;
  }
}
