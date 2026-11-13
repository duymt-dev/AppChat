// TIP-034c trên Postgres 16 + Memurai thật: sửa ticket hàng loạt có kết quả từng id + hoàn tác có canh gác.
// AC1 200 id lẫn thiếu / ẩn / đóng / lệch version / trùng → kết quả riêng từng id, `updated` / `changed_count` đúng. AC2 patch kết hợp:
// người nhận hết hợp lệ → không ticket nào của đợt nhận nửa patch. AC3 50 chạy ngay / 51 → 202 (nhận ≠ xong), chạy lại / event lặp không
// ghi lần hai, huỷ giữ phần đã ghi. AC4 con riêng không gọi được qua HTTP / ctx giả. AC5 trigger version một nguồn (ORM / SQL thô / hệ
// thống), hoàn tác đơn lẻ / hàng loạt gặp sửa sau đó → xung đột riêng ticket. AC6 /action-logs/:id/undo → 409 UNDO_REQUIRES_ACTION (không
// ghi), ticket.bulk_undo: đang chạy → OPERATION_BUSY, một phần + xung đột, hai yêu cầu hội tụ một lượt, sau niêm phong không thử lại.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { ActionExecutor, AuthzResolver, allowedAction, runDataJob, uuidv7, type RunDeps } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let cs: { id: string; token: string };
let deps: RunDeps;

type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response): Promise<Res> => ({ status: r.status, body: await r.json().catch(() => null) });
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const post = (id: string, body: unknown, who?: { token: string }, key = uuidv7()) => call(h, `/actions/${id}`, body, { 'idempotency-key': key, ...as(who) }).then(json);
/** Hàng loạt (bulk → xem trước → xác nhận, cùng một Idempotency-Key). */
async function bulk(id: string, input: unknown, who?: { token: string }) {
  const key = uuidv7();
  const p = await post(id, { input }, who, key);
  if (p.status !== 202 || p.body.data?.status !== 'preview_required') return { preview: null, done: p };
  return { preview: p.body.data.preview, done: await post(id, { input, confirm_token: p.body.data.confirm_token }, who, key) };
}
const run = (jobId: string) => runDataJob(db, h.ws, jobId, deps);
const tk = (id: string) => db.ticket.findUniqueOrThrow({ where: { id } });

/** N ticket mở, phụ trách = Owner, ưu tiên medium (ghi thẳng DB — nhanh; scope / trigger như thật). */
async function seed(n: number, o: { status?: 'open' | 'closed'; assignee?: string } = {}) {
  const now = h.clock.now();
  const ids = Array.from({ length: n }, () => uuidv7(now.getTime()));
  await db.ticket.createMany({
    data: ids.map((id, i) => ({
      id, code: `TKB-${id.slice(-6)}-${i}`, title: `Bulk ${i}`, category: 'Refund', channel: 'email', priority: 'medium' as const, status: o.status ?? 'open', ...(o.status === 'closed' ? { closeReason: 'resolved', slaResult: 'met', closedAt: now } : {}),
      assigneeUserId: o.assignee ?? h.user, slaPolicyName: 'Mặc định', frtDueAt: new Date(now.getTime() + 3_600_000), ttrStartAt: now, ttrDueAt: new Date(now.getTime() + 86_400_000), createdAt: now, updatedAt: now,
    })),
  });
  return ids;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'ticket-bulk-test'));
  [sales, cs] = [await h.member('sales'), await h.member('cs')];
  const authz = h.app.get(AuthzResolver, { strict: false });
  deps = {
    authzOf: async (ws, userId) => {
      const m = userId ? await h.platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } }) : null;
      return m ? authz.resolve(ws, userId!, m) : null;
    },
    allowed: allowedAction,
    now: () => h.clock.now(),
    owner: 'ticket-bulk-test',
  };
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('trigger version (một nguồn)', () => {
  it('ORM increment / SQL thô / ghi hệ thống đều +1 đúng một lần; chèn mới giữ 1', async () => {
    const [id] = await seed(1);
    expect((await tk(id!)).version).toBe(1);
    expect((await db.ticket.update({ where: { id: id! }, data: { version: { increment: 1 }, priority: 'high' } })).version).toBe(2);
    await db.$executeRaw`UPDATE ticket SET version = 999, csat = 4 WHERE id = ${id}::uuid`;
    expect((await tk(id!)).version).toBe(3);
    await db.ticket.update({ where: { id: id! }, data: { warnedAt: h.clock.now() } });
    expect((await tk(id!)).version).toBe(4);
  });
});

