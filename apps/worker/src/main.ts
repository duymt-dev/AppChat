// Entry worker (Blueprint §1.3): validate env → Nest standalone theo ROLE. Processor BullMQ do TIP chủ domain thêm.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { LOGGER, PinoNestLogger, createLogger, loadEnv, type AppLogger } from '@appchat/core';
import { WorkerModule } from './worker.module';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.createApplicationContext(WorkerModule.forRole(env.ROLE), { bufferLogs: true });
  const log = app.get<AppLogger>(LOGGER).child({ service: 'worker', role: env.ROLE });
  app.useLogger(new PinoNestLogger(log));
  app.enableShutdownHooks();
  log.info('worker started');
}

main().catch((err: unknown) => {
  createLogger({ service: 'worker' }).fatal({ err }, 'worker failed to start');
  process.exit(1);
});
