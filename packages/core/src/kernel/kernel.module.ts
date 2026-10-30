// Kernel dùng chung api + worker. TIP-001: Clock + logger; TIP-002/003 thêm TenantDb, ActionExecutor, EventBus… vào đây.
import { Global, Module } from '@nestjs/common';
import { CLOCK, SystemClock } from './clock';
import { createLogger } from './logger/logger';

export const LOGGER = Symbol('LOGGER');

@Global()
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: LOGGER, useFactory: () => createLogger({ level: process.env.LOG_LEVEL ?? 'info' }) },
  ],
  exports: [CLOCK, LOGGER],
})
export class KernelModule {}
