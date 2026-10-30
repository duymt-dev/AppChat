// Dựng Nest app (dùng chung main.ts và test): prefix /v1, logger pino, middleware trace, filter envelope lỗi.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { LOGGER, PinoNestLogger, type AppLogger } from '@appchat/core';
import { AppModule } from './app.module';
import { traceMiddleware } from './middleware/trace.middleware';
import { EnvelopeErrorFilter } from './http/kernel/error.filter';

export async function createApi(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule.forRoot(), { bufferLogs: true });
  const log = app.get<AppLogger>(LOGGER);
  app.useLogger(new PinoNestLogger(log));
  app.setGlobalPrefix('v1');
  app.use(traceMiddleware(log));
  app.useGlobalFilters(new EnvelopeErrorFilter(log));
  app.enableShutdownHooks();
  return app;
}
