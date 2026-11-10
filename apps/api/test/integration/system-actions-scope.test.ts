// TIP-003c AC1 trên API thật: action riêng gọi qua /v1/actions (Owner · Trợ lý · nguồn giả) và ctx hệ thống không niêm phong / bản sao
// → 403 trước prepare / execute (spy = 0), không action_log; GET /v1/actions không liệt kê id / schema internal.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { isInternalAction, registry } from '@appchat/actions';
import { ActionExecutor, ActionHandlerRegistry, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const INTERNAL = registry.filter(isInternalAction).map((a) => a.id);

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as { data?: unknown; error?: { code: string } } });

describe('action riêng — biên công khai', () => {
  it('GET /v1/actions (Owner) không chứa id internal', async () => {
    const r = await json(await call(h, '/actions'));
    const ids = (r.body.data as { id: string }[]).map((a) => a.id);
    for (const id of INTERNAL) expect(ids, id).not.toContain(id);
  });

  it('Owner / Trợ lý gọi thẳng mọi id internal → 403, handler không chạy, không action_log', async () => {
    const reg = h.app.get(ActionHandlerRegistry, { strict: false });
    const spies = INTERNAL.map((id) => reg.get(id)).filter(Boolean).flatMap((hd) => [vi.spyOn(hd!, 'execute'), ...(hd!.prepare ? [vi.spyOn(hd!, 'prepare')] : []), ...(hd!.preview ? [vi.spyOn(hd!, 'preview')] : [])]);
    for (const id of INTERNAL) {
      for (const src of ['ui', 'assistant', 'api']) {
        const r = await json(await call(h, `/actions/${id}`, { input: { receipt_id: uuidv7(), operation_id: uuidv7(), appendix_id: uuidv7() } }, { 'idempotency-key': uuidv7(), 'x-action-source': src }));
        expect(r.status, `${id} ${src}`).toBe(403);
      }
    }
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    const db = await resolver.get(TenantContexts.system(h.ws, 'test'));
    expect(await db.actionLog.count({ where: { actionId: { in: INTERNAL } } })).toBe(0);
    spies.forEach((s) => s.mockRestore());
  });

  it('ctx hệ thống giả (đúng actor + Owner + key) hoặc bản sao → 403 capability trước khi mở DB', async () => {
    const ex = h.app.get(ActionExecutor, { strict: false });
    const forged = { workspaceId: h.ws, source: 'system' as const, actor: { type: 'system' as const, id: 'bank-ingress' }, authz: { isOwner: true } as never, idempotencyKey: 'k' };
    await expect(ex.execute(forged, 'bank_feed.ingest', { receipt_id: uuidv7() })).rejects.toMatchObject({ code: 'FORBIDDEN', fields: { capability: 'missing' } });
    await expect(ex.execute(JSON.parse(JSON.stringify(forged)), 'privacy.cleanup_step', { operation_id: uuidv7() })).rejects.toMatchObject({ code: 'FORBIDDEN', fields: { capability: 'missing' } });
  });
});
