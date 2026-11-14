// TIP-026b P1 trên Postgres 16 + Memurai (AC1–AC4): hoạt động CRM thật. Ghi chú cũ giữ kind note; thêm ghi chú / bình luận → bản ghi +
// timeline (không thân) + 360 đúng loại, không tin ra kênh. Việc: CAS (if_version lệch 409), done → completed_at do server, mở lại xoá,
// done lặp không đổi version; người được giao phải đủ điều kiện. Cơ hội: tiền ẩn với CS (không quote.view) — VẮNG chứ không 0; CS ghi tiền
// → 403; TIP-026c: update không đổi giai đoạn (`use_set_stage`), `probability` / `quote_id` → 422 `field_removed`. Nguồn hội thoại giả /
// khác khách → 422. Hoàn tác sau khi đã sửa → 409. GET phân trang > 30.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase } from '@appchat/db';
import { activityPageSchema, contact360Schema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let cs: { id: string; token: string };
let contactId = '';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  cs = await h.member('cs');
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, as(who)).then(json);
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);

describe('ghi chú / bình luận (AC1)', () => {
  it('ghi chú lúc tạo khách giữ kind note; thêm ghi chú + bình luận → bản ghi, timeline không thân, 360 đúng loại', async () => {
    contactId = ok(await act('contact.create', { full_name: 'Chị Mai Hoạt Động', phone: '0909300001', note: 'Ghi chú ban đầu' })).contact_id;
    const db = await tenant();
    expect(await db.contactNote.findFirstOrThrow({ where: { contactId } })).toMatchObject({ kind: 'note', body: 'Ghi chú ban đầu' });
    const n = ok(await act('contact.add_note', { contact_id: contactId, body: 'Khách thích gói cuối tuần' }));
    expect(n).toMatchObject({ kind: 'note', version: 1 });
    const c = ok(await act('contact.add_comment', { contact_id: contactId, body: 'Anh Nam gọi lại giúp em' }));
    expect(c.kind).toBe('comment');
    const tl = await db.timelineEvent.findMany({ where: { contactId, refType: 'contact_note' } });
    expect(tl.map((t) => t.type).sort()).toEqual(['comment', 'note']);
    expect(JSON.stringify(tl)).not.toContain('cuối tuần');
    // Không tạo tin ra kênh.
    expect(await db.conversation.count({ where: { contactId } })).toBe(0);
    const p = contact360Schema.parse((await get(`/contacts/${contactId}`)).body.data);
    expect(p.note.body).toBe('Khách thích gói cuối tuần');
    expect(p.comments.map((x) => x.body)).toEqual(['Anh Nam gọi lại giúp em']);
    expect(p.activities).toMatchObject({ notes: { count: 2 }, comments: { count: 1 }, can_edit: true });
  });

  it('nguồn hội thoại giả / không thuộc khách → 422', async () => {
    const r = await act('contact.add_note', { contact_id: contactId, body: 'x', source_conversation_id: uuidv7() });
    expect([r.status, r.body.error.fields]).toEqual([422, { source_conversation_id: 'invalid' }]);
    expect((await act('contact.add_note', { contact_id: contactId, body: 'x', source_message_id: uuidv7() })).status).toBe(422);
  });
});

