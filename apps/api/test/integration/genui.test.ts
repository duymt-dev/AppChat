// TIP-023c G1 trên Postgres 16 + Memurai: lượt có `render` → phần `ui` (cây + refs đọc từ bước đọc của CHÍNH run + intent cho node action)
// và lưu `{type:'ui', tree, run_id}` trong tin (không payload); mở lại phiên → dựng lại refs + intent theo quyền hiện hành, không gọi model.
// (Cowork — Chat không đề nghị action ghi.) Ref sai bước → model sửa một lần, sai tiếp → cây lỗi an toàn. Nút action qua intent → luôn 202 xem trước (contact.tag nguồn ui chạy
// thẳng); sửa input / dùng intent của người khác / action khác → 403; mất quyền khi mở lại → không intent, ref unavailable.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, AssistantService, CreditMeter, DbPriceBook, GenUiIntents, REDIS, WalletService, assistantTurn, createLogger, uuidv7, type AssistantDeps, type TurnRequest } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { assistantMessageSchema, authzForRole, type GenUiPart, type UiTree } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let contactId: string;
let calls = 0;

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const made = await call(h, '/actions/contact.create', { input: { full_name: 'Genui Hoà', phone: '0909555001' } }, { 'idempotency-key': uuidv7() }).then((r) => r.json() as Promise<{ data: { result: { contact_id: string } } }>);
  contactId = made.data.result.contact_id;
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
function deps(script: MockScript): AssistantDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  // Script mock đồng bộ → đọc idx bước tìm khách (DB) trước mỗi lượt gọi model.
  model.doStream = async (o) => {
    calls++;
    lastSearch = await searchStep();
    return spy(o);
  };
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  const kv = h.app.get(REDIS, { strict: false });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv, pub: kv, intents: h.app.get(GenUiIntents, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
}
const owner = (): Pick<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'> => ({ ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner' });
const turn = async (script: MockScript, text: string) => assistantTurn(deps(script), await tenant(), { mode: 'cowork', ...owner(), text, requestId: `req-${uuidv7()}` });

let lastSearch = -1;
/** idx của bước tool `call_action` thành công gần nhất (model thật nhận idx này trong kết quả / lỗi render). */
async function searchStep(): Promise<number> {
  const db = await tenant();
  const s = await db.aiRunStep.findFirst({ where: { type: 'tool', status: 'ok', actionId: 'call_action' }, orderBy: [{ createdAt: 'desc' }, { idx: 'desc' }], select: { idx: true } });
  return s?.idx ?? -1;
}

const tree = (step: number): UiTree => ({
  version: 1,
  root: {
    type: 'stack',
    children: [
      { type: 'text', text: 'Khách tìm được' },
      { type: 'table', columns: [{ key: 'name', label: 'Tên' }, { key: 'code', label: 'Mã' }], rows: { $ref: `step:${step}.contacts` }, open: { entity: 'contact', id_key: 'id' } },
      { type: 'button', label: 'Gắn VIP', on: { kind: 'action', action_id: 'contact.tag', input: { contact_id: contactId, tag: 'VIP', op: 'add' } } },
    ],
  },
});

/** Kịch bản: tìm khách → render cây trỏ đúng bước tìm → câu chốt. */
const script = (bad = 0): MockScript => {
  let wrong = bad;
  let rendered = false;
  return ({ call: n }) => {
    if (n === 0) return { tool: 'call_action', input: { action_id: 'contact.search', input: { q: 'Genui Hoà' } } };
    if (n >= 1 && wrong > 0) {
      wrong--;
      return { tool: 'render', input: { tree: tree(99) } };
    }
    if (n <= 3 && !rendered) {
      rendered = true;
      return { tool: 'render', input: { tree: tree(lastSearch) } };
    }
    return { text: 'Đây là kết quả.' };
  };
};

const uiOf = (events: { type: string }[]) => events.find((e) => e.type === 'ui') as GenUiPart | undefined;

