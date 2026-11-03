// TIP-023c 6a (đóng DV-006): delta đi tới consumer TRƯỚC khi bước model hoàn tất — provider giả dừng ở barrier sau mảnh chữ đầu; engine
// phải phát delta đó trong lúc barrier còn đóng (không gom cả bước rồi mới phát). Đã phát chữ thì không fallback sang provider khác.
import { describe, expect, it } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { AiSdkEngine, staticModelSource, type RunEvent, type RunRequest } from '../src';
import { liveStep } from '../src/gateway/delta-stream';

const req: RunRequest = { runId: 'r', workspaceId: 'ws', system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], tier: 'standard', maxSteps: 4, budget: { maxCredits: 100 } };
const usage = { inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 3, text: 3, reasoning: 0 } };

/** Model trả mảnh 1 → chờ barrier → mảnh 2 + finish. */
function gated(barrier: Promise<void>, failAfterFirst = false) {
  return new MockLanguageModelV4({
    provider: 'p1',
    modelId: 'm1',
    doStream: async () => ({
      stream: new ReadableStream({
        async start(c) {
          c.enqueue({ type: 'text-start', id: 't' });
          c.enqueue({ type: 'text-delta', id: 't', delta: 'Xin ' });
          await barrier;
          if (failAfterFirst) {
            c.error(Object.assign(new Error('HTTP 503'), { statusCode: 503, isRetryable: true }));
            return;
          }
          c.enqueue({ type: 'text-delta', id: 't', delta: 'chào' });
          c.enqueue({ type: 'text-end', id: 't' });
          c.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage });
          c.close();
        },
      }),
    }),
  });
}

describe('delta trực tiếp', () => {
  it('delta đầu tới trước khi model xong (barrier còn đóng)', async () => {
    let open!: () => void;
    const barrier = new Promise<void>((r) => (open = r));
    const engine = new AiSdkEngine(staticModelSource([{ provider: 'p1', model: 'm1', handle: gated(barrier) }]));
    const it = engine.run(req, new AbortController().signal)[Symbol.asyncIterator]();
    const first = await it.next();
    expect(first.value).toMatchObject({ type: 'delta', text: 'Xin ' });
    open();
    const rest: RunEvent[] = [];
    for (let n = await it.next(); !n.done; n = await it.next()) rest.push(n.value);
    expect(rest.filter((e) => e.type === 'delta').map((e) => (e as { text: string }).text)).toEqual(['chào']);
    expect(rest.at(-1)).toMatchObject({ type: 'finish', text: 'Xin chào' });
  });

  it('đã phát chữ rồi provider lỗi → không fallback ứng viên 2 (không trộn hai câu), run lỗi rõ', async () => {
    let open!: () => void;
    const barrier = new Promise<void>((r) => (open = r));
    let secondCalled = 0;
    const second = new MockLanguageModelV4({ provider: 'p2', modelId: 'm2', doStream: async () => (secondCalled++, { stream: new ReadableStream({ start: (c) => c.close() }) }) });
    const engine = new AiSdkEngine(staticModelSource([{ provider: 'p1', model: 'm1', handle: gated(barrier, true) }, { provider: 'p2', model: 'm2', handle: second }]));
    const events: RunEvent[] = [];
    const run = (async () => {
      for await (const e of engine.run(req, new AbortController().signal)) events.push(e);
    })();
    await new Promise((r) => setTimeout(r, 20));
    expect(events.map((e) => e.type)).toEqual(['delta']);
    open();
    await run;
    expect(secondCalled).toBe(0);
    expect(events.at(-1)).toMatchObject({ type: 'error' });
  });
});

describe('liveStep', () => {
  it('phát từng phần tử khi tới, trả kết quả cuối; lỗi ném khi lấy tiếp', async () => {
    const g = liveStep<number, string>(async (emit) => {
      emit(1);
      await new Promise((r) => setTimeout(r, 5));
      emit(2);
      return 'ok';
    });
    const seen: number[] = [];
    let n = await g.next();
    for (; !n.done; n = await g.next()) seen.push(n.value);
    expect([seen, n.value]).toEqual([[1, 2], 'ok']);
    const bad = liveStep<number, string>(async () => {
      throw new Error('x');
    });
    await expect(bad.next()).rejects.toThrow('x');
  });
});