describe('việc chăm sóc (AC2)', () => {
  it('tạo (mặc định giao người gọi) → done (completed_at server) → done lặp không đổi → mở lại; if_version lệch 409; chuyển sai 422', async () => {
    const t = ok(await act('contact_task.create', { contact_id: contactId, title: 'Gọi lại tư vấn', due_at: '2026-11-02T09:00:00+07:00' }));
    const db = await tenant();
    expect(await db.contactTask.findUniqueOrThrow({ where: { id: t.task_id } })).toMatchObject({ assigneeUserId: h.user, state: 'open', dueAt: new Date('2026-11-02T02:00:00Z') });
    expect((await act('contact_task.set_state', { task_id: t.task_id, if_version: 9, state: 'done' })).status).toBe(409);
    const d = ok(await act('contact_task.set_state', { task_id: t.task_id, if_version: 1, state: 'done' }));
    expect(d).toMatchObject({ state: 'done', version: 2 });
    expect((await db.contactTask.findUniqueOrThrow({ where: { id: t.task_id } })).completedAt).not.toBeNull();
    expect(ok(await act('contact_task.set_state', { task_id: t.task_id, state: 'done' })).version).toBe(2);
    ok(await act('contact_task.set_state', { task_id: t.task_id, if_version: 2, state: 'cancelled' }));
    const back = ok(await act('contact_task.set_state', { task_id: t.task_id, if_version: 3, state: 'open' }));
    expect(back.version).toBe(4);
    expect((await db.contactTask.findUniqueOrThrow({ where: { id: t.task_id } })).completedAt).toBeNull();
    // Không chạy AI / không đặt lịch.
    expect(await db.aiRun.count({ where: { input: { path: ['source'], equals: 'contact_task' } } })).toBe(0);
    expect(await db.appointment.count({ where: { contactId } })).toBe(0);
  });

  it('người được giao không phải thành viên → 422; sửa không đổi gì → cùng version', async () => {
    const r = await act('contact_task.create', { contact_id: contactId, title: 'Giao người lạ', assignee_user_id: uuidv7() });
    expect([r.status, r.body.error.fields]).toEqual([422, { assignee_user_id: 'not_eligible' }]);
    const t = ok(await act('contact_task.create', { contact_id: contactId, title: 'Không đổi' }));
    expect(ok(await act('contact_task.update', { task_id: t.task_id, patch: { title: 'Không đổi' } })).version).toBe(1);
  });

  it('hoàn tác tạo việc sau khi đã sửa → 409; chưa sửa → huỷ (giữ bản ghi)', async () => {
    const a = await act('contact_task.create', { contact_id: contactId, title: 'Sẽ sửa' });
    const id = ok(a).task_id;
    ok(await act('contact_task.update', { task_id: id, patch: { title: 'Đã sửa' } }));
    expect((await undo(a.body.data.action_log_id)).status).toBe(409);
    const b = await act('contact_task.create', { contact_id: contactId, title: 'Hoàn tác' });
    expect((await undo(b.body.data.action_log_id)).status).toBe(200);
    expect((await (await tenant()).contactTask.findUniqueOrThrow({ where: { id: ok(b).task_id } })).state).toBe('cancelled');
  });
});

describe('cơ hội (AC3)', () => {
  it('Owner ghi giá trị kỳ vọng; CS đọc → tiền VẮNG + amount_hidden; CS ghi tiền → 403; update không đổi giai đoạn', async () => {
    const db = await tenant();
    // CS thấy khách (crm all) nhưng chỉ sửa khách mình — giao CS làm phụ trách để thử quyền ghi.
    await db.contact.update({ where: { id: contactId }, data: { ownerUserId: cs.id } });
    const o = ok(await act('contact_opportunity.create', { contact_id: contactId, title: 'Gói 10 buổi', amount_vnd: '12000000' }));
    const r = await get(`/contacts/${contactId}/activities?kind=opportunities`, cs);
    const page = activityPageSchema.parse({ kind: 'opportunities', items: r.body.data, next_cursor: r.body.next_cursor });
    const it0 = page.items[0] as { amount_vnd?: unknown; amount_hidden?: boolean };
    expect('amount_vnd' in it0).toBe(false);
    expect(it0.amount_hidden).toBe(true);
    const owner = (await get(`/contacts/${contactId}/activities?kind=opportunities`)).body.data[0];
    expect(owner.amount_vnd).toBe('12000000');
    expect((await act('contact_opportunity.update', { opportunity_id: o.opportunity_id, patch: { amount_vnd: null } }, cs)).status).toBe(403);
    expect(ok(await act('contact_opportunity.update', { opportunity_id: o.opportunity_id, if_version: 1, patch: { need: 'Muốn bắt đầu tháng 12' } }, cs)).version).toBe(2);
    const won = await act('contact_opportunity.update', { opportunity_id: o.opportunity_id, patch: { stage: 'won' } });
    expect([won.status, won.body.error.fields]).toEqual([422, { 'patch.stage': 'use_set_stage' }]);
    expect(await db.order.count({ where: { contactId } })).toBe(0);
    // Tạo ở giai đoạn kết thúc → 422; xác suất (ô của 026b) → 422 field_removed.
    expect((await act('contact_opportunity.create', { contact_id: contactId, title: 'x', stage: 'won' })).status).toBe(422);
    const prob = await act('contact_opportunity.create', { contact_id: contactId, title: 'x', probability: 33 });
    expect([prob.status, prob.body.error.fields]).toEqual([422, { probability: 'field_removed' }]);
    const ar = ok(await act('contact_opportunity.archive', { opportunity_id: o.opportunity_id }));
    expect(ar.archived).toBe(true);
    expect((await act('contact_opportunity.update', { opportunity_id: o.opportunity_id, patch: { need: 'y' } })).status).toBe(409);
    await db.contact.update({ where: { id: contactId }, data: { ownerUserId: h.user } });
  });

  it('quote_id trên cơ hội (026b) → 422 field_removed — báo giá trỏ tới cơ hội, không ngược lại', async () => {
    const r = await act('contact_opportunity.create', { contact_id: contactId, title: 'x', quote_id: uuidv7() });
    expect([r.status, r.body.error.fields]).toEqual([422, { quote_id: 'field_removed' }]);
  });
});

