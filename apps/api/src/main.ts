// Entry API (Blueprint §1.3): validate env → dựng app → listen API_PORT.
import { createLogger, loadEnv } from '@appchat/core';
import { createApi } from './bootstrap';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await createApi();
  await app.listen(env.API_PORT);
  createLogger({ level: env.LOG_LEVEL, service: 'api' }).info({ port: env.API_PORT }, 'api listening');
}

main().catch((err: unknown) => {
  createLogger({ service: 'api' }).fatal({ err }, 'api failed to start');
  process.exit(1);
});
