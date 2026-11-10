// TIP-003c §1.2–1.3: cổng capability của Executor cho action riêng — chặn TRƯỚC zod / quyền / policy / preview / prepare / idempotency;
// ctx sao chép (spread / JSON), source='system' + Owner, sai action / workspace / digest input, sau khi gỡ niêm phong → 403, prepare spy = 0.
// runSystemAction: thiếu verifier → 501; verifier từ chối → không niêm phong, không gọi executor; ctx gỡ niêm phong kể cả khi lỗi.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionDef } from '@appchat/actions';
import { z } from 'zod';
import type { ActionContext } from '../src/kernel/actions/action-context';
import { ActionExecutor } from '../src/kernel/actions/executor';
import { admitInternal, canonicalDigest, sealSystemContext, systemCapabilityOf } from '../src/kernel/actions/system/capability';
import { registerSystemVerifier, runSystemAction, systemContext, unregisterSystemVerifier, type SystemTrigger } from '../src/kernel/actions/system/admission';

const WS = '0190f000-0000-7000-8000-00000000aa01';
const ID = 'test.internal_effect';
const def = { id: ID, module: 'sales', description: 'x', input: z.object({ target: z.string() }), output: z.object({}), permission: 'self', risk: 'write', exposure: 'internal' } as unknown as ActionDef;
const prepare = vi.fn(async () => ({}));
const parse = vi.spyOn(def.input, 'safeParse');
const can = vi.fn(async () => true);
const resolverGet = vi.fn(async () => {
  throw new Error('không được mở DB tenant khi chưa qua cổng');
});
const handlers = { get: () => ({ prepare, execute: vi.fn() }), isImplemented: () => true };
const executor = new ActionExecutor({ registry: [def], handlers: handlers as never, resolver: { get: resolverGet } as never, authorizer: { can }, confirm: {} as never, kv: {} as never, clock: { now: () => new Date() } });

const trigger = (o: Partial<SystemTrigger> = {}): SystemTrigger => ({ workspaceId: WS, actionId: ID, sourceKind: 'event', sourceRef: 'e1', targetId: 't1', generation: '1', input: { target: 't1' }, actor: 'test', ...o });
const cap = (o: Record<string, unknown> = {}) => ({ workspaceId: WS, actionId: ID, sourceKind: 'event' as const, sourceRef: 'e1', targetId: 't1', generation: '1', milestone: '', inputDigest: canonicalDigest({ target: 't1' }), receipt: 'trigger' as const, ...o });
const forbidden = { code: 'FORBIDDEN', httpStatus: 403, fields: { capability: 'missing' } };
const untouched = () => {
  expect(prepare).not.toHaveBeenCalled();
  expect(parse).not.toHaveBeenCalled();
  expect(can).not.toHaveBeenCalled();
  expect(resolverGet).not.toHaveBeenCalled();
};

afterEach(() => {
  vi.clearAllMocks();
  unregisterSystemVerifier(ID);
});

describe('cổng Executor cho action riêng', () => {
  it('ctx chưa niêm phong (kể cả source system + Owner) → 403 trước mọi bước', async () => {
    await expect(executor.execute(systemContext(trigger()), ID, { target: 't1' })).rejects.toMatchObject(forbidden);
    const owner: ActionContext = { workspaceId: WS, source: 'ui', actor: { type: 'user', id: 'u' }, authz: { isOwner: true } as never };
    await expect(executor.execute(owner, ID, { target: 't1' })).rejects.toMatchObject(forbidden);
    untouched();
  });

  it('bản sao ctx đã niêm phong (spread / JSON) → 403; capability không serialize được', async () => {
    const ctx = systemContext(trigger());
    sealSystemContext(ctx, cap());
    for (const copy of [{ ...ctx }, JSON.parse(JSON.stringify(ctx)) as ActionContext]) await expect(executor.execute(copy, ID, { target: 't1' })).rejects.toMatchObject(forbidden);
    expect(JSON.stringify(ctx)).not.toContain('inputDigest');
    untouched();
  });

  it('sai action / workspace / digest input → 403', async () => {
    const ctx = systemContext(trigger());
    sealSystemContext(ctx, cap({ actionId: 'other.action' }));
    await expect(executor.execute(ctx, ID, { target: 't1' })).rejects.toMatchObject(forbidden);
    sealSystemContext(ctx, cap());
    await expect(executor.execute(ctx, ID, { target: 't2' })).rejects.toMatchObject(forbidden);
    expect(() => sealSystemContext(ctx, cap({ workspaceId: 'ws-khac' }))).toThrow(/workspace/);
    expect(() => sealSystemContext({ ...ctx, source: 'ui' }, cap())).toThrow(/hệ thống/);
    untouched();
  });

  it('digest chuẩn: thứ tự khoá không đổi digest; capability bất biến', () => {
    expect(canonicalDigest({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(canonicalDigest({ b: [1, { d: 3, c: 2 }], a: 1 }));
    const ctx = systemContext(trigger());
    sealSystemContext(ctx, cap());
    const c = admitInternal(ctx, ID, { target: 't1' });
    expect(Object.isFrozen(c)).toBe(true);
  });
});

describe('runSystemAction', () => {
  const tenants = { get: vi.fn(async () => ({}) as never) };

  it('thiếu verifier → 501, không gọi executor', async () => {
    const ex = { execute: vi.fn() };
    await expect(runSystemAction(ex, tenants, trigger())).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED', fields: { capability: 'verifier_missing' } });
    expect(ex.execute).not.toHaveBeenCalled();
  });

  it('verifier từ chối → không niêm phong, không gọi executor', async () => {
    registerSystemVerifier(ID, async () => {
      throw Object.assign(new Error('x'), { code: 'NOT_FOUND' });
    });
    const ex = { execute: vi.fn() };
    await expect(runSystemAction(ex, tenants, trigger())).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(ex.execute).not.toHaveBeenCalled();
  });

  it('verifier đạt → executor thấy capability đúng trigger; gỡ niêm phong sau khi gọi (kể cả lỗi)', async () => {
    registerSystemVerifier(ID, async () => undefined);
    let seen: unknown;
    let ctxSeen: ActionContext | undefined;
    const ex = {
      execute: vi.fn(async (ctx: ActionContext) => {
        ctxSeen = ctx;
        seen = systemCapabilityOf(ctx);
        throw new Error('boom');
      }),
    };
    await expect(runSystemAction(ex as never, tenants, trigger({ milestone: 'T-2' }))).rejects.toThrow('boom');
    expect(seen).toMatchObject({ actionId: ID, sourceKind: 'event', sourceRef: 'e1', targetId: 't1', generation: '1', milestone: 'T-2', inputDigest: canonicalDigest({ target: 't1' }) });
    expect(systemCapabilityOf(ctxSeen!)).toBeUndefined();
  });

  it('đăng ký verifier khác cho cùng action → ném (một chủ)', () => {
    registerSystemVerifier(ID, async () => undefined);
    expect(() => registerSystemVerifier(ID, async () => undefined)).toThrow(/Trùng/);
  });
});
