// TIP-030c pha 2 trên Postgres 16 + Memurai + LibreOffice thật: (AC3) sai OTP đồng thời từ các lần thử khác nhau → đếm đúng một lần mỗi lần thử
// (biên nhận rejected + otp_fail bền dù trả 422), gửi lại cùng request không đếm lại; lần thứ 5 khoá link 410. (AC4) mã mới phát sau khi
// lần thử đã kiểm → chốt lần thử cũ thất bại (stale), không tiêu mã mới, không xác nhận tệp ứng viên. (AC5) hai tab cùng mã → đúng một hiệu
// ứng ký (một chữ ký / PDF / contract.signed / tin gửi); cùng request gửi lại sau commit → kết quả cũ, không render / gửi lần hai; SHA cuối =
// bytes đọc lại của tệp PDF đã lưu. Không lưu OTP / chữ ký thô ở biên nhận / action_log.
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { WalletService, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let ownerEmail: string;
let zalo: string;
let lan: string;

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
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data;
};
const pub = (path: string, body?: unknown) => fetch(`${h.base}/v1/public/sign/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'vitest' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const otpIn = (s: string | undefined) => /\b(\d{6})\b/.exec(s ?? '')?.[1];
const rid = () => crypto.randomUUID();
const lastOut = async (conv: string) => (await tenant()).message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' }, orderBy: { createdAt: 'desc' } });
const wrong = (otp: string) => (otp === '000000' ? '111111' : '000000');

/** Hợp đồng đã Owner ký + gửi ký qua Zalo → (id, token, hội thoại). */
async function sent(): Promise<{ id: string; token: string; conv: string }> {
  h.clock.advance(1000);
  const id = ok(await act('contract.create', { contact_id: lan, kind: 'service', value: '4000000' })).result.contract_id as string;
  ok(await act('contract.submit', { contract_id: id }));
  ok(await act('contract.request_sign_otp', { contract_id: id }));
  ok(await act('contract.approve_and_sign', { contract_id: id, otp: otpIn(h.mail.last(ownerEmail)?.text)!, signature_png: PNG }));
  const s = ok(await act('contract.send_for_signature', { contract_id: id, channel: 'zalo_personal' }));
  const url = s.result.sign_url as string;
  const c = await (await tenant()).contract.findUniqueOrThrow({ where: { id } });
  return { id, token: url.slice(url.indexOf('/sign/') + 6), conv: c.conversationId! };
}
async function otpFor(x: { token: string; conv: string }) {
  expect((await pub(`${x.token}/otp`, { request_id: rid() })).status).toBe(200);
  return otpIn((await lastOut(x.conv)).body)!;
}

describe('chuẩn bị', () => {
  it('khách + Zalo + hội thoại', async () => {
    lan = ok(await act('contact.create', { full_name: 'Chị Nguyên Tử', phone: '0909400001' })).result.contact_id;
    const db = await tenant();
    zalo = uuidv7();
    await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa-030c-a', status: 'connected', settings: {} } });
    await db.conversation.create({ data: { id: uuidv7(), channelAccountId: zalo, channelType: 'zalo_personal', contactId: lan, externalThreadId: `z-${uuidv7()}`, title: 'Khách', lastMessageAt: h.clock.now() } });
  });
});

describe('sai OTP bền (AC3)', () => {
  it('sai đồng thời từ 3 lần thử khác nhau → otp_fails +3 + 3 biên nhận rejected; gửi lại cùng request không đếm; lần 5 → 410', async () => {
    const x = await sent();
    const otp = await otpFor(x);
    const db = await tenant();
    const reqs = [rid(), rid(), rid()];
    const rs = await Promise.all(reqs.map((r) => pub(`${x.token}/sign`, { otp: wrong(otp), signature_png: PNG, consent: true, request_id: r })));
    expect(rs.map((r) => r.status)).toEqual([422, 422, 422]);
    const s = await db.contractSigner.findFirstOrThrow({ where: { contractId: x.id, party: 'customer' } });
    expect(s.otpFails).toBe(3);
    expect(await db.contractSigningAttempt.count({ where: { contractId: x.id, party: 'customer', phase: 'rejected' } })).toBe(3);
    expect(await db.contractSignatureEvent.count({ where: { contractId: x.id, type: 'otp_fail' } })).toBe(3);
    // Cùng request, cùng nội dung → kết quả cũ, không đếm thêm; cùng request khác nội dung → 409.
    expect((await pub(`${x.token}/sign`, { otp: wrong(otp), signature_png: PNG, consent: true, request_id: reqs[0] })).status).toBe(422);
    expect((await db.contractSigner.findUniqueOrThrow({ where: { id: s.id } })).otpFails).toBe(3);
    expect((await pub(`${x.token}/sign`, { otp, signature_png: PNG, consent: true, request_id: reqs[0] })).status).toBe(409);
    expect((await pub(`${x.token}/sign`, { otp: wrong(otp), signature_png: PNG, consent: true, request_id: rid() })).status).toBe(422);
    expect((await pub(`${x.token}/sign`, { otp: wrong(otp), signature_png: PNG, consent: true, request_id: rid() })).status).toBe(410);
    expect((await pub(`${x.token}/sign`, { otp, signature_png: PNG, consent: true, request_id: rid() })).status).toBe(410);
    const logs = await db.contractSigningAttempt.findMany({ where: { contractId: x.id } });
    expect(JSON.stringify(logs)).not.toContain(otp);
    expect(JSON.stringify(logs)).not.toContain('iVBORw0KGgo');
  }, 120_000);
});

describe('thế hệ OTP (AC4)', () => {
  it('mã mới phát sau khi lần thử đã kiểm → chốt lần cũ stale, mã mới vẫn dùng được, tệp ứng viên không xác nhận', async () => {
    const x = await sent();
    const otp = await otpFor(x);
    const db = await tenant();
    const s = await db.contractSigner.findFirstOrThrow({ where: { contractId: x.id, party: 'customer' } });
    // Lần thử cũ đã kiểm (verified) ở thế hệ hiện tại — dựng như thể đang render khi khách xin mã mới.
    const old = { id: uuidv7() };
    await db.contractSigningAttempt.create({ data: { id: old.id, requestKeyHash: `t-${old.id}`, inputDigest: 'x', contractId: x.id, signerId: s.id, party: 'customer', tokenId: (await db.contractSignToken.findFirstOrThrow({ where: { contractId: x.id, usedAt: null } })).id, contractVersion: 1, sourceVersion: 1, signatureDigest: 'x', otpGeneration: s.otpGeneration, verificationDigest: s.otpHash, phase: 'staged', candidateFileId: uuidv7(), signatureFileId: uuidv7(), candidateSha256: 'x', expiresAt: s.otpExpiresAt! } });
    const fresh = await otpFor(x);
    expect(fresh).toBeDefined();
    const s2 = await db.contractSigner.findUniqueOrThrow({ where: { id: s.id } });
    expect(s2.otpGeneration).toBe(s.otpGeneration + 1);
    // Mã cũ không còn đúng (thế hệ mới).
    if (otp !== fresh) expect((await pub(`${x.token}/sign`, { otp, signature_png: PNG, consent: true, request_id: rid() })).status).toBe(422);
    const ok2 = await pub(`${x.token}/sign`, { otp: fresh, signature_png: PNG, consent: true, request_id: rid() });
    expect(ok2.status, JSON.stringify(ok2.body)).toBe(200);
    expect(ok2.body.data.status).toBe('signed');
    expect((await db.contractSigningAttempt.findUniqueOrThrow({ where: { id: old.id } })).phase).toBe('staged');
    expect(await db.contractSigningAttempt.count({ where: { contractId: x.id, party: 'customer', phase: 'finalized' } })).toBe(1);
  }, 180_000);
});

describe('một hiệu ứng ký (AC5)', () => {
  it('hai tab cùng mã → một bên ký; cùng request gửi lại → kết quả cũ, không render / gửi lần hai; SHA = bytes đọc lại', async () => {
    const x = await sent();
    const otp = await otpFor(x);
    const db = await tenant();
    const [a, b] = [rid(), rid()];
    const rs = await Promise.all([a, b].map((r) => pub(`${x.token}/sign`, { otp, signature_png: PNG, consent: true, request_id: r })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(rs.find((r) => r.status !== 200)?.status).toBe(410);
    const c = await db.contract.findUniqueOrThrow({ where: { id: x.id } });
    expect(c.status).toBe('signed');
    expect(await db.contractSigningAttempt.count({ where: { contractId: x.id, party: 'customer', phase: 'finalized' } })).toBe(1);
    expect(await db.outboxEvent.count({ where: { topic: 'contract.signed', payload: { path: ['contract_id'], equals: x.id } } })).toBe(1);
    expect(await db.contractSignatureEvent.count({ where: { contractId: x.id, type: 'signed' } })).toBe(1);
    const f = await db.file.findUniqueOrThrow({ where: { id: c.signedFileId! } });
    expect(f.confirmed).toBe(true);
    const pdf = Buffer.from(await (await fetch(`${h.base}/v1/public/sign/${x.token}/pdf`)).arrayBuffer());
    expect(createHash('sha256').update(pdf).digest('hex')).toBe(c.signedSha256);
    const msgs = await db.message.count({ where: { conversationId: x.conv, direction: 'out' } });
    const winner = rs[0]!.status === 200 ? a : b;
    const again = await pub(`${x.token}/sign`, { otp, signature_png: PNG, consent: true, request_id: winner });
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    expect(again.body.data.status).toBe('signed');
    expect(await db.message.count({ where: { conversationId: x.conv, direction: 'out' } })).toBe(msgs);
    expect(await db.contractSigningAttempt.count({ where: { contractId: x.id, party: 'customer', phase: 'finalized' } })).toBe(1);
  }, 240_000);
});

describe('OTP Owner có biên nhận (AC3)', () => {
  it('Owner sai đồng thời 2 lần thử → otp_fails +2; cùng Idempotency-Key gửi lại không đếm; khác OTP cùng khoá → 409', async () => {
    h.clock.advance(1000);
    const id = ok(await act('contract.create', { contact_id: lan, kind: 'sale', value: '1500000' })).result.contract_id as string;
    ok(await act('contract.submit', { contract_id: id }));
    ok(await act('contract.request_sign_otp', { contract_id: id }));
    const otp = otpIn(h.mail.last(ownerEmail)?.text)!;
    const db = await tenant();
    const [k1, k2] = [uuidv7(), uuidv7()];
    const run = (k: string, code: string) => call(h, '/actions/contract.approve_and_sign', { input: { contract_id: id, otp: code, signature_png: PNG } }, { 'idempotency-key': k }).then(json);
    const rs = await Promise.all([run(k1, wrong(otp)), run(k2, wrong(otp))]);
    expect(rs.map((r) => r.status)).toEqual([422, 422]);
    const s = await db.contractSigner.findFirstOrThrow({ where: { contractId: id, party: 'business' } });
    expect(s.otpFails).toBe(2);
    expect((await run(k1, wrong(otp))).status).toBe(422);
    expect((await db.contractSigner.findUniqueOrThrow({ where: { id: s.id } })).otpFails).toBe(2);
    expect((await run(k1, otp)).status).toBe(409);
    ok(await run(uuidv7(), otp));
    expect(await db.contractSigningAttempt.count({ where: { contractId: id, party: 'business', phase: 'finalized' } })).toBe(1);
  }, 120_000);
});
