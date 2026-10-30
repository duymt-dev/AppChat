// Adapter LoggerService của Nest → pino (log khởi động, lỗi framework đi cùng một luồng JSON).
import type { LoggerService } from '@nestjs/common';
import type { AppLogger } from './logger';

export class PinoNestLogger implements LoggerService {
  constructor(private readonly out: AppLogger) {}

  log(message: unknown, context?: string): void {
    this.out.info({ context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string): void {
    this.out.error({ context, stack: trace }, String(message));
  }
  warn(message: unknown, context?: string): void {
    this.out.warn({ context }, String(message));
  }
  debug(message: unknown, context?: string): void {
    this.out.debug({ context }, String(message));
  }
  verbose(message: unknown, context?: string): void {
    this.out.trace({ context }, String(message));
  }
}
