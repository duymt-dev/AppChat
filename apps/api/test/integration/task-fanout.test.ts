// TIP-006b AC6 / AC7 trên Postgres thật (không model): (AC6) 257 tác vụ nghe một sự kiện → fanout niêm phong một lần; "crash" giữa trang
// (chỉ xử lý 100 mục) → phát lại xử lý nốt, mỗi tác vụ đúng một occurrence / run; tác vụ tạo SAU lúc chọn không vào, tác vụ tắt sau lúc
// chọn → no_effect; hai dispatcher đua → không run thứ hai. Run_now đua với sự kiện → một bên thắng (409 / busy). (AC7) Lịch: occurrence +
// run + ý định + dời next_run_at trong MỘT transaction — lỗi giữa chừng rollback cả; sửa lịch (thế hệ mới) → ứng viên cũ không áp.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admitEventItem, admitScheduled, drainTaskFanout, pendingPage, sealTaskFanout, sweepDueTasks, uuidv7, type TaskJob } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let agentId: string;
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(h.ws, 't'));
const jobs: TaskJob[] = [];
const queue = { push: async (j: TaskJob) => void jobs.push(j) };
const now = () => h.clock.now();

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  agentId = uuidv7();
  await (await db()).aiAgent.create({ data: { id: agentId, name: 'Agent Fanout' } });
  await h.platform.workspace.update({ where: { id: h.ws }, data: { timezone: 'UTC' } });
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

async function tasks(n: number, topic: string, createdAt = new Date(now().getTime() - 60_000)) {
  const d = await db();
  const owner = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).ownerUserId;
  const ids = Array.from({ length: n }, () => uuidv7());
  await d.aiTask.createMany({ data: ids.map((id) => ({ id, name: 'T', goal: 'g', trigger: 'event' as const, eventType: topic, agentId, createdByUserId: owner, createdAt })) });
  return ids;
}
const event = (topic: string) => ({ id: uuidv7(), topic, workspaceId: h.ws, payload: { occurred_at: now().toISOString() }, traceId: null });

describe('fanout sự kiện → tác vụ (AC6)', () => {
  it('257 tác vụ; crash giữa trang; tác vụ mới / tắt sau lúc chọn; hai dispatcher → mỗi tác vụ một occurrence, không run thứ hai', async () => {
    const d = await db();
    const ids = await tasks(257, 'order.completed');
    const e = event('order.completed');
    await d.outboxEvent.create({ data: { id: e.id, topic: e.topic, payload: e.payload } });
    const fid = await d.$transaction((tx) => sealTaskFanout(tx, e, now()));
    // Sau lúc chọn: thêm tác vụ mới (không được vào) + tắt một tác vụ đã chọn (→ no_effect disabled).
    await tasks(3, 'order.completed', new Date(now().getTime() - 30_000));
    await d.aiTask.update({ where: { id: ids[200]! }, data: { status: 'paused' } });
    // "Crash" sau trang đầu: chỉ xử lý 100 mục bằng đúng hàm nhận mục, rồi bỏ dở.
    for (const it of await pendingPage(d, fid, null)) await admitEventItem(d, fid, it, e, now);
    expect(await d.taskOccurrence.count({ where: { eventId: e.id } })).toBe(100);
    // Phát lại (event giao lại) + quét khôi phục đua nhau → xử lý nốt, không chọn lại.
    const again = await d.$transaction((tx) => sealTaskFanout(tx, e, now()));
    expect(again).toBe(fid);
    const [a, b] = await Promise.all([drainTaskFanout(d, queue, h.ws, fid, e, now), drainTaskFanout(await db(), queue, h.ws, fid, e, now)]);
    expect(a.queued + b.queued + a.skipped_disabled + b.skipped_disabled).toBe(157);
    expect(await d.taskOccurrence.count({ where: { eventId: e.id } })).toBe(257);
    expect(await d.aiRun.count({ where: { taskId: { in: ids } } })).toBe(256);
    expect((await d.taskOccurrence.findFirstOrThrow({ where: { taskId: ids[200]!, eventId: e.id } })).noEffectReason).toBe('disabled');
    const [f] = await d.$queryRaw<{ selected: number; processed: number }[]>`SELECT selected_count AS selected, processed_count AS processed FROM event_fanout WHERE id = ${fid}::uuid`;
    expect(f).toEqual({ selected: 257, processed: 257 });
    // Mọi run có đúng một ý định; job chỉ mang id sự kiện + topic.
    expect(await d.taskDispatchIntent.count({ where: { taskId: { in: ids } } })).toBe(256);
    expect(jobs.every((j) => j.event?.source_event_id === e.id && !('payload' in (j.event ?? {})))).toBe(true);
  });

  it('run_now đua với sự kiện cùng tác vụ → đúng một run; người thua 409 (tay) hoặc busy (tự động)', async () => {
    const d = await db();
    const [id] = await tasks(1, 'ticket.created');
    const e = event('ticket.created');
    await d.outboxEvent.create({ data: { id: e.id, topic: e.topic, payload: e.payload } });
    const fid = await d.$transaction((tx) => sealTaskFanout(tx, e, now()));
    const [manual, auto] = await Promise.all([
      call(h, '/actions/ai_task.run_now', { input: { task_id: id } }, { 'idempotency-key': uuidv7() }),
      drainTaskFanout(await db(), queue, h.ws, fid, e, now),
    ]);
    expect(await d.aiRun.count({ where: { taskId: id } })).toBe(1);
    expect(manual.status === 409 ? auto.queued : auto.skipped_busy).toBe(1);
    // Đang có lượt chờ duyệt (trạng thái sống của 019b) → run_now 409.
    await d.aiRun.updateMany({ where: { taskId: id }, data: { status: 'waiting_approval' } });
    expect((await call(h, '/actions/ai_task.run_now', { input: { task_id: id } }, { 'idempotency-key': uuidv7() })).status).toBe(409);
  });
});

