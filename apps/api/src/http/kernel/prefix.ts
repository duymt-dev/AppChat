// Tiền tố route (Blueprint §1.3): API `/v1/*`; webhook nhà cung cấp `/hooks/*` nằm ngoài tiền tố (provider-ports §6 — URL ổn định
// không gắn phiên bản API). Dùng chung main / test.
import { RequestMethod, type INestApplication } from '@nestjs/common';

export function applyPrefix(app: INestApplication): void {
  app.setGlobalPrefix('v1', { exclude: [{ path: 'hooks/{*path}', method: RequestMethod.ALL }] });
}
