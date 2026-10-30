// TIP-002 AC4, AC5, AC8 (unit): context đã xác thực, db_status → WORKSPACE_UNAVAILABLE, cache registry, LRU + idle.
import { describe, expect, it, vi } from 'vitest';
import {
  MemoryWorkspaceRegistry,
  TenantContextError,
  TenantContexts,
  TenantDbResolver,
  WorkspaceNotFoundError,
  WorkspaceUnavailableError,
  assertTenantDbName,
  tenantDbName,
  withDatabase,
  type DbStatus,
  type TenantContext,
  type TenantDb,
} from '../src';
import { IdleLru } from '../src/lru';

const WS = ['0190f000-0000-7000-8000-00000000aa01', '0190f000-0000-7000-8000-00000000aa02', '0190f000-0000-7000-8000-00000000aa03'];

function setup(status: DbStatus = 'active', extra: Partial<ConstructorParameters<typeof TenantDbResolver>[0]> = {}) {
  const registry = new MemoryWorkspaceRegistry();
  for (const id of WS) registry.upsert({ workspaceId: id, dbName: tenantDbName(id), dbHost: null, dbStatus: status, schemaVersion: null });
  const made: string[] = [];
  const closed: string[] = [];
  const createClient = vi.fn((url: string) => {
    made.push(url);
    return { $disconnect: async () => void closed.push(url) } as unknown as TenantDb;
  });
  const resolver = new TenantDbResolver({ registry, baseUrl: 'postgresql://app:pw@db:5432/postgres', createClient, ...extra });
  return { registry, resolver, made, closed, createClient };
}

describe('tenantDbName', () => {
  it('ws_ + 12 ký tự cuối của uuid, chặn tên lạ', () => {
    expect(tenantDbName('0190F000-0000-7000-8000-00000000AA01')).toBe('ws_00000000aa01');
    expect(() => tenantDbName('ws_x; DROP DATABASE')).toThrow();
    expect(() => assertTenantDbName('appchat_platform')).toThrow();
    expect(() => assertTenantDbName('ws_ABCDEF123456')).toThrow();
    expect(assertTenantDbName('ws_abcdef123456')).toBe('ws_abcdef123456');
  });

  it('withDatabase giữ user / password / host, đổi tên DB', () => {
    expect(withDatabase('postgresql://u:p%40ss@h:5433/postgres?sslmode=disable', 'ws_abc', 'h2')).toBe(
      'postgresql://u:p%40ss@h2:5433/ws_abc?sslmode=disable',
    );
  });
});

describe('TenantDbResolver', () => {
  it('(a) context tự dựng / thiếu → TenantContextError, không tra registry, không mở client', async () => {
    const { resolver, registry, createClient } = setup();
    const find = vi.spyOn(registry, 'find');
    const fake = { workspaceId: WS[0], via: 'membership', subject: 'u' } as unknown as TenantContext;
    await expect(resolver.get(fake)).rejects.toBeInstanceOf(TenantContextError);
    await expect(resolver.get(undefined as unknown as TenantContext)).rejects.toBeInstanceOf(TenantContextError);
    const copied = { ...TenantContexts.fromMembership(WS[0]!, 'u1') } as TenantContext;
    await expect(resolver.get(copied)).rejects.toBeInstanceOf(TenantContextError);
    expect(find).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('context hợp lệ → client theo đúng DB, dùng lại cho lần sau', async () => {
    const { resolver, made } = setup();
    const a = await resolver.get(TenantContexts.fromMembership(WS[0]!, 'u1'));
    const b = await resolver.get(TenantContexts.system(WS[0]!, 'events'));
    expect(a).toBe(b);
    expect(made).toEqual([`postgresql://app:pw@db:5432/${tenantDbName(WS[0]!)}`]);
  });

  it.each([
    ['provisioning', 503],
    ['restoring', 503],
    ['suspended', 423],
    ['archived', 423],
    ['archiving', 423],
    ['deleting', 423],
  ] as const)('(b) db_status %s → WORKSPACE_UNAVAILABLE %i, không mở client', async (status, http) => {
    const { resolver, createClient } = setup(status);
    const err = await resolver.get(TenantContexts.fromRoute(WS[0]!, 'channel')).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkspaceUnavailableError);
    expect((err as WorkspaceUnavailableError).httpStatus).toBe(http);
    expect((err as WorkspaceUnavailableError).code).toBe('WORKSPACE_UNAVAILABLE');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('workspace không có → NOT_FOUND', async () => {
    const { resolver } = setup();
    await expect(resolver.get(TenantContexts.system('0190f000-0000-7000-8000-0000000000ff', 'x'))).rejects.toBeInstanceOf(
      WorkspaceNotFoundError,
    );
  });

  it('cache registry 60s; invalidate đọc lại ngay', async () => {
    let t = 0;
    const { resolver, registry } = setup('active', { now: () => t });
    const find = vi.spyOn(registry, 'find');
    const ctx = TenantContexts.system(WS[0]!, 'j');
    await resolver.get(ctx);
    t = 59_000;
    await resolver.get(ctx);
    expect(find).toHaveBeenCalledTimes(1);
    await registry.setStatus(WS[0]!, 'suspended');
    t = 60_000;
    await expect(resolver.get(ctx)).rejects.toBeInstanceOf(WorkspaceUnavailableError);
    await registry.setStatus(WS[0]!, 'active');
    resolver.invalidate(WS[0]!);
    await expect(resolver.get(ctx)).resolves.toBeDefined();
  });

  it('không cache trạng thái chưa active: worker (tiến trình khác) đặt active → lần gọi sau mở được ngay (TIP-011)', async () => {
    const { resolver, registry } = setup('provisioning', { now: () => 0 });
    const ctx = TenantContexts.system(WS[0]!, 'j');
    await expect(resolver.get(ctx)).rejects.toBeInstanceOf(WorkspaceUnavailableError);
    await registry.setStatus(WS[0]!, 'active');
    await expect(resolver.get(ctx)).resolves.toBeDefined();
  });

  it('LRU: vượt cacheSize → đóng client ít dùng nhất; idle quá hạn → đóng', async () => {
    let t = 0;
    const { resolver, closed } = setup('active', { cacheSize: 2, idleMs: 1000, now: () => t });
    const ctx = (i: number) => TenantContexts.system(WS[i]!, 'j');
    await resolver.get(ctx(0));
    await resolver.get(ctx(1));
    await resolver.get(ctx(0)); // ws0 mới dùng → ws1 là cũ nhất
    await resolver.get(ctx(2));
    await Promise.resolve();
    expect(closed).toEqual([expect.stringContaining(tenantDbName(WS[1]!))]);
    expect(resolver.openClients).toBe(2);
    t = 5000;
    expect(resolver.sweepIdle()).toBe(2);
    expect(resolver.openClients).toBe(0);
  });
});

describe('IdleLru', () => {
  it('get làm mới thứ tự + mốc dùng', () => {
    let t = 0;
    const out: string[] = [];
    const lru = new IdleLru<number>({ max: 3, idleMs: 10, now: () => t, onEvict: (k) => void out.push(k) });
    lru.set('a', 1);
    t = 5;
    lru.set('b', 2);
    t = 9;
    lru.get('a');
    t = 15;
    expect(lru.sweep()).toBe(1);
    expect(out).toEqual(['b']);
  });
});
