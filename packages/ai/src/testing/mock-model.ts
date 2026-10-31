// Model giả theo kịch bản (Q-001: chưa có key 9router) — test / dev / E2E chạy engine thật trên AI SDK với `MockLanguageModelV4`.
// Mỗi lượt gọi model lấy bước kế tiếp của kịch bản: chữ trả lời hoặc lời gọi tool; token giả theo độ dài để trừ credit thật.
// `AI_ENGINE=mock` (cấm production) cài `mockModelSource` làm nguồn model cho mọi mức AI.
import { MockLanguageModelV4, convertArrayToReadableStream } from 'ai/test';
import type { ModelCandidate, ModelSource } from '../gateway/types';

export type MockTurn =
  | { text: string; tokensIn?: number; tokensOut?: number }
  | { tool: string; input: unknown; tokensIn?: number; tokensOut?: number }
  | { tools: { tool: string; input: unknown }[]; tokensIn?: number; tokensOut?: number }
  | { error: { statusCode: number; message?: string } };

/** Kịch bản theo lượt: mảng cố định, hoặc hàm nhận lời nhắn cuối của người dùng (dev / E2E — trả lời theo câu hỏi). */
export type MockScript = MockTurn[] | ((ctx: { lastUser: string; call: number }) => MockTurn);

export const MOCK_PROVIDER = 'mock';
export const MOCK_MODEL = 'mock-chat';

const usage = (i: number, o: number) => ({
  inputTokens: { total: i, noCache: i, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: o, text: o, reasoning: 0 },
});

function lastUserText(prompt: unknown): string {
  const msgs = (prompt ?? []) as { role: string; content: unknown }[];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]!;
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) return (m.content as { type: string; text?: string }[]).map((p) => (p.type === 'text' ? (p.text ?? '') : '')).join('');
  }
  return '';
}

function partsOf(t: Exclude<MockTurn, { error: unknown }>, n: number): unknown[] {
  const tin = t.tokensIn ?? 100;
  const head = [{ type: 'stream-start', warnings: [] }];
  if ('text' in t) {
    const tout = t.tokensOut ?? Math.max(1, Math.ceil(t.text.length / 4));
    return [...head, { type: 'text-start', id: `t${n}` }, { type: 'text-delta', id: `t${n}`, delta: t.text }, { type: 'text-end', id: `t${n}` }, { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(tin, tout) }];
  }
  const calls = 'tool' in t ? [{ tool: t.tool, input: t.input }] : t.tools;
  return [
    ...head,
    ...calls.map((c, i) => ({ type: 'tool-call', toolCallId: `call_${n}_${i}`, toolName: c.tool, input: JSON.stringify(c.input ?? {}) })),
    { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: usage(tin, t.tokensOut ?? 20) },
  ];
}

/** Model giả: mỗi `doStream` lấy một lượt kịch bản. `calls` đếm số lượt đã gọi (test kiểm). */
export function mockLanguageModel(script: MockScript, opts: { provider?: string; model?: string } = {}) {
  let n = 0;
  const model = new MockLanguageModelV4({
    provider: opts.provider ?? MOCK_PROVIDER,
    modelId: opts.model ?? MOCK_MODEL,
    doStream: async (o) => {
      const call = n++;
      const turn = typeof script === 'function' ? script({ lastUser: lastUserText(o.prompt), call }) : (script[call] ?? { text: '' });
      if ('error' in turn) throw Object.assign(new Error(turn.error.message ?? `HTTP ${turn.error.statusCode}`), { statusCode: turn.error.statusCode, isRetryable: turn.error.statusCode >= 500 || turn.error.statusCode === 429 });
      return { stream: convertArrayToReadableStream(partsOf(turn, call) as never[]) };
    },
  });
  return Object.assign(model, { get calls() { return n; } });
}

/** Nguồn model một ứng viên (test engine / dev). */
export function staticModelSource(cands: { provider: string; model: string; handle: unknown }[]): ModelSource {
  return { candidates: async () => cands as ModelCandidate[] };
}

/** Kịch bản mặc định của `AI_ENGINE=mock` (dev / E2E): trả lời ngắn có nhắc lại câu hỏi — không gọi tool. */
export const echoScript: MockScript = ({ lastUser }) => ({ text: lastUser ? `Đã nhận: ${lastUser.slice(0, 200)}` : 'Xin chào, tôi có thể giúp gì?' });

export function mockModelSource(script: MockScript = echoScript): ModelSource {
  const model = mockLanguageModel(script);
  return staticModelSource([{ provider: MOCK_PROVIDER, model: MOCK_MODEL, handle: model }]);
}