describe('render → phần ui', () => {
  let part: GenUiPart;
  let sessionId: string;

  it('lượt có render: cây + refs từ bước đọc của run + intent cho nút action; tin lưu cây không payload', async () => {
    const r = await turn(script(), 'tìm chị Hoà');
    sessionId = r.session_id;
    part = uiOf(r.events)!;
    expect(part).toBeTruthy();
    const rows = Object.values(part.refs)[0] as { id: string }[];
    expect(rows.map((x) => x.id)).toContain(contactId);
    expect(part.intents?.['2']).toMatch(/^[A-Za-z0-9_-]{20,64}$/);
    const db = await tenant();
    const msg = await db.assistantMessage.findFirstOrThrow({ where: { sessionId, role: 'assistant' }, orderBy: { createdAt: 'desc' } });
    const parts = (msg.content as { parts: { type: string; refs?: unknown }[] }).parts;
    const stored = parts.find((p) => p.type === 'ui')!;
    expect(stored).toMatchObject({ type: 'ui', run_id: r.run_id });
    expect(stored.refs).toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain('0909555001');
  });

  it('nút action qua intent → 202 xem trước (nguồn ui sẽ chạy thẳng); xác nhận → action_log nguồn assistant', async () => {
    const input = { contact_id: contactId, tag: 'VIP', op: 'add' };
    const first = await call(h, '/actions/contact.tag', { input }, { 'x-genui-intent': part.intents!['2']!, 'idempotency-key': uuidv7() });
    expect(first.status).toBe(202);
    const p = ((await first.json()) as { data: { status: string; confirm_token: string } }).data;
    expect(p.status).toBe('preview_required');
    const done = await call(h, '/actions/contact.tag', { input, confirm_token: p.confirm_token }, { 'x-genui-intent': part.intents!['2']!, 'idempotency-key': uuidv7() });
    expect(done.status).toBe(200);
    const db = await tenant();
    const logRow = await db.actionLog.findFirstOrThrow({ where: { actionId: 'contact.tag' }, orderBy: { createdAt: 'desc' } });
    expect(logRow).toMatchObject({ source: 'assistant', onBehalfOfUserId: h.user });
  });

  it('sửa input / đổi action / người khác dùng intent → 403', async () => {
    const h2 = part.intents!['2']!;
    expect((await call(h, '/actions/contact.tag', { input: { contact_id: contactId, tag: 'BLACKLIST', op: 'add' } }, { 'x-genui-intent': h2 })).status).toBe(403);
    expect((await call(h, '/actions/contact.delete', { input: { contact_id: contactId } }, { 'x-genui-intent': h2 })).status).toBe(403);
    expect((await call(h, '/actions/contact.tag', { input: { contact_id: contactId, tag: 'VIP', op: 'add' } }, { 'x-genui-intent': h2, authorization: `Bearer ${sales.token}` })).status).toBe(403);
    expect((await call(h, '/actions/contact.tag', { input: { contact_id: contactId, tag: 'VIP', op: 'add' } }, { 'x-genui-intent': 'not-a-real-handle-xxxxxxxx' })).status).toBe(403);
  });

  it('mở lại phiên: dựng lại ui từ bước đã lưu, không gọi model; intent mới vẫn bắt xem trước', async () => {
    const before = calls;
    const r = await call(h, `/assistant/sessions/${sessionId}/messages`, undefined);
    const body = (await r.json()) as { data: unknown[] };
    const msgs = body.data.map((m) => assistantMessageSchema.parse(m));
    const ui = msgs.find((m) => m.ui)!.ui!;
    expect(calls).toBe(before);
    expect(Object.values(ui.refs)[0]).toEqual(Object.values(part.refs)[0]);
    expect(ui.intents?.['2']).toBeTruthy();
    expect(ui.intents?.['2']).not.toBe(part.intents?.['2']);
  });

  it('người khác mở cùng run (biết run_id) → refs unavailable', async () => {
    const svc = h.app.get(AssistantService, { strict: false });
    const out = await svc.refs({ workspaceId: h.ws, userId: sales.id, authz: authzForRole('sales', sales.id) } as never, part.run_id, Object.keys(part.refs));
    expect(Object.values(out).every((v) => (v as { unavailable?: boolean }).unavailable === true)).toBe(true);
  });
});

describe('render sai', () => {
  it('ref bước không tồn tại → model sửa một lần → cây hợp lệ', async () => {
    const r = await turn(script(1), 'tìm chị Hoà lần nữa');
    const ui = uiOf(r.events)!;
    expect(ui.tree.root.type).toBe('stack');
  });

  it('sai hai lần → cây text cảnh báo, không render nửa vời', async () => {
    const r = await turn(script(2), 'tìm chị Hoà lần ba');
    const ui = uiOf(r.events)!;
    expect(ui.tree.root).toMatchObject({ type: 'text', tone: 'warning' });
  });
});
