// TIP-034c §4.5: worker dựng từ module production — ROLE=ai (KernelModule + AiRoleModule) có handler THẬT cho 4 action sửa ticket hàng
// loạt, mỗi action đúng một handler; ROLE=jobs (JobsRoleModule, SupportJobsModule + DataJobsModule) nạp xong thì kind việc dữ liệu
// `ticket.bulk_update` / `ticket.bulk_undo` (runner `dispatch` — con riêng qua Executor), verifier nguồn của hai con riêng và map hoàn tác
// ticket.bulk_update → ticket.bulk_undo đã đăng ký. Không scheduler thứ hai, không khởi động kênh / AI. Preview DI, không DB.
import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { actionIdOf, dataJobKinds, KernelModule, systemVerifierRegistered, undoActionOf } from '@appchat/core';
import { AiRoleModule } from '../../src/roles/ai.module';
import { JobsRoleModule } from '../../src/roles/jobs.module';

const FAKE_ENV = {
  PLATFORM_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/appchat_fake',
  TENANT_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/postgres',
  REDIS_URL: 'redis://127.0.0.1:1/15',
  APP_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  LOG_LEVEL: 'silent',
  AI_ENGINE: 'mock',
};
const IDS = ['ticket.bulk_update', 'ticket.bulk_undo', 'ticket.bulk_item', 'ticket.bulk_item_undo'];

@Module({})
class Role {
  static forRoot(role: unknown): DynamicModule {
    return { module: Role, imports: [KernelModule.forRoot(FAKE_ENV), role as DynamicModule, DiscoveryModule] };
  }
}

/** Mọi action id có handler trong đồ thị DI của role (mỗi id đếm số provider đăng ký). */
async function handlerCounts(role: unknown): Promise<Map<string, number>> {
  const app = await NestFactory.createApplicationContext(Role.forRoot(role), { logger: false, preview: true });
  try {
    const container = (app as unknown as { container: { getModules(): Map<string, { providers: Map<unknown, { metatype: unknown }> }> } }).container;
    const seen = new Set<unknown>();
    const out = new Map<string, number>();
    for (const m of container.getModules().values())
      for (const w of m.providers.values()) {
        const id = typeof w.metatype === 'function' ? actionIdOf(w.metatype) : undefined;
        if (!id || seen.has(w.metatype)) continue;
        seen.add(w.metatype);
        out.set(id, (out.get(id) ?? 0) + 1);
      }
    return out;
  } finally {
    await app.close().catch(() => undefined);
  }
}

/** Dựng thật (không preview) để chạy onModuleInit — vẫn không kết nối DB / Redis (provider lười). */
async function boot(role: unknown) {
  const app = await NestFactory.createApplicationContext(Role.forRoot(role), { logger: false, abortOnError: false });
  await app.close().catch(() => undefined);
}

describe('worker — sửa ticket hàng loạt', () => {
  it('ROLE=ai: 4 action có đúng một handler mỗi action', async () => {
    const c = await handlerCounts(AiRoleModule);
    expect(Object.fromEntries(IDS.map((id) => [id, c.get(id)]))).toEqual(Object.fromEntries(IDS.map((id) => [id, 1])));
  }, 120_000);

  it('ROLE=jobs: kind việc dữ liệu + verifier con riêng + map hoàn tác đã đăng ký', async () => {
    await handlerCounts(JobsRoleModule);
    await boot(JobsRoleModule).catch(() => undefined);
    expect(dataJobKinds()).toEqual(expect.arrayContaining(['ticket.bulk_update', 'ticket.bulk_undo']));
    expect(systemVerifierRegistered('ticket.bulk_item')).toBe(true);
    expect(systemVerifierRegistered('ticket.bulk_item_undo')).toBe(true);
    expect(undoActionOf('ticket.bulk_update')).toBe('ticket.bulk_undo');
  }, 120_000);
});
