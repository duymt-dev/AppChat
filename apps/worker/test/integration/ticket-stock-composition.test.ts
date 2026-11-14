// TIP-034d §2.3 / §4.3: worker dựng từ module production — ROLE=ai (Trợ lý / agent gọi tool) và ROLE=jobs đều có đúng MỘT handler thật cho
// `ticket.stock_summary`; ROLE=jobs không thêm queue / consumer thứ hai (job `support.stock-observe` chạy trên queue `support-scheduler`
// của SupportJobsRunner cùng job quét SLA). Lượt chụp `observeAll`: workspace phân trang keyset 100 id, tối đa 4 workspace song song, lỗi
// một workspace không chặn workspace khác, log chỉ id / job / thời gian (không nội dung khách). Preview DI, không DB.
import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { actionIdOf, KernelModule, observeAll, STOCK_OBSERVE_JOB } from '@appchat/core';
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

@Module({})
class Role {
  static forRoot(role: unknown): DynamicModule {
    return { module: Role, imports: [KernelModule.forRoot(FAKE_ENV), role as DynamicModule, DiscoveryModule] };
  }
}

async function handlerCount(role: unknown, id: string): Promise<number> {
  const app = await NestFactory.createApplicationContext(Role.forRoot(role), { logger: false, preview: true });
  try {
    const container = (app as unknown as { container: { getModules(): Map<string, { providers: Map<unknown, { metatype: unknown }> }> } }).container;
    const seen = new Set<unknown>();
    for (const m of container.getModules().values())
      for (const w of m.providers.values()) if (typeof w.metatype === 'function' && actionIdOf(w.metatype) === id) seen.add(w.metatype);
    return seen.size;
  } finally {
    await app.close().catch(() => undefined);
  }
}

/** Platform giả: `n` workspace id tăng dần, ghi lại mỗi trang keyset. */
function platformOf(n: number) {
  const all = Array.from({ length: n }, (_, i) => `ws-${String(i).padStart(4, '0')}`);
  const pages: { after?: string; take: number }[] = [];
  return {
    pages,
    workspace: {
      findMany: async (q: { where: { id?: { gt: string } }; take: number }) => {
        pages.push({ after: q.where.id?.gt, take: q.take });
        return all.filter((id) => !q.where.id || id > q.where.id.gt).slice(0, q.take).map((id) => ({ id }));
      },
    },
  };
}

describe('worker — tồn ticket so với hôm qua', () => {
  it('ROLE=ai và ROLE=jobs: đúng một handler ticket.stock_summary', async () => {
    expect(await handlerCount(AiRoleModule, 'ticket.stock_summary')).toBe(1);
    expect(await handlerCount(JobsRoleModule, 'ticket.stock_summary')).toBe(1);
  }, 120_000);

  it('observeAll: trang keyset 100 id, ≤ 4 workspace song song, lỗi một workspace cô lập, log không có nội dung khách', async () => {
    const platform = platformOf(205);
    let live = 0;
    let peak = 0;
    const done: string[] = [];
    const logs: Record<string, unknown>[] = [];
    // Tenant giả: mỗi workspace một "DB" chụp được ngay; ws-0007 lỗi kết nối.
    const tenants = {
      get: async (ctx: { workspaceId?: string; ws?: string }) => {
        const ws = (ctx.workspaceId ?? ctx.ws)!;
        if (ws === 'ws-0007') throw new Error('kết nối hỏng');
        return {
          $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
            live++;
            peak = Math.max(peak, live);
            await new Promise((r) => setTimeout(r, 2));
            live--;
            const tx = { $queryRaw: async (q: TemplateStringsArray) => (q.join('').includes('FOR UPDATE') ? [{ id: 1 }] : q.join('').includes('DISTINCT time_zone') ? [] : []), $executeRaw: async () => 1 };
            const r = await fn(tx);
            done.push(ws);
            return r;
          },
        };
      },
    };
    const r = await observeAll({
      platform: platform as never,
      tenants: tenants as never,
      cal: { of: async () => ({ timeZone: 'Asia/Ho_Chi_Minh' }) } as never,
      now: () => new Date('2026-11-14T03:00:00Z'),
      log: { info: (o: Record<string, unknown>) => void logs.push(o), warn: (o: Record<string, unknown>) => void logs.push(o) },
    });
    expect(r).toEqual({ captured: 204, failed: 1 });
    expect(platform.pages.map((p) => p.after)).toEqual([undefined, 'ws-0099', 'ws-0199']);
    expect(platform.pages.every((p) => p.take === 100)).toBe(true);
    expect(peak).toBeLessThanOrEqual(4);
    expect(new Set(done).size).toBe(204);
    for (const l of logs) {
      expect(l.job).toBe(STOCK_OBSERVE_JOB);
      expect(Object.keys(l).filter((k) => !['job', 'ws', 'batch', 'rows', 'pruned', 'results', 'ms', 'err'].includes(k))).toEqual([]);
    }
  });
});
