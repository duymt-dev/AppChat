// TIP-033c §4.1 / AC7: worker ROLE=ai dựng từ module production (KernelModule + AiRoleModule) có handler THẬT cho đọc gợi ý
// (`appointment.order_suggestions`, BookingModule) và tạo đơn (`order.create_from_appointment`, SalesModule) — agent / tác vụ / chạy tiếp
// sau duyệt không gặp 501, và không có hàng đợi / runtime model mới. Dựng đồ thị DI ở chế độ preview (không kết nối DB / Redis / BullMQ).
import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { actionIdOf, KernelModule } from '@appchat/core';
import { AiRoleModule } from '../../src/roles/ai.module';

const FAKE_ENV = {
  PLATFORM_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/appchat_fake',
  TENANT_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/postgres',
  REDIS_URL: 'redis://127.0.0.1:1/15',
  APP_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  LOG_LEVEL: 'silent',
  AI_ENGINE: 'mock',
};

@Module({})
class AiRole {
  static forRoot(): DynamicModule {
    return { module: AiRole, imports: [KernelModule.forRoot(FAKE_ENV), AiRoleModule, DiscoveryModule] };
  }
}

/** Mọi action id có handler trong đồ thị DI của ROLE=ai (mỗi id đếm số provider đăng ký). */
async function handlerCounts(): Promise<Map<string, number>> {
  const app = await NestFactory.createApplicationContext(AiRole.forRoot(), { logger: false, preview: true });
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

describe('ROLE=ai — gợi ý tạo đơn từ lịch hẹn', () => {
  it('đọc gợi ý + tạo đơn có đúng một handler mỗi action (đăng ký một lần, không trùng)', async () => {
    const c = await handlerCounts();
    expect(c.get('appointment.order_suggestions')).toBe(1);
    expect(c.get('order.create_from_appointment')).toBe(1);
  });
});
