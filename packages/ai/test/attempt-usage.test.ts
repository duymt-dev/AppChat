// TIP-019b §1–2 (engine): mỗi ứng viên là một lời gọi có hook trước / sau; 5xx rõ ràng → `rejected` rồi sang ứng viên kế; lỗi không rõ
// (đứt sau khi phát chữ / timeout không mã) → `unknown`, KHÔNG sang ứng viên kế; SDK không tự gửi lại; request vượt 256 KiB bị từ chối
// trước khi gọi; beforeAttempt ném → không lời gọi nào.
import { describe, expect, it } from 'vitest';
import { AiSdkEngine, classifyAttemptError, mockLanguageModel as mlm, type MockScript, REQUEST_MAX_BYTES, type AttemptInfo, type AttemptOutcome, type RunEvent, type RunRequest } from '../src';

/** Model giả kèm bộ đếm lượt gọi thật (`calls`). */
function mockLanguageModel(script: MockScript) {
  const box = { calls: 0 };
  const m = mlm((ctx) => {
    box.calls++;
    return typeof script === 'function' ? script(ctx) : (script[ctx.call] ?? { text: '' });
  });
  return Object.defineProperty(m, 'calls', { get: () => box.calls }) as typeof m & { readonly calls: number };
}

const req = (p: Partial<RunRequest> = {}): RunRequest => ({ runId: 'r', workspaceId: 'w', system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], tier: 'standard', maxSteps: 4, budget: { maxCredits: 100 }, ...p });

async function run(models: ReturnType<typeof mockLanguageModel>[], r: RunRequest) {
  const engine = new AiSdkEngine({ candidates: async () => models.map((m, i) => ({ provider: 'p', model: `m${i}`, handle: m })) });
  const ev: RunEvent[] = [];
  for await (const e of engine.run(r, new AbortController().signal)) ev.push(e);
  return ev;
}

describe('lời gọi có biên nhận', () => {
  it('5xx → rejected, sang ứng viên kế; usage của ứng viên thành công; mỗi ứng viên gọi đúng một lần', async () => {
    const a = mockLanguageModel([{ error: { statusCode: 503 } }]);
    const b = mockLanguageModel([{ text: 'ok', tokensIn: 10, tokensOut: 2 }]);
    const seen: [AttemptInfo, AttemptOutcome | 'before'][] = [];
    const ev = await run([a, b], req({ hooks: { beforeAttempt: async (i) => void seen.push([i, 'before']), afterAttempt: async (i, o) => (seen.push([i, o]), { credits: o.kind === 'usage' ? 1 : 0 }) } }));
    expect(a.calls).toBe(1);
    expect(b.calls).toBe(1);
    expect(seen.map(([i, o]) => [i.candidate, typeof o === 'string' ? o : o.kind])).toEqual([[0, 'before'], [0, 'rejected'], [1, 'before'], [1, 'usage']]);
    expect(ev.at(-1)).toMatchObject({ type: 'finish', reason: 'stop' });
  });

  it('lỗi không rõ (không mã HTTP) → unknown, không sang ứng viên kế, run lỗi USAGE_UNKNOWN', async () => {
    const a = mockLanguageModel(() => {
      throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
    });
    const b = mockLanguageModel([{ text: 'ok' }]);
    const outs: string[] = [];
    const ev = await run([a, b], req({ hooks: { beforeAttempt: async () => undefined, afterAttempt: async (_i, o) => (outs.push(o.kind), { credits: 0 }) } }));
    expect(outs).toEqual(['unknown']);
    expect(b.calls).toBe(0);
    expect(ev.at(-1)).toMatchObject({ type: 'error', code: 'USAGE_UNKNOWN' });
  });

  it('beforeAttempt ném (hết ví) → không gọi model', async () => {
    const a = mockLanguageModel([{ text: 'x' }]);
    const ev = await run([a], req({ hooks: { beforeAttempt: async () => Promise.reject(Object.assign(new Error('hết'), { code: 'CREDIT_EXHAUSTED' })) } }));
    expect(a.calls).toBe(0);
    expect(ev.at(-1)).toMatchObject({ type: 'error', code: 'CREDIT_EXHAUSTED' });
  });

  it('request vượt 256 KiB → REQUEST_TOO_LARGE trước khi gọi', async () => {
    const a = mockLanguageModel([{ text: 'x' }]);
    const ev = await run([a], req({ system: 'x'.repeat(REQUEST_MAX_BYTES + 10) }));
    expect(a.calls).toBe(0);
    expect(ev.at(-1)).toMatchObject({ type: 'error', code: 'REQUEST_TOO_LARGE' });
  });

  it('phân loại lỗi: HTTP 429 / 503 fallback, 400 không; đã phát chữ / huỷ = unknown', () => {
    expect(classifyAttemptError({ statusCode: 429 }, false, false)).toMatchObject({ kind: 'rejected', fallback: true });
    expect(classifyAttemptError({ statusCode: 400 }, false, false)).toMatchObject({ kind: 'rejected', fallback: false });
    expect(classifyAttemptError({ code: 'ECONNREFUSED' }, false, false)).toMatchObject({ kind: 'rejected', fallback: true });
    expect(classifyAttemptError({ name: 'TimeoutError' }, false, false)).toMatchObject({ kind: 'unknown', fallback: false });
    expect(classifyAttemptError({ statusCode: 503 }, true, false).kind).toBe('unknown');
    expect(classifyAttemptError({ statusCode: 503 }, false, true).kind).toBe('unknown');
  });
});
