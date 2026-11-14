// TIP-030c pha 1 trên Postgres 16 + Memurai: (AC1) GET / PDF trang ký công khai chỉ đọc (không opened / outbox / action_log); POST open cùng
// request_id → một biên nhận opened, request khác → lần mở khác; request_id thiếu / sai → 422. (AC2) action riêng `contract.public_*` gọi
// thẳng /actions (kể cả Owner) → 403 trước prepare; Trợ lý không thấy. Owner xin mã qua action `contract.request_sign_otp` (facade cũ giữ
// hình dạng) → thế hệ OTP tăng + ý định gửi bền (mã chỉ mã hoá, xoá sau accepted); nguồn assistant → 403. (AC4 một phần) mã mới phát sau
// khi kiểm → lần ký với thế hệ cũ không tiêu mã mới. Gửi lỗi provider (≥400) → hẹn thử lại; lỗi không rõ → unknown, quét không gửi lại.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MailSendError } from '@appchat/integrations';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ENC_KEY, WalletService, deliverOwnerOtp, encryptSecret, recoverOwnerOtp, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let ownerEmail: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  ownerEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = (r: { status: number; body: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data;
};
const pub = (path: string, body?: unknown) => fetch(`${h.base}/v1/public/sign/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'vitest' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const key = () => h.app.get<Buffer>(ENC_KEY, { strict: false });
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const otpIn = (s: string | undefined) => /\b(\d{6})\b/.exec(s ?? '')?.[1];

let contractId: string;
let token: string;

describe('chuẩn bị', () => {
  it('khách + Zalo + hợp đồng đã Owner ký + gửi ký', async () => {
    const lan = ok(await act('contact.create', { full_name: 'Chị Ký', phone: '0909300001' })).result.contact_id as string;
    const db = await tenant();
    const zalo = uuidv7();
    await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa-030c', status: 'connected', settings: {} } });
    await db.conversation.create({ data: { id: uuidv7(), channelAccountId: zalo, channelType: 'zalo_personal', contactId: lan, externalThreadId: `z-${uuidv7()}`, title: 'Khách', lastMessageAt: h.clock.now() } });
    contractId = ok(await act('contract.create', { contact_id: lan, kind: 'service', value: '5000000' })).result.contract_id;
    ok(await act('contract.submit', { contract_id: contractId }));
    const o = await call(h, `/contracts/${contractId}/sign-otp`, {}).then(json);
    expect(o.status, JSON.stringify(o.body)).toBe(200);
    expect(o.body.data).toMatchObject({ sent_to: expect.stringMatching(/•••/), delivery_status: 'accepted' });
    ok(await act('contract.approve_and_sign', { contract_id: contractId, otp: otpIn(h.mail.last(ownerEmail)?.text)!, signature_png: PNG }));
    const s = ok(await act('contract.send_for_signature', { contract_id: contractId, channel: 'zalo_personal' }));
    token = (s.result.sign_url as string).slice((s.result.sign_url as string).indexOf('/sign/') + 6);
  }, 180_000);
});

describe('trang công khai (AC1)', () => {
  it('GET / PDF chỉ đọc; POST open cùng request_id → một opened; request khác → thêm; request_id sai → 422', async () => {
    const db = await tenant();
    const opened = () => db.contractSignatureEvent.count({ where: { contractId, type: 'opened' } });
    const logs = () => db.actionLog.count({ where: { actionId: 'contract.public_open' } });
    const [o0, l0, e0] = [await opened(), await logs(), await db.outboxEvent.count()];
    expect((await pub(token)).status).toBe(200);
    expect((await fetch(`${h.base}/v1/public/sign/${token}/pdf`)).status).toBe(200);
    expect([await opened(), await logs(), await db.outboxEvent.count()]).toEqual([o0, l0, e0]);
    const rid = crypto.randomUUID();
    expect((await pub(`${token}/open`, { request_id: rid })).status).toBe(200);
    expect((await pub(`${token}/open`, { request_id: rid })).status).toBe(200);
    expect([await opened(), await logs()]).toEqual([o0 + 1, l0 + 1]);
    expect((await pub(`${token}/open`, { request_id: crypto.randomUUID() })).status).toBe(200);
    expect(await opened()).toBe(o0 + 2);
    expect((await pub(`${token}/open`, {})).status).toBe(422);
    expect((await pub(`${token}/open`, { request_id: 'x' })).status).toBe(422);
    expect((await pub(`${token.slice(0, -2)}xx/open`, { request_id: crypto.randomUUID() })).status).toBe(410);
  });

  it('xin OTP: thế hệ tăng, tin vào hội thoại; cùng request gửi lại → không phát mã thứ hai', async () => {
    const db = await tenant();
    const g0 = (await db.contractSigner.findFirstOrThrow({ where: { contractId, party: 'customer' } })).otpGeneration;
    const rid = crypto.randomUUID();
    const a = await pub(`${token}/otp`, { request_id: rid });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data).toMatchObject({ channel: 'zalo_personal', delivery_status: 'queued' });
    expect((await pub(`${token}/otp`, { request_id: rid })).status).toBe(200);
    expect((await db.contractSigner.findFirstOrThrow({ where: { contractId, party: 'customer' } })).otpGeneration).toBe(g0 + 1);
    expect(await db.contractSignatureEvent.count({ where: { contractId, type: 'otp_sent', signerId: (await db.contractSigner.findFirstOrThrow({ where: { contractId, party: 'customer' } })).id } })).toBe(1);
  });
});

describe('cổng action riêng (AC2)', () => {
  it('Owner gọi thẳng contract.public_* qua /actions → 403; Trợ lý không thấy action riêng', async () => {
    for (const id of ['contract.public_open', 'contract.public_otp', 'contract.public_decline', 'contract.public_sign', 'contract.sign_attempt_prepare', 'contract.sign_attempt_stage']) {
      const r = await act(id, { contract_id: contractId, request_ref: 'x', attempt_id: 'x', party: 'customer', render_generation: 1, outcome: 'staged' });
      expect(r.status, id).toBe(403);
    }
    const list = (await call(h, '/actions').then(json)).body.data.map((a: { id: string }) => a.id);
    expect(list).not.toContain('contract.public_otp');
    expect(list).toContain('contract.request_sign_otp');
  });

  it('contract.request_sign_otp chỉ người bấm ở UI: nguồn assistant / api → 403, không sinh mã', async () => {
    const id = ok(await act('contract.create', { contact_id: (await (await tenant()).contact.findFirstOrThrow()).id, kind: 'sale', value: '1000000' })).result.contract_id;
    ok(await act('contract.submit', { contract_id: id }));
    expect((await act('contract.request_sign_otp', { contract_id: id }, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await act('contract.request_sign_otp', { contract_id: id }, { 'x-action-source': 'api' })).status).toBe(403);
    expect(await (await tenant()).contractSigningDelivery.count({ where: { signerId: { in: (await (await tenant()).contractSigner.findMany({ where: { contractId: id } })).map((s) => s.id) } } })).toBe(0);
  });
});

describe('OTP Owner bền + thế hệ (AC4, AC6 một phần)', () => {
  let id: string;
  it('mã mới phát sau khi kiểm → lần ký thế hệ cũ không tiêu được mã mới; ý định accepted xoá mã mã hoá', async () => {
    const db = await tenant();
    id = ok(await act('contract.create', { contact_id: (await db.contact.findFirstOrThrow()).id, kind: 'sale', value: '2000000' })).result.contract_id;
    ok(await act('contract.submit', { contract_id: id }));
    ok(await act('contract.request_sign_otp', { contract_id: id }));
    const first = otpIn(h.mail.last(ownerEmail)?.text)!;
    const d1 = await db.contractSigningDelivery.findFirstOrThrow({ where: { purpose: 'owner_otp' }, orderBy: { createdAt: 'desc' } });
    expect(d1.phase).toBe('accepted');
    expect(d1.encryptedSecret).toBeNull();
    // Mã mới → mã cũ hết hiệu lực (thế hệ tăng): ký bằng mã cũ → 422, không tiêu mã mới.
    ok(await act('contract.request_sign_otp', { contract_id: id }));
    const second = otpIn(h.mail.last(ownerEmail)?.text)!;
    if (first !== second) expect((await act('contract.approve_and_sign', { contract_id: id, otp: first, signature_png: PNG })).status).toBe(422);
    const s = await db.contractSigner.findFirstOrThrow({ where: { contractId: id, party: 'business' } });
    expect(s.otpGeneration).toBe(d1.otpGeneration + 1);
    expect(s.otpHash).not.toBeNull();
    // Mã OTP không nằm trong action_log / outbox.
    const logs = await db.actionLog.findMany({ where: { actionId: 'contract.request_sign_otp' } });
    expect(JSON.stringify(logs)).not.toContain(second);
    ok(await act('contract.approve_and_sign', { contract_id: id, otp: second, signature_png: PNG }));
  }, 120_000);

  it('provider từ chối rõ (≥400) → hẹn thử lại; lỗi không rõ → unknown, quét không gửi lại', async () => {
    const db = await tenant();
    const cid = ok(await act('contract.create', { contact_id: (await db.contact.findFirstOrThrow()).id, kind: 'sale', value: '3000000' })).result.contract_id;
    ok(await act('contract.submit', { contract_id: cid }));
    const signer = { id: uuidv7() };
    await db.contractSigner.create({ data: { id: signer.id, contractId: cid, party: 'business', userId: h.user, name: 'Owner', email: ownerEmail, otpChannel: 'email', otpGeneration: 1, otpHash: 'x', otpExpiresAt: new Date(Date.now() + 600_000) } });
    const mk = async () => {
      const did = uuidv7();
      const gen = (await db.contractSigner.findUniqueOrThrow({ where: { id: signer.id } })).otpGeneration;
      await db.$executeRaw`DELETE FROM contract_signing_delivery WHERE signer_id = ${signer.id}::uuid`;
      await db.contractSigningDelivery.create({ data: { id: did, requestRef: 'r', signerId: signer.id, otpGeneration: gen, purpose: 'owner_otp', recipientUserId: h.user, nextDue: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 600_000), encryptedSecret: new Uint8Array(encryptSecret('123456', key())) } });
      return did;
    };
    const authz = { isOwner: true, permissions: new Set(), userId: h.user } as never;
    let sent = 0;
    const base = { key: key(), recipient: async () => ({ email: ownerEmail, authz }), place: async () => ({ locale: 'vi' }), now: () => new Date() };
    const reject = { key: 'x', send: async () => { sent++; throw new MailSendError('x', 503); } };
    const did = await mk();
    expect(await deliverOwnerOtp({ ...base, mail: reject }, db, h.ws, did, { code: 'HĐ' })).toBe('queued');
    expect((await db.contractSigningDelivery.findUniqueOrThrow({ where: { id: did } })).phase).toBe('pending');
    const did2 = await mk();
    const lost = { key: 'x', send: async () => { sent++; throw new Error('timeout'); } };
    expect(await deliverOwnerOtp({ ...base, mail: lost }, db, h.ws, did2, { code: 'HĐ' })).toBe('unknown');
    const row = await db.contractSigningDelivery.findUniqueOrThrow({ where: { id: did2 } });
    expect([row.phase, row.encryptedSecret]).toEqual(['unknown', null]);
    const before = sent;
    await recoverOwnerOtp({ ...base, mail: lost }, db, h.ws);
    expect(sent).toBe(before);
  });
});
