// Dựng Nest app (dùng chung main.ts và test): prefix /v1 (trừ /hooks), logger pino, middleware trace, lớp bảo vệ HTTP (helmet / CORS /
// giới hạn tốc độ — TIP-045b), filter envelope lỗi.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { LOGGER, PinoNestLogger, type AppLogger } from '@appchat/core';
import { AppModule } from './app.module';
import { traceMiddleware } from './middleware/trace.middleware';
import { EnvelopeErrorFilter } from './http/kernel/error.filter';
import { applyPrefix } from './http/kernel/prefix';
import { applySecurity } from './http/kernel/security.middleware';

export async function createApi(): Promise<INestApplication> {
  // rawBody: webhook kiểm chữ ký trên body gốc (provider-ports §6).
  const app = await NestFactory.create(AppModule.forRoot(), { bufferLogs: true, rawBody: true });
  const log = app.get<AppLogger>(LOGGER);
  app.useLogger(new PinoNestLogger(log));
  applyPrefix(app);
  app.use(traceMiddleware(log));
  applySecurity(app);
  app.useGlobalFilters(new EnvelopeErrorFilter(log));
  app.enableShutdownHooks();
  return app;
}