describe('ticket.bulk_update — kết quả từng id (AC1)', () => {
  it('200 id lẫn thiếu / ẩn / đóng / lệch version / trùng: kết quả riêng, ticket khác vẫn chạy, updated / changed_count trung thực', async () => {
    const open = await seed(192, { assignee: sales.id });
    const [closed] = await seed(1, { status: 'closed', assignee: sales.id });
    const [stale] = await seed(1, { assignee: sales.id });
    const hidden = await seed(2, { assignee: h.user });
    const [same] = await seed(1, { assignee: sales.id });
    await db.ticket.update({ where: { id: same! }, data: { priority: 'high' } });
    const missing = ['0190f000-0000-7000-8000-00000000beef', 'không-phải-uuid'];
    const ids = [...open.slice(0, 4), open[0]!, closed!, stale!, ...hidden, same!, ...missing, ...open.slice(4)];
    expect(ids.length).toBe(200);
    const input = { ticket_ids: ids, priority: 'high', if_versions: { [stale!]: 7 } };
    const { preview, done } = await bulk('ticket.bulk_update', input, sales);
    // Hợp lệ = 192 mở + 1 đã đúng giá trị (no-op vẫn là kết quả ok).
    expect(preview.count).toBe(193);
    expect(preview.changes[1]).toMatchObject({ entity: 'ticket_bulk', after: { not_found: 4, closed: 1, stale: 1, unchanged: 1, duplicates: 1 } });
    expect(done.status, JSON.stringify(done.body).slice(0, 300)).toBe(202);
    expect(done.body.data.status).toBe('job_accepted');
    const job = done.body.data.job_id as string;
    // Nhận ≠ xong: chưa ticket nào đổi trước khi worker chạy.
    expect(await db.ticket.count({ where: { id: { in: open }, priority: 'high' } })).toBe(0);
    expect(await run(job)).toBe('completed');
    const res = (await call(h, `/data-jobs/${job}`, undefined, as(sales)).then(json)).body.data;
    // 199 id sau gộp trùng, trừ 1 id không phải uuid (không vào việc).
    expect(res).toMatchObject({ status: 'completed', total: 198 });
    const rows = await db.dataJobItem.findMany({ where: { jobId: job }, select: { targetId: true, status: true, outcomeCode: true, changed: true, afterVersion: true } });
    const by = new Map(rows.map((r) => [r.targetId, r]));
    expect(by.get(closed!)).toMatchObject({ status: 'failed', outcomeCode: 'INVALID_TRANSITION' });
    expect(by.get(stale!)).toMatchObject({ status: 'failed', outcomeCode: 'STALE_VERSION' });
    for (const x of hidden) expect(by.get(x)).toMatchObject({ status: 'failed', outcomeCode: 'NOT_FOUND' });
    expect(by.get(same!)).toMatchObject({ status: 'done', changed: false, afterVersion: 2 });
    expect(by.get(open[0]!)).toMatchObject({ status: 'done', changed: true, afterVersion: 2 });
    expect(await db.ticket.count({ where: { id: { in: open }, priority: 'high' } })).toBe(192);
    // Ẩn / không thấy: không lộ gì ngoài id người gọi đã gửi; no-op không ghi (version giữ 2), không lịch sử.
    expect((await tk(same!)).version).toBe(2);
    expect(await db.ticketEvent.count({ where: { ticketId: same!, type: 'priority' } })).toBe(0);
    expect((await tk(hidden[0]!)).priority).toBe('medium');
  }, 180_000);

  it('≤ 50 chạy ngay sau commit cha; phản hồi đọc từ biên nhận theo thứ tự nhập; legacy `updated` giữ nghĩa', async () => {
    const ids = await seed(3);
    const [closed] = await seed(1, { status: 'closed' });
    const { done } = await bulk('ticket.bulk_update', { ticket_ids: [ids[2]!, closed!, ids[0]!, ids[1]!, ids[0]!], assignee_user_id: cs.id, priority: 'low' });
    expect(done.status, JSON.stringify(done.body).slice(0, 300)).toBe(200);
    const r = done.body.data.result;
    expect(r).toMatchObject({ updated: 3, changed_count: 3, failed: 1, duplicates: 1, operation: { status: 'completed', total: 4, pending: 0 } });
    expect(r.outcomes.map((o: { id: string }) => o.id)).toEqual([ids[2], closed, ids[0], ids[1]]);
    expect(r.outcomes[1]).toEqual({ id: closed, ok: false, error: { code: 'INVALID_TRANSITION' } });
    for (const id of ids) expect(await tk(id)).toMatchObject({ assigneeUserId: cs.id, priority: 'low', version: 2 });
    // action_log cha ghi đúng một lần; mỗi con một action_log hệ thống (không hoàn tác lẻ được).
    expect(await db.actionLog.count({ where: { id: done.body.data.action_log_id } })).toBe(1);
    expect(await db.actionLog.count({ where: { actionId: 'ticket.bulk_item', result: { path: ['ticket_id'], equals: ids[0] } } })).toBe(1);
  });

  it('patch rỗng / hai ô người phụ trách / if_versions ngoài tập chọn → 422 trước mọi hiệu ứng', async () => {
    const [id] = await seed(1);
    const n = await db.dataJob.count();
    expect((await post('ticket.bulk_update', { input: { ticket_ids: [id] } })).body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { change: 'required' } });
    expect((await post('ticket.bulk_update', { input: { ticket_ids: [id], assignee_user_id: cs.id, assignee_agent_id: uuidv7() } })).body.error.fields).toEqual({ assignee: 'one_only' });
    expect((await post('ticket.bulk_update', { input: { ticket_ids: [id], priority: 'low', if_versions: { [uuidv7()]: 1 } } })).status).toBe(422);
    expect(await db.dataJob.count()).toBe(n);
  });
});

