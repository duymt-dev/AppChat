// TIP-023c SPEC vận hành + "Fenced recovery" (unit, DB giả trong bộ nhớ): claim (user, request_id) idempotent / 409 khi khác input; lease
// có fence — worker cũ không gia hạn / chuyển trạng thái được; huỷ là cuối; cursor SSE ký theo run + người xem; RunStream gộp delta và
// giữ thứ tự ghi; sự kiện ghi trước khi phát.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { CursorSigner } from '../src/ai/assistant/genui/event-store';
import { RequestStore, requestHash } from '../src/ai/assistant/genui/request-store';
import { RunStream } from '../src/ai/assistant/genui/stream';

type Row = Record<string, unknown> & { runId: string; userId: string; requestId: string; fence: number; executionState: string; leaseOwner: string | null; leaseUntil: Date | null; checkpointVersion: number };

function memLedger() {
  const rows: Row[] = [];
  const match = (r: Row, w: Record<string, unknown>): boolean =>
    Object.entries(w).every(([k, v]) => {
      if (k === 'OR') return (v as Record<string, unknown>[]).some((x) => match(r, x));
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        const o = v as { notIn?: unknown[]; lt?: Date };
        if (o.notIn) return !o.notIn.includes(r[k]);
        if (o.lt) return (r[k] as Date | null) !== null && (r[k] as Date) < o.lt;
      }
      return r[k] === v;
    });
  const apply = (r: Row, d: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(d)) r[k] = v && typeof v === 'object' && 'increment' in (v as object) ? (r[k] as number) + (v as { increment: number }).increment : v;
  };
  const db = {
    assistantRequest: {
      // Như Prisma: trả bản sao (không phải object đang lưu).
      findUnique: async ({ where }: { where: { userId_requestId?: { userId: string; requestId: string }; runId?: string } }) => {
        const r = rows.find((x) => (where.runId ? x.runId === where.runId : x.userId === where.userId_requestId!.userId && x.requestId === where.userId_requestId!.requestId));
        return r ? { ...r } : null;
      },
      create: async ({ data }: { data: Partial<Row> & Pick<Row, "runId" | "userId" | "requestId"> }) => {
        if (rows.some((r) => r.userId === data.userId && r.requestId === data.requestId)) throw new Error('unique');
        const row: Row = { fence: 0, executionState: 'queued', leaseOwner: null, leaseUntil: null, checkpointVersion: 0, ...data };
        rows.push(row);
        return row;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const hit = rows.filter((r) => match(r, where));
        hit.forEach((r) => apply(r, data));
        return { count: hit.length };
      },
    },
  };
  return { db: db as never, rows };
}

describe('RequestStore', () => {
  it('claim idempotent: cùng hash → replay cùng run; khác hash → 409', async () => {
    const { db } = memLedger();
    const s = new RequestStore(db, () => new Date(1000));
    const h = requestHash('s1', { text: 'hi' });
    expect((await s.claim({ userId: 'u', requestId: 'req-0001', sessionId: 's1', runId: 'r1', inputHash: h })).kind).toBe('created');
    const again = await s.claim({ userId: 'u', requestId: 'req-0001', sessionId: 's1', runId: 'r2', inputHash: h });
    expect([again.kind, again.row.runId]).toEqual(['replay', 'r1']);
    await expect(s.claim({ userId: 'u', requestId: 'req-0001', sessionId: 's1', runId: 'r3', inputHash: requestHash('s2', { text: 'hi' }) })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('lease có fence: worker cũ hết hạn bị thay; cũ không gia hạn / chuyển trạng thái được', async () => {
    const { db } = memLedger();
    let now = 1000;
    const s = new RequestStore(db, () => new Date(now));
    await s.claim({ userId: 'u', requestId: 'req-0002', sessionId: 's', runId: 'r', inputHash: 'h' });
    const a = await s.acquire('r', 'worker-a');
    expect(a?.fence).toBe(1);
    expect(await s.acquire('r', 'worker-b')).toBeNull();
    now += 120_000;
    const b = await s.acquire('r', 'worker-b');
    expect(b?.fence).toBe(2);
    expect(await s.renew(a!)).toBe(false);
    expect(await s.holds(a!)).toBe(false);
    expect(await s.transition(a!, 'succeeded')).toBe(false);
    expect(await s.transition(b!, 'waiting_external', { node: '0', attempt: 'x' })).toBe(true);
  });

  it('huỷ là cuối: không nhận lease, không chuyển trạng thái lại', async () => {
    const { db } = memLedger();
    const s = new RequestStore(db, () => new Date(1000));
    await s.claim({ userId: 'u', requestId: 'req-0003', sessionId: 's', runId: 'r', inputHash: 'h' });
    const l = await s.acquire('r', 'w');
    await s.cancel('r');
    expect(await s.transition(l!, 'running')).toBe(false);
    expect(await s.acquire('r', 'w2')).toBeNull();
  });
});

describe('CursorSigner', () => {
  it('cursor gắn run + người xem; sửa / dùng chéo → 403', () => {
    const c = new CursorSigner('k');
    const cur = c.sign('run-1', 'u1', 7);
    expect(c.verify('run-1', 'u1', cur)).toBe(7);
    expect(() => c.verify('run-1', 'u2', cur)).toThrow();
    expect(() => c.verify('run-2', 'u1', cur)).toThrow();
    expect(() => c.verify('run-1', 'u1', cur.replace(/^7/, '8'))).toThrow();
    expect(() => c.verify('run-1', 'u1', '7')).toThrow();
  });
});

describe('RunStream', () => {
  it('gộp delta, ghi trước rồi mới phát, giữ thứ tự với sự kiện rời rạc', async () => {
    const log: string[] = [];
    let seq = 0;
    const store = { append: async (_r: string, e: { type: string }) => (log.push(`append:${e.type}`), ++seq) } as never;
    const pub = { publish: async (_c: string, m: string) => (log.push(`pub:${(JSON.parse(m) as { event: { type: string; text?: string } }).event.type}`), 1) };
    const s = new RunStream('r', store, pub);
    s.delta('Xin ');
    s.delta('chào');
    await s.emit({ type: 'done', status: 'completed', session_id: 's' });
    await s.close();
    expect(log).toEqual(['append:delta', 'pub:delta', 'append:done', 'pub:done']);
  });
});
