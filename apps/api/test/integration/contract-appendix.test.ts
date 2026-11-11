// TIP-030b F3 AC3 + extra acceptance trên Postgres 16 + Memurai (+ LibreOffice thật): phụ lục chỉ cho hợp đồng đã ký; PL-n cấp dưới khoá
// (hai yêu cầu đồng thời không trùng số, cùng request_key → cùng phụ lục); vòng đời draft → pending_approval → Owner duyệt & ký (OTP RIÊNG
// của phụ lục — OTP hợp đồng cha không dùng được) → gửi link → khách ký → signed, bằng chứng riêng; hợp đồng cha (tệp / giá trị / chữ ký /
// nhật ký) không đổi. Token: token hợp đồng cha không mở phụ lục, token PL-A không ký PL-B, replay / ký song song chỉ một chữ ký, sửa nháp
// (version mới) làm token cũ hết hiệu lực, hết hạn → declined. Capability: gọi thẳng /actions public (Owner) → 403. Index + EXPLAIN tab.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { appendicesSchema, appendixSignViewSchema } from '@appchat/shared';
import { ActionExecutor, WalletService, sweepContracts, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let ownerEmail: string;
let zalo: string;
let lan: string;
let conv: string;
let parent: { id: string; code: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const act = (id: string, input: unknown, who?: { id: string }, key = uuidv7()) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { id: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const post = (path: string, body: unknown = {}) => call(h, path, body, {}).then(json);
const pubOf = (base: string) => (path: string, body?: unknown) => fetch(`${h.base}/v1/public/${base}/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'vitest' }, body: body === undefined ? undefined : JSON.stringify(base === 'sign' && /\/(open|otp|decline)$/.test(path) && body && typeof body === 'object' ? { request_id: crypto.randomUUID(), ...body } : body) }).then(json);
const pub = pubOf('appendix-sign');
const pubParent = pubOf('sign');
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const otpIn = (s: string | undefined) => /\b(\d{6})\b/.exec(s ?? '')?.[1];
const lastOut = async () => (await tenant()).message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
const tokenOf = (url: string, mark: string) => url.slice(url.indexOf(mark) + mark.length);

/** Owner OTP riêng của phụ lục → duyệt & ký. */
async function ownerSign(id: string, version: number) {
  ok(await act('contract.appendix_owner_otp', { appendix_id: id }));
  const otp = otpIn(h.mail.last(ownerEmail)?.text)!;
  return ok(await act('contract.appendix_approve_and_sign', { appendix_id: id, if_version: version, otp, signature_png: PNG }));
}

async function newAppendix(title: string, key = uuidv7()) {
  return ok(await act('contract.create_appendix', { contract_id: parent.id, title, content: `Nội dung ${title}\n\nĐiều 2. <b>không phải HTML</b>`, value_delta: '1000000', request_key: key })) as { appendix_id: string; code: string };
}

async function toPending(title: string) {
  const a = await newAppendix(title);
  ok(await act('contract.appendix_submit', { appendix_id: a.appendix_id }));
  await ownerSign(a.appendix_id, 1);
  const s = ok(await act('contract.appendix_send', { appendix_id: a.appendix_id, channel: 'zalo_personal' }));
  return { ...a, token: tokenOf(s.sign_url, '/sign/appendix/') };
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  ownerEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
  lan = ok(await act('contact.create', { full_name: 'Chị Lan PL', phone: '0909300001', email: 'lan.pl@example.com' })).contact_id;
  const db = await tenant();
  zalo = uuidv7();
  await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa-pl', status: 'connected', settings: {} } });
  conv = uuidv7();
  await db.conversation.create({ data: { id: conv, channelAccountId: zalo, channelType: 'zalo_personal', contactId: lan, externalThreadId: `z-${conv}`, title: 'Khách', lastMessageAt: h.clock.now() } });
  // Hợp đồng cha ký thật hai bên.
  const c = ok(await act('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' }));
  ok(await act('contract.submit', { contract_id: c.contract_id }));
  expect((await post(`/contracts/${c.contract_id}/sign-otp`)).status).toBe(200);
  ok(await act('contract.approve_and_sign', { contract_id: c.contract_id, otp: otpIn(h.mail.last(ownerEmail)?.text)!, signature_png: PNG }));
  const sent = ok(await act('contract.send_for_signature', { contract_id: c.contract_id, channel: 'zalo_personal' }));
  const token = tokenOf(sent.sign_url, '/sign/');
  await pubParent(`${token}/otp`, {});
  expect((await pubParent(`${token}/sign`, { otp: otpIn((await lastOut()).body), signature_png: PNG, consent: true })).status).toBe(200);
  parent = { id: c.contract_id, code: c.code, token };
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('tạo phụ lục', () => {
  it('hợp đồng chưa ký → 409; đã ký → PL-1; cùng request_key → cùng phụ lục; content + file_id cùng lúc → 422', async () => {
    const draft = ok(await act('contract.create', { contact_id: lan, kind: 'service', title: 'Nháp', value: '1000' }));
    expect((await act('contract.create_appendix', { contract_id: draft.contract_id, title: 'x', content: 'y', request_key: 'k0' })).body.error).toMatchObject({ code: 'INVALID_STATE' });
    const a = await newAppendix('Bổ sung 2 buổi', 'same-key');
    expect(a.code).toBe(`${parent.code}/PL-1`);
    expect((await newAppendix('Bổ sung 2 buổi', 'same-key')).appendix_id).toBe(a.appendix_id);
    expect((await act('contract.create_appendix', { contract_id: parent.id, title: 'x', content: 'y', file_id: uuidv7(), request_key: 'k1' })).status).toBe(422);
  });

  it('hai yêu cầu đồng thời → số PL khác nhau, không trùng', async () => {
    const [x, y] = await Promise.all([newAppendix('Song song A'), newAppendix('Song song B')]);
    expect(new Set([x.code, y.code]).size).toBe(2);
    const seqs = (await (await tenant()).contractAppendix.findMany({ where: { contractId: parent.id }, select: { seq: true } })).map((r) => r.seq).sort();
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});

describe('vòng đời + ký riêng', () => {
  let A: { appendix_id: string; code: string; token: string };
  let parentBefore: unknown;

  it('sửa nháp: version cũ → 409; version +1. Trình duyệt → yêu cầu sửa → nháp', async () => {
    const db = await tenant();
    parentBefore = await db.contract.findUniqueOrThrow({ where: { id: parent.id }, select: { fileId: true, fileSha256: true, signedFileId: true, signedSha256: true, value: true, status: true } });
    const a = await newAppendix('Vòng đời');
    expect((await act('contract.appendix_update', { appendix_id: a.appendix_id, if_version: 2, patch: { title: 'x' } })).body.error.fields).toEqual({ version: '1' });
    expect(ok(await act('contract.appendix_update', { appendix_id: a.appendix_id, if_version: 1, patch: { title: 'Vòng đời v2' } })).version).toBe(2);
    ok(await act('contract.appendix_submit', { appendix_id: a.appendix_id }));
    expect(ok(await act('contract.appendix_request_changes', { appendix_id: a.appendix_id, reason: 'Sai số buổi' })).status).toBe('draft');
  });

  it('Owner: OTP hợp đồng cha không ký được phụ lục; OTP phụ lục đúng version → pending_signature, PDF đóng băng', async () => {
    const a = await newAppendix('Ký riêng');
    ok(await act('contract.appendix_submit', { appendix_id: a.appendix_id }));
    // Không xin OTP phụ lục → không ký được (OTP hợp đồng cha không áp).
    expect((await act('contract.appendix_approve_and_sign', { appendix_id: a.appendix_id, if_version: 1, otp: '123456', signature_png: PNG })).body.error.code).toBe('OTP_INVALID');
    const r = await ownerSign(a.appendix_id, 1);
    expect(r).toMatchObject({ status: 'pending_signature', version: 1 });
    const row = await (await tenant()).contractAppendix.findUniqueOrThrow({ where: { id: a.appendix_id } });
    expect(row.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    const s = ok(await act('contract.appendix_send', { appendix_id: a.appendix_id, channel: 'zalo_personal' }));
    expect(s.sign_url).toContain('/sign/appendix/');
    A = { ...a, token: tokenOf(s.sign_url, '/sign/appendix/') };
  }, 120_000);

  it('token hợp đồng cha không mở phụ lục; token phụ lục không mở trang hợp đồng cha', async () => {
    expect((await pub(parent.token)).status).toBe(410);
    expect((await pubParent(A.token)).status).toBe(410);
    const v = appendixSignViewSchema.parse((await pub(`${A.token}/open`, {})).body.data);
    expect(v).toMatchObject({ code: A.code, status: 'pending_signature', business: { signed: true }, contract: { code: parent.code }, version: 1 });
  });

  it('gọi thẳng /actions public (kể cả Owner) → 403, không có capability', async () => {
    for (const id of ['contract.appendix_public_otp', 'contract.appendix_public_decline']) expect((await act(id, { appendix_id: A.appendix_id })).status).toBe(403);
    expect((await act('contract.appendix_public_sign', { appendix_id: A.appendix_id, otp: '123456', signature_png: PNG, consent: true })).status).toBe(403);
    expect((await call(h, '/actions/contract.appendix_public_otp', { input: { appendix_id: A.appendix_id } }, { 'x-action-source': 'assistant' }).then(json)).status).toBe(403);
  });

  it('khách: OTP vào hội thoại; ký song song hai tab → đúng một chữ ký; replay → 410; hợp đồng cha không đổi', async () => {
    expect((await pub(`${A.token}/otp`, {})).status).toBe(200);
    const otp = otpIn((await lastOut()).body)!;
    const [x, y] = await Promise.all([pub(`${A.token}/sign`, { otp, signature_png: PNG, consent: true }), pub(`${A.token}/sign`, { otp, signature_png: PNG, consent: true })]);
    const okOnes = [x, y].filter((r) => r.status === 200);
    expect(okOnes.length).toBeGreaterThanOrEqual(1);
    const v = appendixSignViewSchema.parse(okOnes[0]!.body.data);
    expect(v.status).toBe('signed');
    expect(v.certificate.map((e) => e.type)).toEqual(expect.arrayContaining(['approved_signed', 'sent', 'opened', 'otp_sent', 'otp_ok', 'signed']));
    const db = await tenant();
    expect(await db.appendixSignatureEvent.count({ where: { appendixId: A.appendix_id, type: 'signed' } })).toBe(1);
    const a = await db.contractAppendix.findUniqueOrThrow({ where: { id: A.appendix_id } });
    expect((await db.file.findUniqueOrThrow({ where: { id: a.signedFileId! } })).sha256).toBe(a.signedSha256);
    expect((await pub(`${A.token}/sign`, { otp, signature_png: PNG, consent: true })).status).toBe(410);
    expect(await db.contract.findUniqueOrThrow({ where: { id: parent.id }, select: { fileId: true, fileSha256: true, signedFileId: true, signedSha256: true, value: true, status: true } })).toEqual(parentBefore);
    expect(await db.contractSignatureEvent.count({ where: { contractId: parent.id, appendixId: { not: null } } })).toBe(0);
    await expect(db.appendixSignatureEvent.updateMany({ where: { appendixId: A.appendix_id }, data: { actorName: 'x' } })).rejects.toThrow(/append-only/);
  }, 120_000);

  it('token PL-B không ký PL-A; hết hạn → declined (quét)', async () => {
    const B = await toPending('PL-B');
    const C = await toPending('PL-C');
    // Token B chỉ gắn B: mở ra đúng B, không bao giờ là C.
    expect(appendixSignViewSchema.parse((await pub(B.token)).body.data).code).toBe(B.code);
    const db = await tenant();
    const tb = await db.appendixSignToken.findFirstOrThrow({ where: { appendixId: B.appendix_id, usedAt: null } });
    expect(tb.appendixId).not.toBe(C.appendix_id);
    h.clock.advance(9 * 86_400_000);
    await sweepContracts({ platform: h.platform, tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), now: () => h.clock.now() });
    expect((await db.contractAppendix.findUniqueOrThrow({ where: { id: C.appendix_id } })).status).toBe('declined');
    expect((await pub(`${B.token}/otp`, {})).status).toBe(410);
  }, 180_000);
});

describe('tab Phụ lục + index', () => {
  it('GET /contracts/:id/appendices khớp schema; người không thấy hợp đồng → 404; EXPLAIN dùng index tab', async () => {
    const list = appendicesSchema.parse((await get(`/contracts/${parent.id}/appendices`)).body);
    expect(list.data.length).toBeGreaterThan(3);
    expect(list.data.find((a) => a.status === 'signed')?.events.some((e) => e.type === 'signed')).toBe(true);
    const sales = await h.member('sales');
    expect((await get(`/contracts/${parent.id}/appendices`, sales)).status).toBe(404);
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT id FROM contract_appendix WHERE contract_id = '${parent.id}' ORDER BY created_at DESC, id DESC LIMIT 50`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/contract_appendix_contract_id_idx/);
      const ev = (await c.query(`EXPLAIN SELECT type, party FROM appendix_signature_event WHERE appendix_id = '${uuidv7()}' ORDER BY created_at, id`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(ev).toMatch(/appendix_signature_event_appendix_id_created_at_id_idx/);
    } finally {
      await c.end();
    }
  });
});
