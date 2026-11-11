// TIP-030 AC trên Postgres 16 + Memurai (+ LibreOffice thật): hợp đồng — migration 030 + index (EXPLAIN danh sách), create (HĐ-1001,
// ngày kết thúc sau ngày bắt đầu), update chỉ ở nháp (+ hoàn tác), từ báo giá đã chốt (không trùng), xoá nháp (+ hoàn tác); trình
// duyệt → thông báo người ký; yêu cầu sửa / từ chối nội bộ; "Duyệt & ký" của Owner (OTP email, sai OTP đếm, PDF nội dung đóng băng);
// gửi ký qua Zalo (khách chưa nhắn → 409) / email; trang ký công khai (mở → opened, OTP vào hội thoại, sai OTP, ký → PDF cuối có trang
// chứng nhận + SHA-256, giai đoạn khách, link dùng một lần); từ chối ký; nhắc / gia hạn link; quét (link hết hạn → declined, T-30 nhắc
// một lần, quá ngày kết thúc → expired); gia hạn hợp đồng (renew); chấm dứt bắt buộc lý do; quyền + scope; D42 + meta; nhật ký ký
// chỉ thêm (UPDATE / DELETE bị thu hồi).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { contractRowSchema, contractsMetaSchema, contractsPageSchema, signViewSchema } from '@appchat/shared';
import { ActionExecutor, WalletService, sweepContracts, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let cs: { id: string; token: string };
let accountant: { id: string; token: string };
let ownerEmail: string;

beforeAll(async () => {
  h = await startApi();
  [sales, cs, accountant] = [await h.member('sales'), await h.member('cs'), await h.member('accountant')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  ownerEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
// Token cấp lại theo đồng hồ test (đồng hồ tiến nhiều ngày ở phần quét).
const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const act = (id: string, input: unknown, who?: { id: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { id: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const post = (path: string, body: unknown = {}, who?: { id: string }) => call(h, path, body, who ? as(who) : {}).then(json);
const pub = (path: string, body?: unknown) => fetch(`${h.base}/v1/public/sign/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'vitest' }, body: body === undefined ? undefined : JSON.stringify(withRequest(path, body)) }).then(json);
/** TIP-030c: POST open / otp / decline mang request_id (UUID) — mỗi lần gọi test là một yêu cầu mới. */
const withRequest = (path: string, body: unknown) => (/\/(open|otp|decline)$/.test(path) && body && typeof body === 'object' && !('request_id' in body) ? { ...body, request_id: crypto.randomUUID() } : body);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const otpIn = (s: string | undefined) => /\b(\d{6})\b/.exec(s ?? '')?.[1];
const tokenOf = (url: string) => url.slice(url.indexOf('/sign/') + 6);

// Id dùng xuyên các bước (ghi ở bước trước, đọc ở bước sau).
const ids = {} as Record<string, string> & { token: string; conv: string; c1: string; c2: string; c3: string; c4: string; lan: string; vy: string };
let zalo: string;

async function contact(key: string, name: string, phone: string, extra: Record<string, unknown> = {}, who?: { id: string }) {
  return (ids[key] = ok(await act('contact.create', { full_name: name, phone, ...extra }, who)).result.contact_id as string);
}

async function zaloConversation(contactId: string) {
  const db = await tenant();
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: zalo, channelType: 'zalo_personal', contactId, externalThreadId: `z-${id}`, title: 'Khách', lastMessageAt: h.clock.now() } });
  return id;
}

/** Nháp → trình duyệt → Owner duyệt & ký (OTP email). */
async function approveAndSign(id: string) {
  ok(await act('contract.submit', { contract_id: id }));
  expect((await post(`/contracts/${id}/sign-otp`)).status).toBe(200);
  const otp = otpIn(h.mail.last(ownerEmail)?.text)!;
  return ok(await act('contract.approve_and_sign', { contract_id: id, otp, signature_png: PNG }));
}

const lastOut = async (conv: string) => (await tenant()).message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' }, orderBy: { createdAt: 'desc' } });

describe('chuẩn bị', () => {
  it('khách, tài khoản Zalo + email', async () => {
    await contact('lan', 'Chị Lan', '0909200001', { email: 'lan.hd@example.com' });
    await contact('vy', 'Phương Vy', '0909200002', {}, sales);
    const db = await tenant();
    zalo = uuidv7();
    await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa-hd', status: 'connected', settings: {} } });
    await db.channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh-hd@spa.vn', status: 'connected', settings: {} } });
  });
});

describe('migration 030 + soạn', () => {
  it('bảng + index; EXPLAIN danh sách không Seq Scan', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'contract'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['contract_live_recent_idx', 'contract_live_status_idx', 'contract_live_owner_idx', 'contract_contact_idx', 'contract_signed_end_idx', 'contract_sign_due_idx']));
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT c.id FROM contract c WHERE c.deleted_at IS NULL AND c.status = 'signed' ORDER BY c.created_at DESC, c.id DESC LIMIT 20`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/contract_live_(status|recent)_idx/);
    } finally {
      await c.end();
    }
  });

  it('create: mã HĐ-1001, phụ trách = người tạo, nhật ký created; ngày kết thúc ≤ bắt đầu → 422', async () => {
    h.clock.advance(1000);
    const d = ok(await act('contract.create', { contact_id: ids.lan, kind: 'service', title: 'Liệu trình HIFU 6 tháng', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' }));
    ids.c1 = d.result.contract_id;
    expect(d.result.code).toBe('HĐ-1001');
    const row = contractRowSchema.parse((await get(`/contracts/${ids.c1}`)).body.data);
    expect(row).toMatchObject({ status: 'draft', value: '18000000', owner_user_id: h.user, contact_name: 'Chị Lan', start_date: '2026-11-01', end_date: '2027-04-30' });
    expect(row.events.map((e) => e.type)).toEqual(['created']);
    // Nhật ký ký chỉ thêm (trigger): sửa / xoá bị chặn.
    const db = await tenant();
    await expect(db.contractSignatureEvent.updateMany({ where: { contractId: ids.c1 }, data: { actorName: 'x' } })).rejects.toThrow(/append-only/);
    await expect(db.contractSignatureEvent.deleteMany({ where: { contractId: ids.c1 } })).rejects.toThrow(/append-only/);
    expect((await act('contract.create', { contact_id: ids.lan, kind: 'service', value: '1', start_date: '2026-11-02', end_date: '2026-11-01' })).status).toBe(422);
  });

  it('update ở nháp + hoàn tác; đổi khách → 422', async () => {
    const u = ok(await act('contract.update', { contract_id: ids.c1, patch: { value: '20000000', note: 'Ưu đãi' } }));
    expect((await get(`/contracts/${ids.c1}`)).body.data).toMatchObject({ value: '20000000', note: 'Ưu đãi' });
    expect((await undo(u.action_log_id)).status).toBe(200);
    expect((await get(`/contracts/${ids.c1}`)).body.data).toMatchObject({ value: '18000000', note: '' });
    expect((await act('contract.update', { contract_id: ids.c1, patch: { contact_id: ids.vy } })).status).toBe(422);
  });

  it('xoá nháp + hoàn tác', async () => {
    const id = ok(await act('contract.create', { contact_id: ids.lan, kind: 'sale', value: '500000' })).result.contract_id as string;
    const del = ok(await act('contract.delete', { contract_id: id }));
    expect((await get(`/contracts/${id}`)).status).toBe(404);
    expect((await undo(del.action_log_id)).status).toBe(200);
    expect((await get(`/contracts/${id}`)).status).toBe(200);
    ok(await act('contract.delete', { contract_id: id }));
  });

  it('từ báo giá: chưa chốt → 409; đã chốt → hợp đồng mang mã báo giá, gọi lại trả cùng hợp đồng', async () => {
    const q = ok(await act('quote.create', { contact_id: ids.lan, items: [{ name: 'Gói chăm sóc da', qty: 1, unit_price: '9000000', tax_rate: 8 }] })).result.quote_id as string;
    expect((await act('contract.create_from_quote', { quote_id: q })).status).toBe(409);
    ok(await act('quote.send', { quote_id: q, channel: 'email' }));
    ok(await act('quote.mark_accepted', { quote_id: q }));
    const a = ok(await act('contract.create_from_quote', { quote_id: q }));
    const b = ok(await act('contract.create_from_quote', { quote_id: q }));
    expect(b.result.contract_id).toBe(a.result.contract_id);
    const row = contractRowSchema.parse((await get(`/contracts/${a.result.contract_id}`)).body.data);
    expect(row.quote_id).toBe(q);
    expect(row.quote_code).toMatch(/^BG-/);
    expect(row.value).not.toBe('0');
    ids.fromQuote = a.result.contract_id;
  }, 120_000);
});

describe('duyệt nội bộ + Owner ký', () => {
  it('sales trình duyệt → thông báo người ký; sales không duyệt & ký được; yêu cầu sửa → về nháp', async () => {
    h.clock.advance(1000);
    ids.c2 = ok(await act('contract.create', { contact_id: ids.vy, kind: 'service', title: 'Gói trẻ hoá 10 buổi', value: '25000000', start_date: '2026-11-01', end_date: '2026-12-15' }, sales)).result.contract_id;
    ok(await act('contract.submit', { contract_id: ids.c2 }, sales));
    const db = await tenant();
    const ev = await db.outboxEvent.findFirst({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } });
    expect(ev?.payload).toMatchObject({ kind: 'contract_approval', to: { permission: 'contract.sign' } });
    expect((await act('contract.update', { contract_id: ids.c2, patch: { note: 'x' } }, sales)).status).toBe(409);
    expect((await post(`/contracts/${ids.c2}/sign-otp`, {}, sales)).status).toBe(403);
    expect((await act('contract.approve_and_sign', { contract_id: ids.c2, otp: '123456', signature_png: PNG }, sales)).status).toBe(403);
    ok(await act('contract.request_changes', { contract_id: ids.c2, reason: 'Sửa ngày' }));
    expect((await db.contract.findUniqueOrThrow({ where: { id: ids.c2 } })).status).toBe('draft');
  });

  it('Duyệt & ký: nháp → 409; OTP sai → 422 đếm lượt; OTP đúng → chờ khách ký, PDF nội dung đóng băng', async () => {
    expect((await post(`/contracts/${ids.c2}/sign-otp`)).status).toBe(409);
    ok(await act('contract.submit', { contract_id: ids.c2 }, sales));
    expect((await post(`/contracts/${ids.c2}/sign-otp`)).body.data.sent_to).toMatch(/•••/);
    const otp = otpIn(h.mail.last(ownerEmail)?.text)!;
    const bad = await act('contract.approve_and_sign', { contract_id: ids.c2, otp: otp === '000000' ? '111111' : '000000', signature_png: PNG });
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe('OTP_INVALID');
    expect((await act('contract.approve_and_sign', { contract_id: ids.c2, otp, signature_png: 'data:image/png;base64,x' })).status).toBe(422);
    ok(await act('contract.approve_and_sign', { contract_id: ids.c2, otp, signature_png: PNG }));
    const db = await tenant();
    const c = await db.contract.findUniqueOrThrow({ where: { id: ids.c2 } });
    expect(c).toMatchObject({ status: 'pending_signature' });
    expect(c.signedByBusinessAt).toBeTruthy();
    expect(c.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await db.outboxEvent.count({ where: { topic: 'contract.approved' } })).toBe(1);
    // OTP dùng một lần.
    expect((await act('contract.approve_and_sign', { contract_id: ids.c2, otp, signature_png: PNG })).status).toBe(409);
    const pdf = await call(h, `/contracts/${ids.c2}/pdf`, undefined, as(sales));
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
  }, 120_000);
});

describe('gửi ký + trang ký công khai', () => {
  it('khách chưa nhắn Zalo → 409 no_conversation; có hội thoại → link ký vào hội thoại, giai đoạn Hợp đồng', async () => {
    const r = await act('contract.send_for_signature', { contract_id: ids.c2, channel: 'zalo_personal' }, sales);
    expect(r.status).toBe(403);
    const r2 = await act('contract.send_for_signature', { contract_id: ids.c2, channel: 'zalo_personal' });
    expect(r2.status).toBe(409);
    expect(r2.body.error.fields).toMatchObject({ channel: 'no_conversation' });
    ids.conv = await zaloConversation(ids.vy!);
    const d = ok(await act('contract.send_for_signature', { contract_id: ids.c2, channel: 'zalo_personal' }));
    ids.token = tokenOf(d.result.sign_url);
    const m = await lastOut(ids.conv);
    expect(m.body).toContain('/sign/');
    expect(m.body).toContain('HĐ-');
    const db = await tenant();
    expect((await db.contact.findUniqueOrThrow({ where: { id: ids.vy } })).stage).toBe('contract');
    expect(await db.timelineEvent.count({ where: { contactId: ids.vy, type: 'contract' } })).toBe(1);
    expect(await h.platform.tenantSignRoute.count({ where: { workspaceId: h.ws } })).toBe(1);
    const row = contractRowSchema.parse((await get(`/contracts/${ids.c2}`)).body.data);
    expect(row.sign_token).toBe(ids.token);
  });

  it('mở link → opened; token sai → 410; OTP vào hội thoại; sai OTP còn lượt; ký → signed + PDF cuối + SHA-256; link dùng một lần', async () => {
    const v = signViewSchema.parse((await pub(`${ids.token}/open`, {})).body.data);
    expect(v).toMatchObject({ status: 'pending_signature', business: { signed: true }, otp_left: 5 });
    expect((await pub(`${ids.token.slice(0, -2)}xx`)).status).toBe(410);
    const o = await pub(`${ids.token}/otp`, {});
    expect(o.status, JSON.stringify(o.body)).toBe(200);
    expect(o.body.data.channel).toBe('zalo_personal');
    const otp = otpIn((await lastOut(ids.conv)).body)!;
    const bad = await pub(`${ids.token}/sign`, { otp: otp === '000000' ? '111111' : '000000', signature_png: PNG, consent: true });
    expect(bad).toMatchObject({ status: 422, body: { error: { code: 'OTP_INVALID' } } });
    expect((await pub(`${ids.token}/sign`, { otp, signature_png: PNG, consent: false })).status).toBe(422);
    const s = await pub(`${ids.token}/sign`, { otp, signature_png: PNG, consent: true });
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    const sv = signViewSchema.parse(s.body.data);
    expect(sv.status).toBe('signed');
    expect(sv.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(sv.certificate.map((e) => e.type)).toEqual(expect.arrayContaining(['sent', 'opened', 'otp_sent', 'otp_ok', 'signed']));
    const db = await tenant();
    const c = await db.contract.findUniqueOrThrow({ where: { id: ids.c2 } });
    expect(c.status).toBe('signed');
    const f = await db.file.findUniqueOrThrow({ where: { id: c.signedFileId! } });
    expect(f.sha256).toBe(c.signedSha256);
    expect(f.confirmed).toBe(true);
    expect(await db.outboxEvent.count({ where: { topic: 'contract.signed' } })).toBe(1);
    expect((await db.outboxEvent.findFirst({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } }))?.payload).toMatchObject({ kind: 'contract_signed' });
    expect((await lastOut(ids.conv)).body).toContain(c.signedSha256!.slice(0, 16));
    // Link dùng một lần: ký lại → 410; xem vẫn được trạng thái đã ký.
    expect((await pub(`${ids.token}/sign`, { otp, signature_png: PNG, consent: true })).status).toBe(410);
    expect((await pub(ids.token)).body.data.status).toBe('signed');
    const pdf = await fetch(`${h.base}/v1/public/sign/${ids.token}/pdf`);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    const body = Buffer.from(await pdf.arrayBuffer());
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(body.length).toBe(Number(f.size));
  }, 180_000);

  it('email: gửi ký → khách từ chối → declined + thông báo; nhắc / gia hạn / gửi lại sau khi từ chối → 409', async () => {
    h.clock.advance(1000);
    ids.c3 = ok(await act('contract.create', { contact_id: ids.lan, kind: 'service', value: '3000000' })).result.contract_id;
    await approveAndSign(ids.c3);
    const d = ok(await act('contract.send_for_signature', { contract_id: ids.c3, channel: 'email' }));
    const token = tokenOf(d.result.sign_url);
    ok(await act('contract.remind_signer', { contract_id: ids.c3 }));
    const ext = ok(await act('contract.extend_sign_link', { contract_id: ids.c3, days: 3 }));
    expect(new Date(ext.result.expires_at).getTime()).toBeGreaterThan(new Date(d.result.expires_at).getTime());
    const r = await pub(`${token}/decline`, { reason: 'Chưa sắp xếp được lịch' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const db = await tenant();
    expect(await db.contract.findUniqueOrThrow({ where: { id: ids.c3 } })).toMatchObject({ status: 'declined', declinedReason: 'Chưa sắp xếp được lịch' });
    expect((await db.outboxEvent.findFirst({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } }))?.payload).toMatchObject({ kind: 'contract_declined' });
    expect((await act('contract.remind_signer', { contract_id: ids.c3 })).status).toBe(409);
    expect((await act('contract.extend_sign_link', { contract_id: ids.c3 })).status).toBe(409);
    expect((await pub(`${token}/otp`, {})).status).toBe(410);
  }, 180_000);
});

describe('quét định kỳ + gia hạn + chấm dứt', () => {
  const deps = () => ({ platform: { workspace: { findMany: () => h.platform.workspace.findMany({ where: { id: h.ws }, select: { id: true, timezone: true, locale: true } }) } } as never, tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), now: () => h.clock.now() });

  it('link quá hạn mà khách chưa ký → declined', async () => {
    h.clock.advance(1000);
    ids.c4 = ok(await act('contract.create', { contact_id: ids.lan, kind: 'sale', value: '2000000' })).result.contract_id;
    await approveAndSign(ids.c4);
    ok(await act('contract.send_for_signature', { contract_id: ids.c4, channel: 'email' }));
    h.clock.advance(8 * 86_400_000);
    const r = await sweepContracts(deps());
    expect(r.declined).toBe(1);
    expect((await (await tenant()).contract.findUniqueOrThrow({ where: { id: ids.c4 } })).status).toBe('declined');
  }, 180_000);

  it('T-30 nhắc gia hạn một lần; qua ngày kết thúc → expired; renew tạo nháp mới; terminate bắt buộc lý do', async () => {
    // c2 đã ký, kết thúc 2026-12-15; đồng hồ hiện ~2026-11-07 → còn ≤ 30 ngày từ 2026-11-15.
    h.clock.advance(8 * 86_400_000);
    const r1 = await sweepContracts(deps());
    expect(r1.reminded).toBe(1);
    expect((await (await tenant()).outboxEvent.findFirst({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } }))?.payload).toMatchObject({ kind: 'contract_expiring' });
    expect((await sweepContracts(deps())).reminded).toBe(0);
    const renewed = ok(await act('contract.renew', { contract_id: ids.c2 }));
    const nr = contractRowSchema.parse((await get(`/contracts/${renewed.result.contract_id}`)).body.data);
    expect(nr).toMatchObject({ status: 'draft', renewal_of_id: ids.c2, contact_id: ids.vy });
    expect((await act('contract.terminate', { contract_id: ids.c2, reason: ' ' })).status).toBe(422);
    expect((await act('contract.terminate', { contract_id: ids.c2, reason: 'Khách chuyển nhà' }, sales)).status).toBe(403);
    h.clock.advance(40 * 86_400_000);
    expect((await sweepContracts(deps())).expired).toBe(1);
    const db = await tenant();
    expect((await db.contract.findUniqueOrThrow({ where: { id: ids.c2 } })).status).toBe('expired');
    expect((await act('contract.terminate', { contract_id: ids.c2, reason: 'x' })).status).toBe(409);
  });

  it('terminate hợp đồng đang hiệu lực: lý do + timeline + event', async () => {
    h.clock.advance(1000);
    const id = ok(await act('contract.create', { contact_id: ids.lan, kind: 'service', value: '1000000' })).result.contract_id as string;
    await approveAndSign(id);
    const d = ok(await act('contract.send_for_signature', { contract_id: id, channel: 'email' }));
    const token = tokenOf(d.result.sign_url);
    await pub(`${token}/otp`, {});
    const db = await tenant();
    const c = await db.contract.findUniqueOrThrow({ where: { id } });
    const otp = otpIn((await lastOut(c.conversationId!)).body)!;
    expect((await pub(`${token}/sign`, { otp, signature_png: PNG, consent: true })).status).toBe(200);
    ok(await act('contract.terminate', { contract_id: id, reason: 'Khách chuyển nhà' }));
    expect(await db.contract.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'terminated', terminatedReason: 'Khách chuyển nhà' });
    expect(await db.outboxEvent.count({ where: { topic: 'contract.terminated' } })).toBe(1);
  }, 180_000);
});

describe('đọc: quyền + scope + D42 + meta', () => {
  it('cs không xem (403); sales chỉ thấy hợp đồng mình làm; kế toán đọc hết, không tạo được', async () => {
    expect((await get('/contracts', cs)).status).toBe(403);
    const mine = contractsPageSchema.parse((await get('/contracts?page=1&limit=50', sales)).body);
    expect(mine.data.every((r) => r.owner_user_id === sales.id)).toBe(true);
    expect((await get(`/contracts/${ids.c1}`, sales)).status).toBe(404);
    const all = contractsPageSchema.parse((await get('/contracts?page=1&limit=50', accountant)).body);
    expect(all.meta.total).toBeGreaterThanOrEqual(5);
    expect((await act('contract.create', { contact_id: ids.lan, kind: 'sale', value: '1' }, accountant)).status).toBe(403);
  });

  it('D42: page + limit, chip trạng thái, khoảng giá trị, tìm không dấu; meta KPI + theo hợp đồng', async () => {
    const p1 = contractsPageSchema.parse((await get('/contracts?page=1&limit=2')).body);
    expect(p1.data).toHaveLength(2);
    expect(p1.next_cursor).toBe('2');
    const draft = contractsPageSchema.parse((await get('/contracts?status=draft')).body);
    expect(draft.data.every((r) => ['draft', 'pending_approval'].includes(r.status))).toBe(true);
    const big = contractsPageSchema.parse((await get('/contracts?value=gt30')).body);
    expect(big.data.every((r) => Number(r.value) > 30_000_000)).toBe(true);
    const q = contractsPageSchema.parse((await get(`/contracts?q=${encodeURIComponent('phuong vy')}`)).body);
    expect(q.data.length).toBeGreaterThanOrEqual(1);
    expect(q.data.every((r) => r.contact_id === ids.vy)).toBe(true);
    const m = contractsMetaSchema.parse((await get('/contracts/meta')).body.data);
    expect(m.stats.total).toBe(m.counts.all);
    expect(m.ai_runs.risk).toBeTruthy();
    const one = contractsMetaSchema.parse((await get(`/contracts/meta?contract_id=${ids.c1}`)).body.data);
    expect(one.crm.total).toBeGreaterThanOrEqual(1);
    expect(one.insight).toContain('Chị Lan');
  });
});
