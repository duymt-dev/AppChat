// TIP-023c AC xuyên luồng (secret sentinel) trên Postgres 16 + Memurai: form GenUI `channel.email.connect` (hộp thư giả) — mật khẩu gửi từ
// trình duyệt qua intent: 202 xem trước + `secret_vault`; xác nhận bằng vault + input KHÔNG có mật khẩu → kết nối thật (fake IMAP xác thực
// đúng mật khẩu → vault ghép đúng). Mật khẩu không xuất hiện ở assistant_message / ai_run_step / action_log / outbox / idempotency, kể cả
// khi lỗi kiểm tra + thử lại. Vault dùng một lần; vault người khác / action khác → từ chối. Model gửi mật khẩu trong call_action → chặn.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { FAKE_MAIL_HOST, FAKE_MAIL_PASSWORD, fakeMailboxTransport } from '@appchat/channels';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, GenUiIntents, REDIS, WalletService, assistantTurn, createLogger, uuidv7, type AssistantDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole, type GenUiPart, type UiTree } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });
const BOX = `genui-${uuidv7().slice(-8)}@spa.vn`;

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeMailboxTransport.reset();
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
function deps(script: MockScript): AssistantDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  const kv = h.app.get(REDIS, { strict: false });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv, pub: kv, intents: h.app.get(GenUiIntents, { strict: false }), now: () => h.clock.now(), planKey: async () => 'team' };
}
const turn = async (script: MockScript, text: string) =>
  assistantTurn(deps(script), await tenant(), { mode: 'cowork', ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner', text, requestId: `req-${uuidv7()}` });

const form: UiTree = {
  version: 1,
  root: {
    type: 'form',
    action_id: 'channel.email.connect',
    title: 'Kết nối email',
    fields: [{ name: 'address', value: BOX }, { name: 'fields.imap_host', value: FAKE_MAIL_HOST }, { name: 'fields.imap_port', value: '993' }, { name: 'fields.password' }],
  },
};
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, body: Record<string, unknown>, headers: Record<string, string>) => call(h, `/actions/${id}`, body, headers).then(json);

/** Quét mọi bảng tenant có thể chứa dữ liệu lượt / thao tác (text cast) tìm chuỗi bí mật. */
async function leaks(secret: string): Promise<string[]> {
  const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
  const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
  await c.connect();
  try {
    const out: string[] = [];
    for (const t of ['assistant_message', 'assistant_event', 'assistant_request', 'ai_run', 'ai_run_step', 'action_log', 'outbox_event', 'idempotency_key', 'channel_account']) {
      const exists = await c.query(`SELECT to_regclass($1) AS r`, [t]);
      if (!exists.rows[0].r) continue;
      const r = await c.query(`SELECT count(*)::int AS n FROM ${t} x WHERE x::text LIKE $1`, [`%${secret}%`]);
      if (r.rows[0].n > 0) out.push(t);
    }
    return out;
  } finally {
    await c.end();
  }
}

describe('form bí mật qua intent', () => {
  let intent: string;

  it('render form: ô mật khẩu được server đánh dấu secret, không mang giá trị', async () => {
    const r = await turn(({ call: n }) => (n === 0 ? { tool: 'render', input: { tree: form } } : { text: 'Anh điền mật khẩu ứng dụng giúp em.' }), 'kết nối email hỗ trợ');
    const ui = r.events.find((e) => e.type === 'ui') as GenUiPart;
    const pw = (ui.tree.root as { fields: { name: string; secret?: boolean; value?: unknown }[] }).fields.find((f) => f.name === 'fields.password')!;
    expect(pw).toMatchObject({ secret: true });
    expect(pw.value).toBeUndefined();
    intent = ui.intents!['']!;
    expect(intent).toBeTruthy();
  });

  it('sai mật khẩu → lỗi kiểm tra, thử lại đúng: preview + vault → xác nhận bằng vault → kết nối; vault dùng một lần', async () => {
    const plain = { address: BOX, fields: { imap_host: FAKE_MAIL_HOST, imap_port: '993' } };
    const wrong = await act('channel.email.connect', { input: { ...plain, fields: { ...plain.fields, password: 'sai-mat-khau-x9' } } }, { 'x-genui-intent': intent, 'idempotency-key': uuidv7() });
    expect(wrong.status).toBe(202);
    const wrongConfirm = await act('channel.email.connect', { input: plain, confirm_token: wrong.body.data.confirm_token, secret_vault: wrong.body.data.secret_vault }, { 'x-genui-intent': intent, 'idempotency-key': uuidv7() });
    expect(wrongConfirm.status).toBe(422);

    const p = await act('channel.email.connect', { input: { ...plain, fields: { ...plain.fields, password: FAKE_MAIL_PASSWORD } } }, { 'x-genui-intent': intent, 'idempotency-key': uuidv7() });
    expect(p.status).toBe(202);
    expect(p.body.data.secret_vault).toBeTruthy();
    expect(JSON.stringify(p.body)).not.toContain(FAKE_MAIL_PASSWORD);
    // Vault của người khác / action khác → từ chối, vault không bị tiêu.
    const foreign = await act('channel.email.connect', { input: plain, confirm_token: p.body.data.confirm_token, secret_vault: p.body.data.secret_vault }, { 'x-genui-intent': intent, authorization: `Bearer ${sales.token}`, 'idempotency-key': uuidv7() });
    expect(foreign.status).toBe(403);
    const done = await act('channel.email.connect', { input: plain, confirm_token: p.body.data.confirm_token, secret_vault: p.body.data.secret_vault }, { 'x-genui-intent': intent, 'idempotency-key': uuidv7() });
    expect(done.status).toBe(200);
    expect(done.body.data.result.channel_account_id).toBeTruthy();
    const again = await act('channel.email.connect', { input: plain, confirm_token: p.body.data.confirm_token, secret_vault: p.body.data.secret_vault }, { 'x-genui-intent': intent, 'idempotency-key': uuidv7() });
    expect([409, 422]).toContain(again.status);
  });

  it('gửi kèm cả vault lẫn mật khẩu → 422 (chỉ dùng vault)', async () => {
    const r = await act('channel.email.connect', { input: { address: BOX, fields: { imap_host: FAKE_MAIL_HOST, password: 'x' } }, secret_vault: 'whatever-handle-xx' }, { 'x-genui-intent': intent });
    expect(r.status).toBe(422);
  });

  it('model đưa mật khẩu vào call_action → SECRET_FIELD, không chạy', async () => {
    const SENT = 'MODEL-sentinel-pw-41';
    const r = await turn(({ call: n }) => (n === 0 ? { tool: 'call_action', input: { action_id: 'channel.email.connect', input: { address: `m-${BOX}`, fields: { imap_host: FAKE_MAIL_HOST, password: SENT } } } } : { text: 'Anh dùng form giúp em.' }), 'mật khẩu là gì đó');
    expect(r.events.some((e) => e.type === 'confirm')).toBe(false);
    const db = await tenant();
    const step = await db.aiRunStep.findFirst({ where: { runId: r.run_id!, type: 'tool' } });
    expect(JSON.stringify(step?.output)).toContain('SECRET_FIELD');
  });

  it('quét bảng: mật khẩu thật + sentinel sai không nằm ở đâu cả', async () => {
    // Đối chứng: phép quét thấy được dữ liệu thường của cùng lượt (địa chỉ hộp thư nằm trong action_log / tin).
    expect(await leaks(BOX)).toEqual(expect.arrayContaining(['action_log', 'channel_account']));
    expect(await leaks(FAKE_MAIL_PASSWORD)).toEqual([]);
    expect(await leaks('sai-mat-khau-x9')).toEqual([]);
    expect(await leaks('MODEL-sentinel-pw-41')).toEqual([]);
  });
});