describe('đọc phân trang + quyền (AC4)', () => {
  it('35 bình luận → trang 30 + cursor → 5; cursor lệch loại 400; khách người khác (sales own) → 404', async () => {
    for (let i = 0; i < 35; i++) ok(await act('contact.add_comment', { contact_id: contactId, body: `bình luận ${i}` }));
    const p1 = await get(`/contacts/${contactId}/activities?kind=comments`);
    expect(p1.body.data).toHaveLength(30);
    const p2 = await get(`/contacts/${contactId}/activities?kind=comments&cursor=${p1.body.next_cursor}`);
    expect(p2.body.data).toHaveLength(6);
    expect(p2.body.next_cursor).toBeNull();
    const ids = new Set([...p1.body.data, ...p2.body.data].map((x: { id: string }) => x.id));
    expect(ids.size).toBe(36);
    expect((await get(`/contacts/${contactId}/activities?kind=notes&cursor=${p1.body.next_cursor}`)).status).toBe(400);
    const sales = await h.member('sales');
    expect((await get(`/contacts/${contactId}/activities?kind=comments`, sales)).status).toBe(404);
    expect((await act('contact.add_note', { contact_id: contactId, body: 'x' }, sales)).status).toBe(404);
  });
});

describe('EXPLAIN 10k (§6)', () => {
  it('trang ghi chú / việc / cơ hội dùng index đúng thứ tự (bằng trước, sắp xếp sau) — không quét rộng trước LIMIT', async () => {
    const db = await tenant();
    const k = ok(await act('contact.create', { full_name: 'Khách 10k', phone: '0909300999' })).contact_id;
    await db.$executeRawUnsafe(`INSERT INTO contact_note (id, contact_id, kind, body, created_at)
      SELECT gen_random_uuid(), '${k}'::uuid, (CASE WHEN g % 2 = 0 THEN 'note' ELSE 'comment' END)::contact_note_kind, 'n' || g, now() - (g || ' minutes')::interval FROM generate_series(1, 10000) g`);
    await db.$executeRawUnsafe(`INSERT INTO contact_task (id, contact_id, title, state, completed_at, due_at)
      SELECT gen_random_uuid(), '${k}'::uuid, 't' || g, (CASE WHEN g % 3 = 0 THEN 'done' ELSE 'open' END)::contact_task_state,
        CASE WHEN g % 3 = 0 THEN now() END, CASE WHEN g % 5 = 0 THEN NULL ELSE now() + (g || ' minutes')::interval END FROM generate_series(1, 10000) g`);
    await db.$executeRawUnsafe(`INSERT INTO contact_opportunity (id, contact_id, title, updated_at)
      SELECT gen_random_uuid(), '${k}'::uuid, 'o' || g, now() - (g || ' minutes')::interval FROM generate_series(1, 10000) g`);
    // Thống kê thật (vai trò app không ANALYZE được) — chạy bằng migrator trên đúng DB tenant.
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await mig.connect();
    await mig.query('ANALYZE contact_note, contact_task, contact_opportunity');
    await mig.end();
    const plan = (sql: string) =>
      db.$transaction(async (tx) => (await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`)).map((r) => r['QUERY PLAN']).join(String.fromCharCode(10)));
    const notes = await plan(`SELECT id FROM contact_note WHERE contact_id = '${k}'::uuid AND kind = 'comment' AND deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 31`);
    const tasks = await plan(`SELECT id FROM contact_task WHERE contact_id = '${k}'::uuid ORDER BY state ASC, due_at ASC NULLS LAST, id ASC LIMIT 31`);
    const opps = await plan(`SELECT id FROM contact_opportunity WHERE contact_id = '${k}'::uuid AND archived_at IS NULL ORDER BY updated_at DESC, id DESC LIMIT 31`);
    if (process.env.EXPLAIN_OUT) (await import('node:fs')).writeFileSync(process.env.EXPLAIN_OUT, ['## notes', notes, '## tasks', tasks, '## opportunities', opps].join(String.fromCharCode(10)));
    for (const [p, idx] of [[notes, 'contact_note_kind_time_idx'], [tasks, 'contact_task_list_idx'], [opps, 'contact_opportunity_contact_idx']] as const) {
      expect(p).toContain(idx);
      expect(p).not.toMatch(/Seq Scan|Sort Method/);
    }
    // Trang theo cursor qua reader thật: 2 trang việc liền nhau không trùng.
    const p1 = await get(`/contacts/${k}/activities?kind=tasks&limit=100`);
    const p2 = await get(`/contacts/${k}/activities?kind=tasks&limit=100&cursor=${p1.body.next_cursor}`);
    const ids = [...p1.body.data, ...p2.body.data].map((x: { id: string }) => x.id);
    expect(new Set(ids).size).toBe(200);
  });
});

