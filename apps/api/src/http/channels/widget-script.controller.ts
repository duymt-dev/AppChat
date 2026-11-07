// `GET /widget.js` (ngoài tiền tố /v1 — URL ổn định trong mã nhúng): file widget build sẵn (`apps/widget/dist/widget.js`). Production
// do nginx `widget.<domain>` phục vụ tĩnh (Blueprint §11) — route này cho dev / E2E / máy chủ đơn (DC-089). Không có file → 404.
import { Controller, Get, Res } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { join } from 'node:path';
import { AppError } from '@appchat/shared';

/** `WIDGET_JS_PATH` (env) hoặc bản build trong monorepo (api chạy từ apps/api). */
const scriptPath = () => process.env.WIDGET_JS_PATH ?? join(process.cwd(), '..', 'widget', 'dist', 'widget.js');

@Controller('widget.js')
export class WidgetScriptController {
  private cache?: Buffer;

  @Get()
  async script(@Res() res: ServerResponse): Promise<void> {
    const body = (this.cache ??= await readFile(scriptPath()).catch(() => undefined as unknown as Buffer));
    if (!body) {
      this.cache = undefined;
      throw new AppError('NOT_FOUND', 404, { file: 'widget.js' });
    }
    res.writeHead(200, {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
      // Website khách hàng tải script khác origin.
      'access-control-allow-origin': '*',
      'cross-origin-resource-policy': 'cross-origin',
    });
    res.end(body);
  }
}
