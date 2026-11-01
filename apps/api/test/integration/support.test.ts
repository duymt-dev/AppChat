// TIP-034 AC trên Postgres 16 + Memurai: ticket & SLA — migration 034 + index (EXPLAIN danh sách D42 / job SLA); chính sách mặc định (seed,
// không xoá, sla.update_default chỉ áp việc mới, cs 403); tạo (TKT-, hạn FRT / TTR theo giờ làm việc, mặc định giao người tạo, agent →
// hạn AI) + chống trùng 24 giờ (hỏi gộp / gộp / tạo mới) + hoàn tác; đổi trạng thái (Đang chờ dừng TTR, rời chờ cộng thời gian dừng);
// bình luận nội bộ / trả lời (phản hồi đầu); đóng (lý do, sla_result, CSAT qua hội thoại) + hoàn tác; mở lại; bulk; job SLA (sắp đến hạn
// / quá hạn FRT + TTR → leo thang + thông báo, agent quá hạn → giao người); consumer tin khách (bình luận, chờ → xử lý, tự mở lại 7 ngày,
// CSAT); đọc /tickets* (D42, lọc, scope cs own / kế toán 403) + /settings/sla.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { slaSettingsSchema, ticketRowSchema, ticketsMetaSchema, ticketsPageSchema } from '@appchat/shared';
import { onAgentReply, onCustomerMessage, sweepSla, uuidv7, DEFAULT_SLA_POLICY_ID } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let cs: { id: string };
let accountant: { id: string };

