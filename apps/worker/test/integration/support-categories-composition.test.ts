// TIP-034b §1.3, §1.4, §4.6 (AC4, AC6): worker dựng từ module production — ROLE=ai (KernelModule + AiRoleModule) có handler THẬT cho 4
// action từ điển danh mục ticket, mỗi action đúng một handler (quyền / cấp agent kiểm ở packages/actions/test/support-categories.test.ts).
// ROLE=jobs (JobsRoleModule) dựng được với adapter tập `ticket_category_suggestions` (nguyên khối, một lệnh replace).
// Luật realtime `ticket_categories.changed` → hai gói tin theo quyền hiện tại, KHÔNG mang nhãn. Preview DI, không DB.
import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { transferSpec } from '@appchat/shared';
import { actionIdOf, KernelModule, realtimeEnvelopes } from '@appchat/core';
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
const IDS = ['ticket_categories.get', 'ticket_categories.replace', 'ticket_categories.export', 'ticket.category_suggestions'];

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

describe('worker — từ điển danh mục ticket', () => {
  it('ROLE=ai: 4 action có đúng một handler mỗi action', async () => {
    const c = await handlerCounts(AiRoleModule);
    expect(Object.fromEntries(IDS.map((id) => [id, c.get(id)]))).toEqual(Object.fromEntries(IDS.map((id) => [id, 1])));
  }, 120_000);

  it('ROLE=jobs dựng được; tập nhập `ticket_category_suggestions` là nguyên khối theo settings.manage', async () => {
    await handlerCounts(JobsRoleModule);
    expect(transferSpec('ticket_category_suggestions')).toMatchObject({ atomic: true });
  }, 120_000);

  it('luật realtime: hai gói tin theo quyền hiện tại, chỉ key + version — không nhãn', () => {
    const env = realtimeEnvelopes({
      id: 'e1',
      topic: 'ticket_categories.changed',
      workspaceId: '00000000-0000-4000-8000-000000000001',
      payload: { ws: '00000000-0000-4000-8000-000000000001', occurred_at: '2026-11-13T00:00:00Z', key: 'ticket_categories', version: 3, labels: ['Lộ'] },
      traceId: null,
    });
    expect(env.map((e) => [e.event, e.require])).toEqual([
      ['ticket_categories.config', { permission: 'settings.manage' }],
      ['ticket_categories.suggestions', { permission: 'ticket.view' }],
    ]);
    for (const e of env) expect(e.data).toEqual({ key: 'ticket_categories', version: 3 });
  });
});
