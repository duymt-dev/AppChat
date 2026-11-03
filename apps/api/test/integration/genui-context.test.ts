// TIP-023c G2.6 trên Postgres 16 + Memurai (hợp đồng an toàn 8): drawer gửi `context { entity, id, selection }` — Sales chỉ thấy khách
// của mình (data scope) nên id khách người khác bị bỏ trước khi vào prompt / `ai_run.input`; khách của mình giữ nguyên. Owner thấy hết.
// Lần đọc kiểm đi qua executor như mọi đọc của Trợ lý (audit nguồn assistant) — chỉ bản ghi xem được mới thành công.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, GenUiIntents, REDIS, WalletService, assistantTurn, createLogger, uuidv7, type AssistantDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { startApi, env, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let mine: string;
let theirs: string;

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const db = await tenant();
  mine = uuidv7();
  theirs = uuidv7();
  const at = h.clock.now();
  await db.contact.create({ data: { id: mine, code: `KH-C${Date.now() % 100000}`, name: 'Khách của Sales', ownerUserId: sales.id, createdAt: at, updatedAt: at } as never });
  await db.contact.create({ data: { id: theirs, code: `KH-D${Date.now() % 100000}`, name: 'Khách của Owner', ownerUserId: h.user, createdAt: at, updatedAt: at } as never });
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
function deps(): AssistantDeps {
  const model = mockLanguageModel(() => ({ text: 'Đã nhận ngữ cảnh.' }), { provider: PROVIDER, model: MODEL });
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  const kv = h.app.get(REDIS, { strict: false });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv, pub: kv, intents: h.app.get(GenUiIntents, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
}
const ask = async (userId: string, role: 'sales' | 'owner', context: Record<string, unknown>) => {
  const r = await assistantTurn(deps(), await tenant(), { ws: h.ws, userId, authz: authzForRole(role, userId), userName: role, locale: 'vi', role, mode: 'cowork', text: 'Tóm tắt các khách đang chọn', requestId: `req-${uuidv7()}`, context });
  const run = await (await tenant()).aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
  return (run.input as { context?: Record<string, unknown> }).context;
};

describe('ngữ cảnh màn theo quyền hiện hành', () => {
  it('Sales: id / dòng chọn của khách người khác bị bỏ; khách của mình giữ', async () => {
    const at0 = h.clock.now();
    const ctx = await ask(sales.id, 'sales', { route: '/customers', entity: 'contact', id: theirs, selection: [mine, theirs], surface: 'drawer' });
    expect(ctx).toEqual({ route: '/customers', surface: 'drawer', entity: 'contact', selection: [mine] });
    expect(JSON.stringify(ctx)).not.toContain(theirs);
    // Đọc kiểm = contact.get nguồn assistant (audit như mọi đọc của Trợ lý); khách người khác không có dòng thành công.
    const logs = await (await tenant()).actionLog.findMany({ where: { actionId: 'contact.get', createdAt: { gte: at0 } }, select: { source: true, status: true } });
    expect(logs).toEqual([{ source: 'assistant', status: 'succeeded' }]);
  });

  it('Owner: thấy cả hai khách; thực thể không có action get → chỉ route', async () => {
    expect(await ask(h.user, 'owner', { route: '/customers', entity: 'contact', id: theirs, selection: [mine, theirs] })).toEqual({ route: '/customers', entity: 'contact', id: theirs, selection: [mine, theirs] });
    expect(await ask(h.user, 'owner', { route: '/marketing', entity: 'campaign', id: 'cp_1' })).toEqual({ route: '/marketing' });
  });
});

describe('tệp đính kèm qua guard server (TIP-023c 8c / AC 9)', () => {
  const upload = async (by: string, name: string, mime = 'application/pdf') => {
    const id = uuidv7();
    await (await tenant()).file.create({ data: { id, storageKey: `t/${id}`, name, mime, size: 10n, uploadedBy: by, purpose: 'attachment', createdAt: h.clock.now() } });
    return id;
  };
  const turn = async (userId: string, role: 'sales' | 'owner', attachments: { id: string; name: string }[], text: string) =>
    assistantTurn(deps(), await tenant(), { ws: h.ws, userId, authz: authzForRole(role, userId), userName: role, locale: 'vi', role, mode: 'chat', text, requestId: `req-${uuidv7()}`, attachments });

  it('tệp người khác tải lên → 422 trước model, không tạo tin / run; tệp của mình → chỉ metadata trong ai_run.input (tên server)', async () => {
    const foreign = await upload(h.user, 'cua-owner.pdf');
    const own = await upload(sales.id, 'bao-gia-that.pdf');
    const db = await tenant();
    const runs = await db.aiRun.count();
    const err = await turn(sales.id, 'sales', [{ id: foreign, name: 'gia-mao.pdf' }], 'đọc tệp của người khác').catch((e: unknown) => e);
    expect(err).toMatchObject({ httpStatus: 422, fields: { [`attachments.${foreign}`]: 'forbidden' } });
    expect(await db.aiRun.count()).toBe(runs);
    expect(await db.assistantMessage.count({ where: { content: { path: ['parts', '0', 'text'], equals: 'đọc tệp của người khác' } } })).toBe(0);

    const r = await turn(sales.id, 'sales', [{ id: own, name: 'ten-client-gui.pdf' }], 'tóm tắt tệp');
    const input = (await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).input as { attachments?: unknown[] };
    expect(input.attachments).toEqual([{ id: own, name: 'bao-gia-that.pdf', mime: 'application/pdf', size: 10 }]);
    expect(JSON.stringify(input)).not.toContain(`t/${own}`);
  });

  it('id tệp không có trong workspace (workspace khác / bịa) → 422 not_found', async () => {
    const ghost = uuidv7();
    await expect(turn(h.user, 'owner', [{ id: ghost, name: 'x.pdf' }], 'tệp lạ')).rejects.toMatchObject({ httpStatus: 422, fields: { [`attachments.${ghost}`]: 'not_found' } });
  });
});

