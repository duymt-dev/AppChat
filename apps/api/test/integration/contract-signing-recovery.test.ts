// TIP-030c AC6 trên Postgres 16 + Memurai: chết ở các ranh giới — (a) lần thử verified / rendering bỏ dở quá hạn mã → quét `expired`, không bao
// giờ chốt hộ (hợp đồng vẫn chờ ký); (b) ứng viên đã tải lên nhưng lần thử stale → quét xoá tệp CHƯA xác nhận của chính lần thử, không đụng
// tệp đã xác nhận; (c) lượt render khác đang giữ lease → claim 409 in_progress, hết lease → lượt mới (thế hệ +1), lượt cũ stage → bị bỏ qua;
// (d) ý định OTP Owner `dispatching` quá hạn claim → unknown, quét không gửi lại; pending hết hạn → suppressed + xoá mã mã hoá.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { WalletService, claimRender, recoverSigning, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let contractId: string;
let signerId: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const past = (ms: number) => new Date(Date.now() - ms);

async function attempt(phase: 'verified' | 'rendering' | 'staged' | 'stale', extra: Record<string, unknown> = {}) {
  const db = await tenant();
  const id = uuidv7();
  await db.contractSigningAttempt.create({ data: { id, requestKeyHash: `r-${id}`, inputDigest: 'x', contractId, signerId, party: 'customer', contractVersion: 1, sourceVersion: 1, signatureDigest: 'x', otpGeneration: 1, phase, expiresAt: past(1000), ...extra } });
  return id;
}

describe('chuẩn bị', () => {
  it('hợp đồng + người ký khách', async () => {
    const r = await act('contact.create', { full_name: 'Chị Khôi Phục', phone: '0909500001' });
    const contact = r.body.data.result.contact_id;
    contractId = (await act('contract.create', { contact_id: contact, kind: 'service', value: '1000000' })).body.data.result.contract_id;
    const db = await tenant();
    signerId = uuidv7();
    await db.contractSigner.create({ data: { id: signerId, contractId, party: 'customer', name: 'Khách', otpGeneration: 1 } });
  });
});

describe('khôi phục lần ký (AC6)', () => {
  it('verified / rendering (hết lease) quá hạn → expired; rendering còn lease giữ nguyên; không chốt hộ', async () => {
    const v = await attempt('verified');
    const dead = await attempt('rendering', { leaseUntil: past(5000), renderGeneration: 1 });
    const busy = await attempt('rendering', { leaseUntil: new Date(Date.now() + 60_000), renderGeneration: 1 });
    const db = await tenant();
    const r = await recoverSigning(db, h.ws, null, new Date());
    expect(r.expired).toBeGreaterThanOrEqual(2);
    const phases = await db.contractSigningAttempt.findMany({ where: { id: { in: [v, dead, busy] } }, select: { id: true, phase: true } });
    expect(Object.fromEntries(phases.map((p) => [p.id, p.phase]))).toEqual({ [v]: 'expired', [dead]: 'expired', [busy]: 'rendering' });
    expect((await db.contract.findUniqueOrThrow({ where: { id: contractId } })).status).toBe('draft');
  });

  it('ứng viên chưa xác nhận của lần thử stale → xoá; tệp đã xác nhận giữ nguyên', async () => {
    const db = await tenant();
    const mk = async (confirmed: boolean) => {
      const id = uuidv7();
      await db.file.create({ data: { id, storageKey: `t/${id}`, name: 'x.pdf', mime: 'application/pdf', size: 1n, purpose: 'document', confirmed } });
      return id;
    };
    const [cand, sig, kept] = [await mk(false), await mk(false), await mk(true)];
    const a = await attempt('stale', { candidateFileId: cand, signatureFileId: sig, updatedAt: past(60_000) });
    const b = await attempt('stale', { candidateFileId: kept, signatureFileId: kept, updatedAt: past(60_000) });
    const r = await recoverSigning(db, h.ws, null, new Date());
    expect(r.cleaned).toBeGreaterThanOrEqual(2);
    expect(await db.file.count({ where: { id: { in: [cand, sig] } } })).toBe(0);
    expect(await db.file.count({ where: { id: kept } })).toBe(1);
    expect((await db.contractSigningAttempt.findUniqueOrThrow({ where: { id: a } })).candidateFileId).toBeNull();
    expect((await db.contractSigningAttempt.findUniqueOrThrow({ where: { id: b } })).candidateFileId).toBe(kept);
  });

  it('claim render: lease còn → 409 in_progress; hết lease → thế hệ mới; lượt cũ stage bị bỏ qua', async () => {
    const db = await tenant();
    const id = await attempt('verified', { expiresAt: new Date(Date.now() + 600_000) });
    const first = await claimRender(db, id, new Date());
    expect(first?.generation).toBe(1);
    await expect(claimRender(db, id, new Date())).rejects.toMatchObject({ httpStatus: 409 });
    const second = await claimRender(db, id, new Date(Date.now() + 120_000));
    expect(second?.generation).toBe(2);
  });
});

describe('ý định OTP Owner (AC6)', () => {
  it('dispatching quá hạn claim → unknown (xoá mã), pending hết hạn → suppressed; không gửi lại', async () => {
    const db = await tenant();
    const mk = async (phase: 'dispatching' | 'pending', claimUntil: Date | null, expiresAt: Date) => {
      const id = uuidv7();
      await db.contractSigningDelivery.create({ data: { id, requestRef: 'r', signerId: uuidv7(), otpGeneration: 1, purpose: 'owner_otp', recipientUserId: h.user, phase, claimUntil, nextDue: past(1000), expiresAt, encryptedSecret: new Uint8Array([1, 2, 3]) } });
      return id;
    };
    const lost = await mk('dispatching', past(1000), new Date(Date.now() + 600_000));
    const old = await mk('pending', null, past(1000));
    let sent = 0;
    const mail = { mail: { key: 'x', send: async () => void sent++ as never }, key: Buffer.alloc(32), recipient: async () => null, place: async () => ({ locale: 'vi' }), now: () => new Date() };
    const r = await recoverSigning(db, h.ws, mail, new Date());
    expect(r.unknown).toBeGreaterThanOrEqual(1);
    const rows = await db.contractSigningDelivery.findMany({ where: { id: { in: [lost, old] } } });
    const by = Object.fromEntries(rows.map((x) => [x.id, x]));
    expect([by[lost]!.phase, by[lost]!.encryptedSecret]).toEqual(['unknown', null]);
    expect([by[old]!.phase, by[old]!.encryptedSecret]).toEqual(['suppressed', null]);
    expect(sent).toBe(0);
  });
});