describe('lịch (AC7)', () => {
  it('occurrence + run + ý định + dời mốc một transaction; quét lại không chạy lần hai; busy vẫn dời mốc', async () => {
    const d = await db();
    const owner = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).ownerUserId;
    const id = uuidv7();
    const due = new Date(now().getTime() - 1000);
    await d.aiTask.create({ data: { id, name: 'Lịch', goal: 'g', trigger: 'schedule', cron: '0 9 * * *', agentId, createdByUserId: owner, nextRunAt: due } });
    jobs.length = 0;
    expect(await sweepDueTasks(d, queue, h.ws, 'UTC', now)).toBe(1);
    expect(await sweepDueTasks(d, queue, h.ws, 'UTC', now)).toBe(0);
    const occ = await d.taskOccurrence.findFirstOrThrow({ where: { taskId: id } });
    expect([occ.kind, occ.phase, occ.dueAt?.toISOString()]).toEqual(['schedule', 'handed_off', due.toISOString()]);
    expect((await d.taskDispatchIntent.findUniqueOrThrow({ where: { runId: occ.runId! } })).phase).toBe('dispatched');
    expect(jobs).toEqual([{ ws: h.ws, task_id: id, run_id: occ.runId }]);
    const t = await d.aiTask.findUniqueOrThrow({ where: { id } });
    expect(t.nextRunAt!.getTime()).toBeGreaterThan(now().getTime());
    // Tới giờ lần sau (mốc khác) nhưng lượt trước còn sống → busy, mốc vẫn dời (không dồn lượt).
    await d.aiTask.update({ where: { id }, data: { nextRunAt: new Date(due.getTime() - 3_600_000) } });
    expect(await sweepDueTasks(d, queue, h.ws, 'UTC', now)).toBe(0);
    expect(await d.taskOccurrence.count({ where: { taskId: id, phase: 'no_effect', noEffectReason: 'busy' } })).toBe(1);
    expect(await d.aiRun.count({ where: { taskId: id } })).toBe(1);
  });

  it('lỗi sau khi nhận trong transaction → rollback cả; thế hệ / mốc cũ không áp; hai lượt quét đua → một run', async () => {
    const d = await db();
    const owner = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).ownerUserId;
    const id = uuidv7();
    const due = new Date(now().getTime() - 1000);
    await d.aiTask.create({ data: { id, name: 'Lịch 2', goal: 'g', trigger: 'schedule', cron: '0 9 * * *', agentId, createdByUserId: owner, nextRunAt: due } });
    const cand = { id, nextRunAt: due, triggerGeneration: 1 };
    await expect(d.$transaction(async (tx) => { await admitScheduled(tx, cand, now(), 'UTC', now); throw new Error('crash'); })).rejects.toThrow('crash');
    expect([await d.taskOccurrence.count({ where: { taskId: id } }), await d.aiRun.count({ where: { taskId: id } })]).toEqual([0, 0]);
    expect((await d.aiTask.findUniqueOrThrow({ where: { id } })).nextRunAt?.toISOString()).toBe(due.toISOString());
    // Sửa lịch sau khi quét (thế hệ mới) → ứng viên cũ không áp.
    await d.aiTask.update({ where: { id }, data: { triggerGeneration: 2 } });
    expect(await d.$transaction((tx) => admitScheduled(tx, cand, now(), 'UTC', now))).toBeNull();
    // Hai lượt quét đồng thời → đúng một run.
    const rs = await Promise.all([sweepDueTasks(d, null, h.ws, 'UTC', now), sweepDueTasks(await db(), null, h.ws, 'UTC', now)]);
    expect(rs[0] + rs[1]).toBe(1);
    expect(await d.aiRun.count({ where: { taskId: id } })).toBe(1);
    expect((await d.taskOccurrence.findFirstOrThrow({ where: { taskId: id } })).triggerGeneration).toBe(2);
  });
});