describe('patch kết hợp nguyên tử + quyền hiện tại (AC2 / AC4)', () => {
  it('người nhận bị gỡ sau khi nhận việc → mỗi ticket lỗi riêng, KHÔNG ticket nào nhận ưu tiên lẻ', async () => {
    const tmp = await h.member('cs');
    const ids = await seed(55);
    const { done } = await bulk('ticket.bulk_update', { ticket_ids: ids, assignee_user_id: tmp.id, priority: 'high' });
    expect(done.status).toBe(202);
    await h.platform.membership.updateMany({ where: { workspaceId: h.ws, userId: tmp.id }, data: { status: 'removed' } });
    expect(await run(done.body.data.job_id)).toBe('completed');
    expect(await db.ticket.count({ where: { id: { in: ids }, OR: [{ priority: 'high' }, { assigneeUserId: tmp.id }] } })).toBe(0);
    const items = await db.dataJobItem.findMany({ where: { jobId: done.body.data.job_id }, select: { status: true, outcomeCode: true } });
    expect(items.every((i) => i.status === 'failed' && i.outcomeCode === 'VALIDATION_FAILED')).toBe(true);
  });

  it('người tạo mất quyền giữa chừng → việc dừng forbidden, không ghi dưới quyền cũ', async () => {
    const mgr = await h.member('manager');
    const ids = await seed(52);
    const { done } = await bulk('ticket.bulk_update', { ticket_ids: ids, priority: 'low' }, mgr);
    await h.platform.membership.updateMany({ where: { workspaceId: h.ws, userId: mgr.id }, data: { status: 'removed' } });
    expect(await run(done.body.data.job_id)).toBe('failed');
    expect((await db.dataJob.findUniqueOrThrow({ where: { id: done.body.data.job_id } })).error).toBe('forbidden');
    expect(await db.ticket.count({ where: { id: { in: ids }, priority: 'low' } })).toBe(0);
  });

  it('con riêng: HTTP (ui / assistant / system) bị chặn; ctx hệ thống không capability → 403 trước khi chạy', async () => {
    const [id] = await seed(1);
    const input = { job_id: uuidv7(), seq: 0, ticket_id: id, fence: 1 };
    for (const a of ['ticket.bulk_item', 'ticket.bulk_item_undo']) {
      expect((await post(a, { input })).status).toBe(403);
      expect((await call(h, `/actions/${a}`, { input }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json)).status).toBe(403);
      const ex = h.app.get(ActionExecutor, { strict: false });
      await expect(ex.execute({ workspaceId: h.ws, source: 'system', actor: { type: 'system', id: 'ticket-bulk' }, onBehalfOfUserId: h.user, authz: { isOwner: true } as never }, a, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect((await tk(id!)).version).toBe(1);
  });
});

describe('việc nền 51+ — chạy lại / huỷ (AC3)', () => {
  it('event lặp / chạy lại không ghi lần hai; huỷ giữ phần đã ghi, báo trung thực phần chưa áp', async () => {
    const ids = await seed(51);
    const { done } = await bulk('ticket.bulk_update', { ticket_ids: ids, priority: 'low' });
    expect(done.status).toBe(202);
    const job = done.body.data.job_id as string;
    expect(await run(job)).toBe('completed');
    expect(await run(job)).toBe('skipped');
    expect(await db.ticket.count({ where: { id: { in: ids }, version: 2 } })).toBe(51);
    const c = await seed(55);
    const r2 = await bulk('ticket.bulk_update', { ticket_ids: c, priority: 'high' });
    expect((await post('data_job.cancel', { input: { job_id: r2.done.body.data.job_id } })).body.data.result.status).toBe('cancelling');
    expect(await run(r2.done.body.data.job_id)).toBe('cancelled');
    expect(await db.ticket.count({ where: { id: { in: c }, priority: 'high' } })).toBe(0);
  });
});

describe('hoàn tác (AC5 / AC6)', () => {
  it('/action-logs/:id/undo → 409 UNDO_REQUIRES_ACTION, không ghi, log giữ succeeded', async () => {
    const ids = await seed(2);
    const { done } = await bulk('ticket.bulk_update', { ticket_ids: ids, priority: 'high' });
    const logId = done.body.data.action_log_id as string;
    const r = await call(h, `/action-logs/${logId}/undo`, {}).then(json);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'UNDO_REQUIRES_ACTION', fields: { undo_action: 'ticket.bulk_undo', parent_action_log_id: logId } });
    expect((await db.actionLog.findUniqueOrThrow({ where: { id: logId } })).status).toBe('succeeded');
    expect((await tk(ids[0]!)).priority).toBe('high');
  });

  it('một phần: ticket bị sửa sau đó (kể cả ABA) → CONFLICT giữ nguyên; trường không đổi không bị chạm; log cha giữ succeeded', async () => {
    const ids = await seed(3);
    const { done } = await bulk('ticket.bulk_update', { ticket_ids: ids, priority: 'high' });
    const logId = done.body.data.action_log_id as string;
    // ABA: đổi rồi đổi lại — giá trị giống nhưng version khác → vẫn xung đột.
    await db.ticket.update({ where: { id: ids[1]! }, data: { priority: 'low' } });
    await db.ticket.update({ where: { id: ids[1]! }, data: { priority: 'high' } });
    await db.ticket.update({ where: { id: ids[2]! }, data: { title: 'Sửa tay' } });
    const u = await bulk('ticket.bulk_undo', { parent_action_log_id: logId });
    expect(u.preview).toMatchObject({ count: 1, changes: [{ entity: 'ticket_bulk_undo', after: { revert: 1, conflicts: 2 } }] });
    expect(u.done.status, JSON.stringify(u.done.body).slice(0, 300)).toBe(200);
    expect(u.done.body.data.result).toMatchObject({ undone: 1, conflicts: 2, failed: 2 });
    expect(await tk(ids[0]!)).toMatchObject({ priority: 'medium', version: 3 });
    expect(await tk(ids[1]!)).toMatchObject({ priority: 'high', version: 4 });
    expect(await tk(ids[2]!)).toMatchObject({ priority: 'high', title: 'Sửa tay' });
    expect((await db.actionLog.findUniqueOrThrow({ where: { id: logId } })).status).toBe('succeeded');
    const fwd = await db.dataJobItem.findMany({ where: { job: { actionLogId: logId } }, select: { targetId: true, undoState: true } });
    expect(Object.fromEntries(fwd.map((f) => [f.targetId, f.undoState]))).toEqual({ [ids[0]!]: 'undone', [ids[1]!]: 'conflict', [ids[2]!]: 'conflict' });
    // Đã niêm phong: gửi lại hội tụ cùng lượt, không thử lại thao tác đi được nữa.
    const again = await bulk('ticket.bulk_undo', { parent_action_log_id: logId });
    expect(again.done.body.data.result.operation.job_id).toBe(u.done.body.data.result.operation.job_id);
    const fwdJob = await db.dataJob.findFirstOrThrow({ where: { actionLogId: logId } });
    const retry = await post('data_job.retry', { input: { job_id: fwdJob.id } });
    expect(retry.status).toBe(409);
    expect(retry.body.error.fields).toMatchObject({ undo: 'sealed' });
  });

  it('toàn bộ hoàn tác → log cha undone; thao tác đi còn chạy → 409 OPERATION_BUSY; người khác → 404', async () => {
    const ids = await seed(2);
    const { done } = await bulk('ticket.bulk_update', { ticket_ids: ids, assignee_user_id: cs.id });
    const logId = done.body.data.action_log_id as string;
    expect((await post('ticket.bulk_undo', { input: { parent_action_log_id: logId } }, sales)).status).toBe(404);
    const u = await bulk('ticket.bulk_undo', { parent_action_log_id: logId });
    expect(u.done.body.data.result).toMatchObject({ undone: 2, conflicts: 0 });
    for (const id of ids) expect((await tk(id)).assigneeUserId).toBe(h.user);
    expect((await db.actionLog.findUniqueOrThrow({ where: { id: logId } })).status).toBe('undone');
    const big = await seed(51);
    const r = await bulk('ticket.bulk_update', { ticket_ids: big, priority: 'low' });
    const busy = await post('ticket.bulk_undo', { input: { parent_action_log_id: r.done.body.data.action_log_id } });
    expect(busy.status).toBe(409);
    expect(busy.body.error.code).toBe('OPERATION_BUSY');
  });

  it('hoàn tác đơn lẻ có canh gác: ticket.assign / ticket.update bị sửa sau đó → 409, không ghi đè', async () => {
    const [a, b] = await seed(2);
    const as1 = await post('ticket.assign', { input: { ticket_id: a, assignee_user_id: cs.id } });
    await db.ticket.update({ where: { id: a! }, data: { priority: 'low' } });
    expect((await call(h, `/action-logs/${as1.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(409);
    expect((await tk(a!)).assigneeUserId).toBe(cs.id);
    const up = await post('ticket.update', { input: { ticket_id: b, priority: 'high', title: 'Mới' } });
    expect((await call(h, `/action-logs/${up.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
    expect(await tk(b!)).toMatchObject({ priority: 'medium', title: 'Bulk 1' });
  });
});
