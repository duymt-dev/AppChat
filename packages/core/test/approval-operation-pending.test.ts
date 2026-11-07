// TIP-045b annex A1 — duyệt AI cho thao tác nền tảng: tenant chưa áp → run giữ waiting_approval; khôi phục áp xong phát
// `operation.completed` → consumer AI đẩy lại đúng job `ai-resume` của duyệt (khoá theo thao tác — event lặp không thành job thứ hai,
// event không gắn duyệt thì bỏ qua). Installer chỉ đăng ký một consumer mỗi tiến trình.
import { afterEach, describe, expect, it } from 'vitest';
import { eventConsumers, unregisterEventConsumer, type DomainEvent } from '../src/kernel/events/consumer';
import { OPERATION_CONTINUATION_CONSUMER, OperationContinuationInstaller, operationContinuationConsumer } from '../src/ai/approvals/operation-continuation';
import type { ResumeQueue } from '../src/ai/approvals/resume.queue';

const ev = (payload: Record<string, unknown>): DomainEvent => ({ id: 'e1', topic: 'operation.completed', workspaceId: 'ws1', payload, traceId: null });

function queue() {
  const jobs = new Map<string, { ws: string; approval: string }>();
  return {
    jobs,
    // Như BullMQ: jobId cố định → đẩy lại cùng khoá không thêm job.
    async push(ws: string, approval: string, key?: string) {
      const id = key ? `ap-${approval}-${key}` : `ap-${approval}`;
      if (!jobs.has(id)) jobs.set(id, { ws, approval });
    },
  };
}

afterEach(() => void unregisterEventConsumer(OPERATION_CONTINUATION_CONSUMER));

describe('operation.completed → tiếp tục run đã duyệt', () => {
  it('đẩy job ai-resume của duyệt theo khoá thao tác; event lặp không thêm job', async () => {
    const q = queue();
    const c = operationContinuationConsumer(q);
    expect(c.topics).toEqual(['operation.completed']);
    const e = ev({ operation_id: 'op1', action_id: 'member.set_role', approval_id: 'ap1', run_id: 'r1' });
    await c.handle(e, {} as never);
    await c.handle(e, {} as never);
    expect([...q.jobs.entries()]).toEqual([['ap-ap1-op-op1', { ws: 'ws1', approval: 'ap1' }]]);
  });

  it('thao tác không gắn duyệt (người bấm trực tiếp) → không đụng hàng chờ AI', async () => {
    const q = queue();
    const c = operationContinuationConsumer(q);
    await c.handle(ev({ operation_id: 'op2', action_id: 'member.invite' }), {} as never);
    await c.handle(ev({ operation_id: 'op3', approval_id: '' }), {} as never);
    expect(q.jobs.size).toBe(0);
  });

  it('installer: đăng ký một lần mỗi tiến trình, không có queue (api) thì không đăng ký, shutdown gỡ đúng consumer', () => {
    const q = queue() as unknown as ResumeQueue;
    new OperationContinuationInstaller(null).onApplicationBootstrap();
    expect(eventConsumers().some((x) => x.name === OPERATION_CONTINUATION_CONSUMER)).toBe(false);
    const a = new OperationContinuationInstaller(q);
    const b = new OperationContinuationInstaller(q);
    a.onApplicationBootstrap();
    b.onApplicationBootstrap();
    expect(eventConsumers().filter((x) => x.name === OPERATION_CONTINUATION_CONSUMER)).toHaveLength(1);
    b.onApplicationShutdown();
    expect(eventConsumers().some((x) => x.name === OPERATION_CONTINUATION_CONSUMER)).toBe(true);
    a.onApplicationShutdown();
    expect(eventConsumers().some((x) => x.name === OPERATION_CONTINUATION_CONSUMER)).toBe(false);
  });
});
