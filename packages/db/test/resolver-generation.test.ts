// TIP-040 pha 4 (DC-373): thế hệ trạng thái workspace dùng chung — tiến trình khác tạm dừng workspace (tăng `generation`) → resolver bỏ
// cache registry trong ≤ 2 giây (không đợi TTL 60 giây); không có `generation` → giữ hành vi TTL cũ.
import { describe, expect, it } from 'vitest';
import { MemoryWorkspaceRegistry, TenantContexts, TenantDbResolver, WorkspaceUnavailableError, tenantDbName, type TenantDb } from '../src';

const WS = '0190f000-0000-7000-8000-00000000bb01';

function setup(withGeneration: boolean) {
  let t = 0;
  let gen = 0n;
  const registry = new MemoryWorkspaceRegistry();
  registry.upsert({ workspaceId: WS, dbName: tenantDbName(WS), dbHost: null, dbStatus: 'active', schemaVersion: null });
  if (withGeneration) Object.assign(registry, { generation: async () => gen });
  const resolver = new TenantDbResolver({ registry, baseUrl: 'postgresql://app:pw@db:5432/postgres', now: () => t, createClient: () => ({ $disconnect: async () => undefined }) as unknown as TenantDb });
  return { registry, resolver, tick: (ms: number) => (t += ms), bump: () => (gen += 1n) };
}

describe('TenantDbResolver + thế hệ trạng thái workspace', () => {
  it('thế hệ đổi → bỏ cache, thấy suspended sau ≤ 2 giây', async () => {
    const s = setup(true);
    await s.resolver.get(TenantContexts.system(WS, 't'));
    await s.registry.setStatus(WS, 'suspended');
    s.bump();
    s.tick(500);
    await expect(s.resolver.get(TenantContexts.system(WS, 't'))).resolves.toBeDefined();
    s.tick(2_000);
    await expect(s.resolver.get(TenantContexts.system(WS, 't'))).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });

  it('registry không có generation → vẫn theo TTL 60 giây', async () => {
    const s = setup(false);
    await s.resolver.get(TenantContexts.system(WS, 't'));
    await s.registry.setStatus(WS, 'suspended');
    s.tick(5_000);
    await expect(s.resolver.get(TenantContexts.system(WS, 't'))).resolves.toBeDefined();
    s.tick(60_000);
    await expect(s.resolver.get(TenantContexts.system(WS, 't'))).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });
});
