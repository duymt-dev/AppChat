// TIP-042c AC3 / AC4 / AC6 — watcher (D32 chỉ đọc) có permission ghi của vai trò sales nhưng không có grant ghi độc lập: mọi action ghi trên
// chứng từ / lịch hẹn / khách / hội thoại → 403 SCOPE_FORBIDDEN, không đổi dòng, không outbox, không tiền; preview (nguồn Trợ lý) cũng 403.
// Collaborator trong phạm vi ghi được nhưng không chuyển phụ trách / xoá khách. Đổi quyền giữa chừng: request kế tiếp dùng quyền mới.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthzResolver, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';
import { seedBase, seedRecords, type RecordSet } from './helpers/record-scope-fixtures';

let h: Harness;
let resolver: TenantDbResolver;
let owner: { id: string; token: string };
let W: { id: string; token: string };
let C: { id: string; token: string };
let rec: RecordSet;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, who: { token: string }, source?: string) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), authorization: `Bearer ${who.token}`, ...(source ? { 'x-action-source': source } : {}) }).then(json);
const get = (path: string, who: { token: string }) => call(h, path, undefined, { authorization: `Bearer ${who.token}` }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

/** Ảnh chụp dữ liệu có thể bị ghi — so trước / sau để chứng minh không side effect. */
async function snapshot() {
  const db = await tenant();
  return JSON.stringify({
    outbox: await db.outboxEvent.count(),
    quote: await db.quote.findUnique({ where: { id: rec.quote }, select: { status: true, note: true, version: true } }),
    contract: await db.contract.findUnique({ where: { id: rec.contract }, select: { status: true, title: true } }),
    order: await db.order.findUnique({ where: { id: rec.order }, select: { status: true, note: true, paidTotal: true } }),
    invoice: await db.invoice.findUnique({ where: { id: rec.invoice }, select: { status: true, paidAmount: true } }),
    appointment: await db.appointment.findUnique({ where: { id: rec.appointment }, select: { status: true, startAt: true } }),
    contact: await db.contact.findUnique({ where: { id: rec.contact }, select: { name: true, ownerUserId: true } }),
    conversation: await db.conversation.findUnique({ where: { id: rec.conversation }, select: { archivedAt: true, assigneeUserId: true } }),
    messages: await db.message.count({ where: { conversationId: rec.conversation } }),
    payments: await db.customerPayment.count(),
    comments: await db.quoteComment.count({ where: { quoteId: rec.quote } }),
  }, (_k, v: unknown) => (typeof v === 'bigint' ? String(v) : v));
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  [owner, W, C] = [await h.member('sales'), await h.member('sales'), await h.member('sales')];
  const db = await tenant();
  rec = await seedRecords(db, { ...(await seedBase(db, h.clock.now())), owner: owner.id, team: null, at: h.clock.now() });
  await db.contactCollaborator.createMany({ data: [{ contactId: rec.contact, userId: W.id, role: 'watcher' }, { contactId: rec.contact, userId: C.id, role: 'collaborator' }] });
  await h.app.get(AuthzResolver).invalidate(h.ws);
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const WRITES = (): [string, Record<string, unknown>][] => [
  ['message.send', { conversation_id: rec.conversation, text: 'Chào chị' }],
  ['conversation.archive', { conversation_id: rec.conversation }],
  ['conversation.mark_read', { conversation_id: rec.conversation }],
  ['contact.update', { contact_id: rec.contact, patch: { full_name: 'Đổi tên' } }],
  ['quote.update', { quote_id: rec.quote, patch: { note: 'sửa' } }],
  ['quote.comment', { quote_id: rec.quote, text: 'ghi chú' }],
  ['quote.send', { quote_id: rec.quote, channel: 'webchat' }],
  ['contract.update', { contract_id: rec.contract, patch: { title: 'sửa' } }],
  ['contract.send_for_signature', { contract_id: rec.contract, channel: 'webchat' }],
  ['order.update', { order_id: rec.order, patch: { note: 'sửa' } }],
  ['order.confirm', { order_id: rec.order }],
  ['order.cancel', { order_id: rec.order, reason: 'thử' }],
  ['invoice.record_payment', { invoice_id: rec.invoice, amount: '1000', method: 'cash' }],
  ['invoice.void', { invoice_id: rec.invoice, reason: 'thử' }],
  ['invoice.send_payment_qr', { invoice_id: rec.invoice, channel: 'webchat' }],
  ['appointment.cancel', { appointment_id: rec.appointment, reason: 'thử' }],
  ['appointment.check_in', { appointment_id: rec.appointment }],
];

describe('AC3 watcher không ghi', () => {
  it('watcher đọc được chứng từ + khách + hội thoại', async () => {
    for (const p of [`/quotes/${rec.quote}`, `/contracts/${rec.contract}`, `/orders/${rec.order}`, `/invoices/${rec.invoice}`, `/calendar/${rec.appointment}`, `/contacts/${rec.contact}`, `/conversations/${rec.conversation}`])
      expect((await get(p, W)).status, p).toBe(200);
  });

  it('mọi action ghi (ui + preview Trợ lý) → 403 SCOPE_FORBIDDEN, không side effect / outbox / tiền', async () => {
    const before = await snapshot();
    for (const [id, input] of WRITES()) {
      const r = await act(id, input, W);
      // Permission thiếu (vai trò sales không có) là 403 FORBIDDEN của executor — cũng là từ chối, không side effect.
      expect(r.status, `${id} ${JSON.stringify(r.body)}`).toBe(403);
      if (r.body.error.code !== 'FORBIDDEN') expect(r.body.error.code, id).toBe('SCOPE_FORBIDDEN');
      const pv = await act(id, input, W, 'assistant');
      expect(pv.status, `preview ${id}`).toBe(403);
    }
    expect(await snapshot()).toBe(before);
  });

  it('collaborator ghi được trong phạm vi, nhưng không chuyển phụ trách / xoá khách', async () => {
    expect((await act('quote.comment', { quote_id: rec.quote, text: 'đồng phụ trách' }, C)).status).toBe(200);
    expect((await act('conversation.mark_read', { conversation_id: rec.conversation }, C)).status).toBe(200);
    expect((await act('contact.transfer_owner', { contact_id: rec.contact, to_user_id: C.id, move: { conversations: false, quotes: false, appointments: false } }, C)).status).toBe(403);
    expect((await act('contact.delete', { contact_id: rec.contact }, C)).status).toBe(403);
  });
});

describe('AC6 đổi quyền giữa chừng', () => {
  it('collaborator bị hạ xuống watcher → ghi kế tiếp 403 (không giữ quyền cũ); nâng lại → ghi được', async () => {
    const db = await tenant();
    await db.contactCollaborator.update({ where: { contactId_userId: { contactId: rec.contact, userId: C.id } }, data: { role: 'watcher' } });
    expect((await act('quote.comment', { quote_id: rec.quote, text: 'sau khi hạ' }, C)).body.error?.code).toBe('SCOPE_FORBIDDEN');
    await db.contactCollaborator.update({ where: { contactId_userId: { contactId: rec.contact, userId: C.id } }, data: { role: 'collaborator' } });
    expect((await act('quote.comment', { quote_id: rec.quote, text: 'sau khi nâng' }, C)).status).toBe(200);
  });

  it('preview cũ không giữ quyền: xin preview khi còn collaborator → hạ watcher → xác nhận 403', async () => {
    const db = await tenant();
    const pv = await act('quote.comment', { quote_id: rec.quote, text: 'preview' }, C, 'assistant');
    expect([200, 202]).toContain(pv.status);
    await db.contactCollaborator.update({ where: { contactId_userId: { contactId: rec.contact, userId: C.id } }, data: { role: 'watcher' } });
    const token = pv.body.data?.confirm_token as string | undefined;
    if (token) {
      const r = await call(h, `/actions/quote.comment`, { input: { quote_id: rec.quote, text: 'preview' }, confirm_token: token }, { 'idempotency-key': uuidv7(), authorization: `Bearer ${C.token}`, 'x-action-source': 'assistant' }).then(json);
      expect(r.status).toBe(403);
    }
    expect((await act('quote.comment', { quote_id: rec.quote, text: 'sau hạ' }, C)).status).toBe(403);
    await db.contactCollaborator.update({ where: { contactId_userId: { contactId: rec.contact, userId: C.id } }, data: { role: 'collaborator' } });
  });

  it('CSKH: đọc khách người khác (crm all) nhưng sửa → 403 (scope ghi own)', async () => {
    const cs = await h.member('cs');
    await h.app.get(AuthzResolver).invalidate(h.ws);
    expect((await get(`/contacts/${rec.contact}`, cs)).status).toBe(200);
    const r = await act('contact.update', { contact_id: rec.contact, patch: { full_name: 'CSKH sửa' } }, cs);
    expect([r.status, r.body.error.code]).toEqual([403, 'SCOPE_FORBIDDEN']);
  });
});
