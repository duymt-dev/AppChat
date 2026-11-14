// TIP-003b §2: collector gắn đúng transaction, gom nhiều lô, flush MỘT lần cuối, v1 ghi như cũ, v2 cấp seq liên tục theo aggregate
// (thứ tự gọi trong cùng aggregate giữ nguyên), lỗi schema rollback trước khi khoá seq, workspace khác / sau đóng / quá trần → lỗi.
import { describe, expect, it } from 'vitest';
import { EventProtocolError } from '@appchat/shared';
import { collectorOf, enrollEventTransaction, writeOutbox } from '../src/kernel';

const ws = '0190f2a0-0000-7000-8000-000000000001';
const A = '0190f2a0-0000-7000-8000-0000000000a1';
const B = '0190f2a0-0000-7000-8000-0000000000b1';
const now = new Date('2026-11-11T00:00:00Z');

type Row = Record<string, unknown>;
function fakeTx(phase: 'v1' | 'v2' | 'fenced' = 'v2') {
  const counters = new Map<string, bigint>();
  const sql: string[] = [];
  const outbox: Row[] = [];
  const dispatch: Row[] = [];
  const tx = {
    sql,
    outbox,
    dispatch,
    outboxEvent: { createMany: async ({ data }: { data: Row[] }) => (outbox.push(...data), { count: data.length }) },
    eventDispatch: { createMany: async ({ data }: { data: Row[] }) => (dispatch.push(...data), { count: data.length }) },
    $queryRaw: async (strings: TemplateStringsArray, ...vals: unknown[]) => {
      const q = strings.join('?');
      sql.push(q.includes('event_protocol_state') ? 'state' : q.includes('event_aggregate_counter') ? 'counter' : 'other');
      if (q.includes('event_protocol_state')) return [{ phase, registry_version: phase === 'v2' ? 1 : null }];
      const [kinds, ids, ns] = vals as [string[], string[], number[]];
      return kinds.map((k, i) => {
        const key = `${k}|${ids[i]}`;
        const next = (counters.get(key) ?? 1n) + BigInt(ns[i]!);
        counters.set(key, next);
        return { kind: k, id: ids[i], next_seq: next };
      });
    },
  };
  return tx;
}
const tag = (id: string) => ({ topic: 'tag.created', payload: { id } });
const contact = (id: string) => ({ topic: 'contact.memory_changed', payload: { contact_id: id, memory_rev: 1 } });

describe('EventCollector', () => {
  it('nhiều lô trong một transaction → gom, flush MỘT lần; seq liên tục theo aggregate, giữ thứ tự gọi', async () => {
    const tx = fakeTx('v2');
    const e = enrollEventTransaction(tx as never, ws);
    expect(await writeOutbox(tx as never, ws, [tag(A), contact(B)], now)).toBe(2);
    expect(await writeOutbox(tx as never, ws, [tag(A)], now)).toBe(1);
    expect(tx.outbox).toHaveLength(0);
    expect(tx.sql).toEqual([]);
    expect(await e.finish()).toBe(3);
    expect(tx.sql).toEqual(['state', 'counter']);
    const seqOf = (topic: string) => tx.outbox.filter((r) => r.topic === topic).map((r) => r.aggregateSeq);
    expect(seqOf('tag.created')).toEqual([1n, 2n]);
    expect(seqOf('contact.memory_changed')).toEqual([1n]);
    expect(tx.dispatch.map((d) => d.eventId)).toEqual(tx.outbox.map((r) => r.id));
    expect(collectorOf(tx)).toBeUndefined();
  });

  it('transaction kế tiếp tiếp nối seq (không bắt đầu lại)', async () => {
    const tx = fakeTx('v2');
    for (let i = 0; i < 2; i++) {
      const e = enrollEventTransaction(tx as never, ws);
      await writeOutbox(tx as never, ws, [tag(A)], now);
      await e.finish();
    }
    expect(tx.outbox.map((r) => r.aggregateSeq)).toEqual([1n, 2n]);
  });

  it('v1: ghi như cũ, không cấp seq / dispatch', async () => {
    const tx = fakeTx('v1');
    const e = enrollEventTransaction(tx as never, ws);
    await writeOutbox(tx as never, ws, [tag(A)], now);
    await e.finish();
    expect(tx.outbox[0]).not.toHaveProperty('aggregateSeq');
    expect(tx.dispatch).toHaveLength(0);
    expect(tx.sql).toEqual(['state']);
  });

  it('payload sai schema → lỗi trước khi khoá seq; không ghi gì', async () => {
    const tx = fakeTx('v2');
    const e = enrollEventTransaction(tx as never, ws);
    await writeOutbox(tx as never, ws, [{ topic: 'tag.created', payload: { id: 'không-phải-uuid' } }], now);
    await expect(e.finish()).rejects.toMatchObject({ code: 'EVENT_PAYLOAD_INVALID' });
    expect(tx.sql).toEqual(['state']);
    expect(tx.outbox).toHaveLength(0);
  });

  it('rào cutover (fenced) → producer lỗi, không ghi', async () => {
    const tx = fakeTx('fenced');
    const e = enrollEventTransaction(tx as never, ws);
    await writeOutbox(tx as never, ws, [tag(A)], now);
    await expect(e.finish()).rejects.toMatchObject({ code: 'EVENT_PROTOCOL_FENCED' });
  });

  it('helper lồng dùng chung collector; workspace khác / sau đóng / quá 1000 → lỗi', async () => {
    const tx = fakeTx('v2');
    const outer = enrollEventTransaction(tx as never, ws);
    const inner = enrollEventTransaction(tx as never, ws);
    expect(inner.collector).toBe(outer.collector);
    expect(await inner.finish()).toBe(0);
    await expect(writeOutbox(tx as never, A, [tag(A)], now)).rejects.toBeInstanceOf(EventProtocolError);
    await expect(writeOutbox(tx as never, ws, Array.from({ length: 1001 }, () => tag(A)), now)).rejects.toMatchObject({ code: 'EVENT_BATCH_TOO_LARGE' });
    await outer.finish();
    expect(() => outer.collector.stage(ws, [])).toThrow(/EVENT_TRANSACTION_CLOSED/);
  });

  it('abort bỏ toàn bộ event đã gom', async () => {
    const tx = fakeTx('v2');
    const e = enrollEventTransaction(tx as never, ws);
    await writeOutbox(tx as never, ws, [tag(A)], now);
    e.abort();
    expect(e.collector.size).toBe(0);
    expect(collectorOf(tx)).toBeUndefined();
  });

  it('ngoài transaction đã đăng ký: v1 ghi thẳng; v2 → EVENT_TRANSACTION_REQUIRED', async () => {
    const v1 = fakeTx('v1');
    expect(await writeOutbox(v1 as never, ws, [tag(A)], now)).toBe(1);
    expect(v1.outbox).toHaveLength(1);
    await expect(writeOutbox(fakeTx('v2') as never, ws, [tag(A)], now)).rejects.toMatchObject({ code: 'EVENT_TRANSACTION_REQUIRED' });
  });
});