beforeAll(async () => {
  h = await startApi();
  [cs, accountant] = [await h.member('cs'), await h.member('accountant')];
  await h.platform.workspace.update({ where: { id: h.ws }, data: { timezone: 'UTC' } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const act = (id: string, input: unknown, who?: { id: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { id: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const err = (r: { status: number; body: any }) => `${r.status} ${r.body?.error?.code}`; // eslint-disable-line @typescript-eslint/no-explicit-any
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const tk = async (id: string, who?: { id: string }) => ticketRowSchema.parse((await get(`/tickets/${id}`, who)).body.data);
const cal = { days: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, on: day < 6, from: '08:00', to: day === 5 ? '12:00' : '18:00' })), timeZone: 'UTC', enabled: true, locale: 'vi' };

// Đồng hồ test: 2026-10-30 08:00Z = thứ Sáu; workspace test múi UTC, giờ làm mặc định T2–T6 08:00–18:00.
const ids = {} as Record<'contact' | 'conv' | 'acc' | 'agent' | 't1' | 't2', string>;

describe('chính sách + tạo', () => {
  it('bảng + index; chính sách mặc định seed sẵn; EXPLAIN danh sách D42 + job SLA', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'ticket'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['ticket_code_key', 'ticket_recent_idx', 'ticket_status_due_idx', 'ticket_assignee_idx', 'ticket_open_ttr_idx', 'ticket_open_frt_idx', 'ticket_contact_idx']));
    expect(await db.slaPolicy.findUnique({ where: { id: DEFAULT_SLA_POLICY_ID } })).toMatchObject({ isDefault: true, frtHumanMin: 10, ttrHumanMin: 240 });
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = async (q: string) => (await c.query(`EXPLAIN ${q}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(await plan(`SELECT t.id FROM ticket t ORDER BY t.created_at DESC, t.id DESC LIMIT 20`)).toMatch(/ticket_recent_idx/);
      expect(await plan(`SELECT t.id FROM ticket t WHERE t.status IN ('open','in_progress') AND t.ttr_due_at < now()`)).toMatch(/ticket_(open_ttr|status_due)_idx/);
    } finally {
      await c.end();
    }
  });

  it('tạo: TKT-, ưu tiên mặc định, giao người tạo, hạn FRT 10′ / TTR 240′ giờ làm; agent → hạn AI; tạo từ tin nhắn gắn hội thoại + khách', async () => {
    const r = ok(await act('ticket.create', { title: 'Khách báo lỗi thanh toán', channel: 'zalo_personal', category: 'Billing', priority: 'medium', description: 'Chuyển khoản không nhận' }));
    ids.t1 = r.result.ticket_id;
    expect(r.result.code).toMatch(/^TKT-\d{4}$/);
    const t = await tk(ids.t1);
    expect([t.status, t.priority, t.assignee_user_id, t.frt_target_min, t.ttr_target_min, t.sla_policy_name]).toEqual(['open', 'medium', h.user, 10, 240, 'Mặc định']);
    // 08:00Z thứ Sáu + 240′ giờ làm = 12:00Z.
    expect(t.ttr_due_at).toBe('2026-10-30T12:00:00+00:00');
    expect(t.comments.map((c) => c.author_type)).toEqual(['contact']);
    expect(t.events.map((e) => e.type)).toEqual(['created', 'assigned']);

    const db = await tenant();
    ids.acc = uuidv7();
    await db.channelAccount.create({ data: { id: ids.acc, type: 'zalo_personal', name: 'Zalo', externalId: 'z-sup', status: 'connected', settings: {} } });
    const contact = ok(await act('contact.create', { full_name: 'Trần Thu Hà', phone: '0909 600 001' })).result.contact_id;
    ids.contact = contact;
    ids.conv = uuidv7();
    await db.conversation.create({ data: { id: ids.conv, channelAccountId: ids.acc, channelType: 'zalo_personal', contactId: contact, externalThreadId: 'z-ha', title: 'Hà', lastMessageAt: h.clock.now() } });
    const msg = uuidv7();
    await db.message.create({ data: { id: msg, conversationId: ids.conv, channelAccountId: ids.acc, direction: 'in', senderType: 'contact', senderId: 'k', kind: 'text', body: 'Đơn giao sai màu', externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
    const r2 = ok(await act('ticket.create', { title: 'Giao sai màu', channel: 'zalo_personal', category: 'Delivery', priority: 'high', source_message_id: msg }));
    ids.t2 = r2.result.ticket_id;
    const row = await db.ticket.findUniqueOrThrow({ where: { id: ids.t2 } });
    expect([row.conversationId, row.contactId]).toEqual([ids.conv, contact]);

    ids.agent = ok(await act('agent.create', { name: 'CSKH AI' })).result.agent_id;
    const ai = ok(await act('ticket.create', { title: 'Hỏi chính sách đổi trả', channel: 'webchat', category: 'Policy', priority: 'low', assignee_agent_id: ids.agent }));
    const at = await tk(ai.result.ticket_id);
    expect([at.assignee_agent_id, at.assignee_name, at.ttr_target_min, at.ttr_due_at]).toEqual([ids.agent, 'CSKH AI', 30, '2026-10-30T08:30:00+00:00']);
    expect(err(await act('ticket.create', { title: 'x', channel: 'webchat', category: 'Policy', priority: 'low', assignee_user_id: h.user, assignee_agent_id: ids.agent }))).toBe('422 VALIDATION_FAILED');
  });

  it('chống trùng 24 giờ (cùng khách + danh mục): hỏi gộp → gộp vào ticket cũ / vẫn tạo mới; hoàn tác tạo', async () => {
    const base = { title: 'Lại giao sai', channel: 'zalo_personal', category: 'Delivery', priority: 'medium', contact_id: ids.contact };
    const dup = await act('ticket.create', base);
    expect([dup.status, dup.body.error?.code, dup.body.error?.fields?.duplicate_of]).toEqual([409, 'CONFLICT', (await tk(ids.t2)).code]);
    const merged = ok(await act('ticket.create', { ...base, on_duplicate: 'merge' }));
    expect([merged.result.ticket_id, merged.result.merged]).toEqual([ids.t2, true]);
    expect((await tk(ids.t2)).comments.some((c) => c.internal && c.body.includes('Lại giao sai'))).toBe(true);
    const fresh = ok(await act('ticket.create', { ...base, on_duplicate: 'create' }));
    expect(fresh.result.ticket_id).not.toBe(ids.t2);
    expect((await undo(fresh.action_log_id)).status).toBe(200);
    expect((await get(`/tickets/${fresh.result.ticket_id}`)).status).toBe(404);
  });

  it('sla.update_default chỉ áp ticket mới; cs 403; GET /settings/sla trả chính sách thật + rủi ro', async () => {
    expect(err(await act('sla.update_default', { ttr_human: 480 }, cs))).toBe('403 FORBIDDEN');
    ok(await act('sla.update_default', { ttr_human: 480, escalation: { vip_wait: true } }));
    const s = slaSettingsSchema.parse((await get('/settings/sla')).body.data);
    expect([s.policy.ttr_human, s.escalation.find((e) => e.key === 'vip_wait')?.on]).toEqual([480, true]);
    expect((await tk(ids.t1)).ttr_target_min).toBe(240);
    const n = ok(await act('ticket.create', { title: 'Sau đổi chính sách', channel: 'email', category: 'Technical', priority: 'low' }));
    expect((await tk(n.result.ticket_id)).ttr_target_min).toBe(480);
    ok(await act('sla.update_default', { ttr_human: 240 }));
    expect((await get('/settings/sla', cs)).status).toBe(403);
  });
});

describe('vòng đời', () => {
  it('Đang chờ dừng TTR; rời chờ cộng thời gian dừng (giờ làm); sai bước INVALID_TRANSITION; hoàn tác', async () => {
    ok(await act('ticket.set_status', { ticket_id: ids.t1, status: 'in_progress' }));
    const w = ok(await act('ticket.set_status', { ticket_id: ids.t1, status: 'waiting' }));
    expect((await tk(ids.t1)).paused_since).not.toBeNull();
    h.clock.advance(60 * 60_000);
    expect((await tk(ids.t1)).sla.left_min).toBe(240);
    ok(await act('ticket.set_status', { ticket_id: ids.t1, status: 'in_progress' }));
    expect((await tk(ids.t1)).ttr_due_at).toBe('2026-10-30T13:00:00+00:00');
    expect(err(await act('ticket.set_status', { ticket_id: ids.t1, status: 'in_progress' }))).toBe('409 INVALID_TRANSITION');
    expect((await undo(w.action_log_id)).status).toBe(409);
  });

  it('bình luận nội bộ / trả lời khách (gửi vào hội thoại, chốt phản hồi đầu) + hoàn tác ghi chú', async () => {
    const n = ok(await act('ticket.comment', { ticket_id: ids.t2, body: 'Kiểm tra kho', internal: true }));
    expect((await undo(n.action_log_id)).status).toBe(200);
    ok(await act('ticket.comment', { ticket_id: ids.t2, body: 'Dạ shop xin lỗi, em đổi hàng ngay', internal: false }));
    const db = await tenant();
    const row = await db.ticket.findUniqueOrThrow({ where: { id: ids.t2 } });
    expect(row.firstResponseAt).not.toBeNull();
    expect(await db.message.count({ where: { conversationId: ids.conv, direction: 'out', body: { contains: 'đổi hàng ngay' } } })).toBe(1);
    const t = await tk(ids.t2);
    expect(t.comments.filter((c) => c.body === 'Kiểm tra kho')).toEqual([]);
    expect(t.events.map((e) => e.type)).toContain('reply');
  });

  it('đóng (lý do bắt buộc, sla_result, CSAT qua hội thoại) → khách trả 5 → csat; khách nhắn trong 7 ngày → tự mở lại; mở lại tay; hoàn tác đóng', async () => {
    expect((await act('ticket.close', { ticket_id: ids.t2 })).status).toBe(422);
    const c = ok(await act('ticket.close', { ticket_id: ids.t2, reason: 'resolved' }));
    expect(c.result.sla_result).toBe('met');
    const db = await tenant();
    expect(await db.message.count({ where: { conversationId: ids.conv, direction: 'out', body: { contains: 'từ 1 đến 5' } } })).toBe(1);
    const reply = async (body: string) => {
      const id = uuidv7();
      await db.message.create({ data: { id, conversationId: ids.conv, channelAccountId: ids.acc, direction: 'in', senderType: 'contact', senderId: 'k', kind: 'text', body, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
      await onCustomerMessage(db, h.ws, { conversation_id: ids.conv, message_id: id }, h.clock.now(), cal);
    };
    await reply('5');
    expect((await tk(ids.t2)).csat).toBe(5);
    expect((await tk(ids.t2)).status).toBe('closed');
    h.clock.advance(3 * 86_400_000);
    await reply('Hàng đổi vẫn lỗi');
    const re = await tk(ids.t2);
    expect([re.status, re.reopened_count, re.comments.at(-1)?.body]).toEqual(['open', 1, 'Hàng đổi vẫn lỗi']);
    // Trả lời của nhân viên qua hộp thư → chốt phản hồi đầu của lượt mở lại.
    await onAgentReply(db, { conversation_id: ids.conv, sender_type: 'user' }, h.clock.now());
    expect((await db.ticket.findUniqueOrThrow({ where: { id: ids.t2 } })).firstResponseAt).not.toBeNull();
    const c2 = ok(await act('ticket.close', { ticket_id: ids.t1, reason: 'withdrawn', note: 'Khách huỷ' }));
    expect(c2.result.sla_result).toBe('breached');
    expect((await undo(c2.action_log_id)).status).toBe(200);
    expect((await tk(ids.t1)).status).toBe('in_progress');
    ok(await act('ticket.close', { ticket_id: ids.t1, reason: 'duplicate' }));
    expect(err(await act('ticket.reopen', { ticket_id: ids.t2 }))).toBe('409 INVALID_TRANSITION');
    ok(await act('ticket.reopen', { ticket_id: ids.t1 }));
    expect((await tk(ids.t1)).reopened_count).toBe(1);
  });

  it('giao người / agent (một trong hai) + bulk ưu tiên + hoàn tác bulk', async () => {
    expect(err(await act('ticket.assign', { ticket_id: ids.t1 }))).toBe('422 VALIDATION_FAILED');
    ok(await act('ticket.assign', { ticket_id: ids.t1, assignee_user_id: cs.id }));
    expect((await tk(ids.t1)).assignee_user_id).toBe(cs.id);
    const b = ok(await act('ticket.bulk_update', { ticket_ids: [ids.t1, ids.t2], priority: 'high' }));
    expect(b.result.updated).toBe(2);
    expect((await undo(b.action_log_id)).status).toBe(200);
    expect((await tk(ids.t2)).priority).toBe('high');
    expect((await tk(ids.t1)).priority).toBe('medium');
  });
});

describe('job SLA + đọc', () => {
  it('sắp đến hạn → sla_warning; quá hạn FRT / TTR → leo thang (mỗi mốc một lần) + thông báo Chủ sở hữu; agent quá hạn → giao người', async () => {
    const db = await tenant();
    const r = ok(await act('ticket.create', { title: 'Lỗi đăng nhập app', channel: 'email', category: 'Technical', priority: 'high' }));
    const ai = ok(await act('ticket.create', { title: 'AI xử lý chậm', channel: 'webchat', category: 'Return', priority: 'low', assignee_agent_id: ids.agent }));
    h.clock.advance(200 * 60_000);
    const s1 = await sweepSla(db, h.ws, h.clock.now());
    expect(s1.breached).toBeGreaterThanOrEqual(2);
    expect(s1.warned).toBeGreaterThanOrEqual(1);
    const row = await db.ticket.findUniqueOrThrow({ where: { id: r.result.ticket_id } });
    expect([row.frtBreachedAt !== null, row.warnedAt !== null, row.breachedAt]).toEqual([true, true, null]);
    expect((await db.ticket.findUniqueOrThrow({ where: { id: ai.result.ticket_id } })).assigneeAgentId).toBeNull();
    h.clock.advance(60 * 60_000);
    await sweepSla(db, h.ws, h.clock.now());
    expect((await sweepSla(db, h.ws, h.clock.now())).breached).toBe(0);
    const t = await tk(r.result.ticket_id);
    expect([t.sla.state, t.escalations]).toEqual(['breach', 2]);
    expect(t.events.filter((e) => e.type === 'escalated')).toHaveLength(2);
    const topics = (await db.outboxEvent.findMany({ where: { topic: { startsWith: 'ticket.sla' } }, select: { topic: true } })).map((x) => x.topic);
    expect(topics).toEqual(expect.arrayContaining(['ticket.sla_warning', 'ticket.sla_breached']));
  });

  it('/tickets D42 + lọc (trạng thái / SLA / agent / tìm không dấu) + meta KPI; scope cs own; kế toán 403', async () => {
    const page = ticketsPageSchema.parse((await get('/tickets?page=1&limit=3')).body);
    expect([page.data.length, page.meta.page, page.next_cursor]).toEqual([3, 1, '2']);
    expect(ticketsPageSchema.parse((await get('/tickets?sla=breach')).body).data.every((t) => t.sla.state === 'breach')).toBe(true);
    expect(ticketsPageSchema.parse((await get('/tickets?q=dang nhap')).body).data.map((t) => t.title)).toEqual(['Lỗi đăng nhập app']);
    expect(ticketsPageSchema.parse((await get('/tickets?status=closed')).body).data.every((t) => t.status === 'closed')).toBe(true);
    const meta = ticketsMetaSchema.parse((await get('/tickets/meta')).body.data);
    expect([meta.counts.total, meta.agent.name, meta.categories.includes('Billing')]).toEqual([page.meta.total, 'CSKH AI', true]);
    expect(meta.ai.map((x) => x[0])).toContain('overdue');
    const mine = ticketsPageSchema.parse((await get('/tickets', cs)).body).data;
    expect(mine.map((t) => t.id)).toEqual([ids.t1]);
    expect((await get(`/tickets/${ids.t2}`, cs)).status).toBe(404);
    expect((await get('/tickets', accountant)).status).toBe(403);
  });
});
