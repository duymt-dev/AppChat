// TIP-019b §1.1, §1.5 (engine): usage thật vượt phần ngân sách còn lại vẫn ghi (rào mềm), sau đó KHÔNG chạy tool nào model vừa yêu
// cầu và không gọi model nữa (finish budget); beforeTool ném → tool chưa chạy bị bỏ, run lỗi; trần chữ ra mặc định 2048.
import { describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel as mlm, outputTokens, type MockScript, OUTPUT_TOKENS_MAX, type RunEvent, type RunRequest, type ToolSpec } from '../src';

/** Model giả kèm bộ đếm lượt gọi thật (`calls`). */
function mockLanguageModel(script: MockScript) {
  const box = { calls: 0 };
  const m = mlm((ctx) => {
    box.calls++;
    return typeof script === 'function' ? script(ctx) : (script[ctx.call] ?? { text: '' });
  });
  return Object.defineProperty(m, 'calls', { get: () => box.calls }) as typeof m & { readonly calls: number };
}

const tool = (calls: unknown[]): ToolSpec => ({ name: 't', description: 't', inputSchema: { type: 'object', properties: {} }, origin: 'action', execute: async (i) => (calls.push(i), { kind: 'ok', output: {} }) });
const req = (tools: ToolSpec[], p: Partial<RunRequest>): RunRequest => ({ runId: 'r', workspaceId: 'w', system: 's', messages: [{ role: 'user', content: 'hi' }], tools, tier: 'standard', maxSteps: 4, budget: { maxCredits: 5 }, ...p });

async function run(m: ReturnType<typeof mockLanguageModel>, r: RunRequest) {
  const ev: RunEvent[] = [];
  for await (const e of new AiSdkEngine({ candidates: async () => [{ provider: 'p', model: 'm', handle: m }] }).run(r, new AbortController().signal)) ev.push(e);
  return ev;
}

describe('cổng tool sau ngân sách', () => {
  it('usage vượt ngân sách: ghi credit, bỏ tool đã yêu cầu, dừng budget', async () => {
    const calls: unknown[] = [];
    const m = mockLanguageModel([{ tool: 't', input: { a: 1 } }, { text: 'không được tới' }]);
    const ev = await run(m, req([tool(calls)], { hooks: { beforeAttempt: async () => undefined, afterAttempt: async () => ({ credits: 9 }) } }));
    expect(ev.find((e) => e.type === 'usage')).toMatchObject({ credits: 9 });
    expect(calls).toEqual([]);
    expect(m.calls).toBe(1);
    expect(ev.at(-1)).toMatchObject({ type: 'finish', reason: 'budget' });
  });

  it('beforeTool ném → tool không chạy, run lỗi đúng mã', async () => {
    const calls: unknown[] = [];
    const m = mockLanguageModel([{ tool: 't', input: {} }, { text: 'x' }]);
    const ev = await run(m, req([tool(calls)], { budget: { maxCredits: 100 }, hooks: { beforeTool: async () => Promise.reject(Object.assign(new Error('huỷ'), { code: 'CANCELLED' })) } }));
    expect(calls).toEqual([]);
    expect(ev.at(-1)).toMatchObject({ type: 'error', code: 'CANCELLED' });
  });

  it('trần chữ ra: mặc định 2048, tối đa 8192', () => {
    expect(outputTokens()).toBe(2048);
    expect(outputTokens(100_000)).toBe(OUTPUT_TOKENS_MAX);
  });
});
