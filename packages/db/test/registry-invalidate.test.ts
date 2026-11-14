// TIP-006c AC3 (unit, không Redis — CI affected): hai "tiến trình" = hai TenantDbResolver nối cùng một broker pub/sub giả theo đúng
// giao thức ioredis (publish / subscribe / on('message')). Tiến trình A tạm dừng workspace + invalidate → B từ chối ngay (không đợi TTL
// 60 giây); mất kênh (publish lỗi) → B vẫn theo TTL như cũ, A không ném lỗi. Kiểm hai tiến trình THẬT qua Memurai ở
// apps/api/test/integration/realtime-events.test.ts.
import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  MemoryWorkspaceRegistry,
  REGISTRY_INVALIDATE_CHANNEL,
  TenantContexts,
  TenantDbResolver,
  WorkspaceUnavailableError,
  connectRegistryBus,
  tenantDbName,
  type PubSubClient,
  type TenantDb,
} from '../src';

const WS = '0190f000-0000-7000-8000-00000000cc01';
const OTHER = '0190f000-0000-7000-8000-00000000cc02';

/** Broker giả: mọi client subscribe kênh nhận message publish từ client bất kỳ. */
function broker(opts: { failPublish?: boolean } = {}) {
  const subs = new Map<string, Set<EventEmitter>>();
  const sent: string[] = [];
  const client = (): PubSubClient & { quitted: boolean } => {
    const e = new EventEmitter();
    const c = {
      quitted: false,
      async publish(channel: string, message: string) {
        if (opts.failPublish) throw new Error('Connection is closed.');
        sent.push(message);
        for (const s of subs.get(channel) ?? []) s.emit('message', channel, message);
        return 1;
      },
      async subscribe(channel: string) {
        subs.set(channel, (subs.get(channel) ?? new Set()).add(e));
        return 1;
      },
      on(event: 'message', l: (channel: string, message: string) => void) {
        e.on(event, l);
        return c;
      },
      async quit() {
        c.quitted = true;
        for (const s of subs.values()) s.delete(e);
        return 'OK';
      },
    };
    return c;
  };
  return { client, sent, inject: (channel: string, message: string) => [...(subs.get(channel) ?? [])].forEach((s) => s.emit('message', channel, message)) };
}

function proc(registry: MemoryWorkspaceRegistry, b: ReturnType<typeof broker>, clock: { t: number }, errors: unknown[] = []) {
  const resolver = new TenantDbResolver({ registry, baseUrl: 'postgresql://app:pw@db:5432/postgres', now: () => clock.t, createClient: () => ({ $disconnect: async () => undefined }) as unknown as TenantDb });
  const pub = b.client();
  const sub = b.client();
  const bus = connectRegistryBus(resolver, pub, sub, (e) => errors.push(e));
  return { resolver, bus, pub, sub };
}

const tick = () => new Promise((r) => setImmediate(r));

function setup(opts: { failPublish?: boolean } = {}) {
  const registry = new MemoryWorkspaceRegistry();
  for (const id of [WS, OTHER]) registry.upsert({ workspaceId: id, dbName: tenantDbName(id), dbHost: null, dbStatus: 'active', schemaVersion: null });
  const b = broker(opts);
  const clock = { t: 0 };
  const errors: unknown[] = [];
  return { registry, b, clock, errors, a: proc(registry, b, clock, errors), c: proc(registry, b, clock, errors) };
}

const ctx = (ws = WS) => TenantContexts.system(ws, 't');

describe('TenantDbResolver + kênh tenant-registry:invalidate', () => {
  it('A tạm dừng + invalidate → B bỏ cache ngay, từ chối WORKSPACE_UNAVAILABLE (không đợi TTL); workspace khác giữ cache', async () => {
    const s = setup();
    await s.a.resolver.get(ctx());
    await s.c.resolver.get(ctx());
    await s.c.resolver.get(ctx(OTHER));
    await s.registry.setStatus(WS, 'suspended');
    await s.registry.setStatus(OTHER, 'suspended');
    s.a.resolver.invalidate(WS);
    await tick();
    expect(s.b.sent).toEqual([WS]);
    s.clock.t += 100;
    await expect(s.a.resolver.get(ctx())).rejects.toBeInstanceOf(WorkspaceUnavailableError);
    await expect(s.c.resolver.get(ctx())).rejects.toBeInstanceOf(WorkspaceUnavailableError);
    // OTHER không được invalidate → B còn cache tới hết TTL (đúng phạm vi tín hiệu).
    await expect(s.c.resolver.get(ctx(OTHER))).resolves.toBeDefined();
  });

  it('phía nhận chỉ xoá cục bộ (drop không publish lại — không vòng); tin rác / kênh khác bị bỏ qua', async () => {
    const s = setup();
    await s.c.resolver.get(ctx());
    await s.registry.setStatus(WS, 'suspended');
    s.b.inject('other-channel', WS);
    s.b.inject(REGISTRY_INVALIDATE_CHANNEL, 'not-a-uuid');
    await expect(s.c.resolver.get(ctx())).resolves.toBeDefined();
    s.b.inject(REGISTRY_INVALIDATE_CHANNEL, WS);
    await expect(s.c.resolver.get(ctx())).rejects.toBeInstanceOf(WorkspaceUnavailableError);
    expect(s.b.sent).toEqual([]);
  });

  it('mất Redis (publish lỗi) → invalidate không ném, lỗi báo qua onError; B theo TTL 60 giây như cũ', async () => {
    const s = setup({ failPublish: true });
    await s.c.resolver.get(ctx());
    await s.registry.setStatus(WS, 'suspended');
    expect(() => s.a.resolver.invalidate(WS)).not.toThrow();
    await tick();
    expect(s.errors).toHaveLength(1);
    s.clock.t += 5_000;
    await expect(s.c.resolver.get(ctx())).resolves.toBeDefined();
    s.clock.t += 60_000;
    await expect(s.c.resolver.get(ctx())).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });

  it('close → gỡ kênh khỏi resolver (invalidate sau đó chỉ cục bộ) + quit hai kết nối', async () => {
    const s = setup();
    await s.a.bus.close();
    expect([s.a.pub, s.a.sub].every((x) => (x as unknown as { quitted: boolean }).quitted)).toBe(true);
    s.a.resolver.invalidate(WS);
    await tick();
    expect(s.b.sent).toEqual([]);
  });
});
