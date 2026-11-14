// TIP-019 AC2: AiSdkEngine trên AI SDK v7 thật + model giả — usage từng bước (spike K4), tool loop, loop guard, maxSteps, ngân sách,
// dừng chờ người + chạy tiếp từ state (không giữ RAM), tool ngoài danh sách → FORBIDDEN, huỷ.
import { describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, resumeMessages, staticModelSource, type MockScript, type RunEvent, type RunRequest, type ToolOutcome, type ToolSpec } from '../src';

const lookup = (out: (input: unknown) => ToolOutcome = () => ({ kind: 'ok', output: { price: '1.500.000' } })): ToolSpec & { calls: unknown[] } => {
  const calls: unknown[] = [];
  return {
    name: 'product_lookup',
    description: 'Tra giá sản phẩm',
    inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
    origin: 'action',
    calls,
    execute: async (input) => {
      calls.push(input);
      return out(input);
    },
  };
};

const req = (tools: ToolSpec[], p: Partial<RunRequest> = {}): RunRequest => ({
  runId: 'r1',
  workspaceId: 'ws',
  system: 'Bạn là trợ lý.',
  messages: [{ role: 'user', content: 'Giá gói HIFU?' }],
  tools,
  tier: 'standard',
  maxSteps: 8,
  budget: { maxCredits: 1000 },
  ...p,
});

async function collect(script: MockScript, r: RunRequest, signal = new AbortController().signal) {
  const engine = new AiSdkEngine(staticModelSource([{ provider: 'mock', model: 'm1', handle: mockLanguageModel(script) }]));
  const events: RunEvent[] = [];
  for await (const e of engine.run(r, signal)) events.push(e);
  return events;
}
const last = (ev: RunEvent[]) => ev.at(-1)!;

describe('AiSdkEngine', () => {
  it('trả lời chữ: delta + usage + finish(stop)', async () => {
    const ev = await collect([{ text: 'Chào chị', tokensIn: 50, tokensOut: 7 }], req([]));
    expect(ev.filter((e) => e.type === 'delta').map((e) => (e as { text: string }).text).join('')).toBe('Chào chị');
    expect(ev.find((e) => e.type === 'usage')).toMatchObject({ usage: { stepIdx: 0, provider: 'mock', model: 'm1', tokensIn: 50, tokensOut: 7 } });
    expect(last(ev)).toMatchObject({ type: 'finish', reason: 'stop', text: 'Chào chị', steps: 1 });
  });

  it('tool loop 2 bước → 2 usage riêng, hook trừ credit mỗi bước, tool chạy qua ToolSpec, kết quả về model', async () => {
    const t = lookup();
    const charged: number[] = [];
    const ev = await collect([{ tool: 'product_lookup', input: { q: 'HIFU' }, tokensIn: 100, tokensOut: 20 }, { text: 'Giá 1.500.000đ', tokensIn: 150, tokensOut: 5 }], req([t], {
      hooks: { onUsage: async (u) => (charged.push(u.tokensIn + u.tokensOut), { credits: 2 }) },
    }));
    expect(t.calls).toEqual([{ q: 'HIFU' }]);
    expect(ev.filter((e) => e.type === 'usage').map((e) => (e as { usage: { stepIdx: number } }).usage.stepIdx)).toEqual([0, 1]);
    expect(charged).toEqual([120, 155]);
    const fin = last(ev) as Extract<RunEvent, { type: 'finish' }>;
    expect(fin).toMatchObject({ reason: 'stop', text: 'Giá 1.500.000đ', steps: 2 });
    expect(fin.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
  });

  it('cùng tool + cùng input lần thứ 3 → loop_guard (không chạy lần 3)', async () => {
    const t = lookup();
    const same = { tool: 'product_lookup', input: { q: 'x' } };
    const ev = await collect([same, same, same, { text: 'không tới' }], req([t]));
    expect(t.calls).toHaveLength(2);
    expect(last(ev)).toMatchObject({ type: 'finish', reason: 'loop_guard' });
  });

  it('vượt maxSteps → max_steps; hết ngân sách → budget; beforeStep ném → error', async () => {
    const t = lookup();
    const ev = await collect([{ tool: 'product_lookup', input: { q: 'a' } }, { tool: 'product_lookup', input: { q: 'b' } }, { text: 'x' }], req([t], { maxSteps: 2 }));
    expect(last(ev)).toMatchObject({ type: 'finish', reason: 'max_steps', steps: 2 });
    const ev2 = await collect([{ tool: 'product_lookup', input: { q: 'a' } }, { text: 'x' }], req([lookup()], { budget: { maxCredits: 5 }, hooks: { onUsage: async () => ({ credits: 5 }) } }));
    expect(last(ev2)).toMatchObject({ type: 'finish', reason: 'budget', steps: 1 });
    const ev3 = await collect([{ text: 'x' }], req([], { hooks: { beforeStep: async () => Promise.reject(Object.assign(new Error('hết credit'), { code: 'CREDIT_EXHAUSTED' })) } }));
    expect(last(ev3)).toMatchObject({ type: 'error', code: 'CREDIT_EXHAUSTED', stepIdx: 0 });
  });

  it('tool cần xác nhận → paused (state đủ chạy tiếp); chạy tiếp với kết quả → finish; tool sau cùng bước báo chưa chạy', async () => {
    const send: ToolSpec = { name: 'message_send', description: 'Gửi tin', inputSchema: { type: 'object' }, origin: 'action', execute: async () => ({ kind: 'needs_confirmation', preview: { summary: 'Gửi 1 tin', risk: 'send' }, confirmToken: 'tok' }) };
    const t = lookup();
    const ev = await collect([{ tools: [{ tool: 'message_send', input: { text: 'Chào' } }, { tool: 'product_lookup', input: { q: 'y' } }] }], req([send, t]));
    const p = last(ev) as Extract<RunEvent, { type: 'paused' }>;
    expect(p).toMatchObject({ type: 'paused', outcome: { kind: 'needs_confirmation', confirmToken: 'tok' }, state: { pendingToolCall: { toolName: 'message_send' }, stepIdx: 1 } });
    expect(p.state.skipped.map((c) => c.toolName)).toEqual(['product_lookup']);
    expect(t.calls).toHaveLength(0);
    // Chạy tiếp ở "process khác": state qua JSON (như jsonb), engine mới.
    const state = JSON.parse(JSON.stringify(p.state)) as typeof p.state;
    const resumed = resumeMessages(state, { kind: 'ok', output: { sent: true } });
    const ev2 = await collect([{ text: 'Đã gửi' }], req([send, t], { messages: resumed, startStep: state.stepIdx }));
    expect(last(ev2)).toMatchObject({ type: 'finish', reason: 'stop', text: 'Đã gửi', steps: 2 });
    const toolMsg = resumed.at(-1) as { role: string; content: { toolName: string; output: { value: unknown } }[] };
    expect(toolMsg.content.map((c) => c.toolName)).toEqual(['message_send', 'product_lookup']);
    expect(toolMsg.content[1]!.output.value).toMatchObject({ error: { code: 'NOT_EXECUTED' } });
  });

  it('tool ngoài danh sách → kết quả FORBIDDEN, run tiếp; lỗi tool → kết quả lỗi; huỷ → cancelled', async () => {
    const ev = await collect([{ tool: 'contact_delete', input: { id: 1 } }, { text: 'Không làm được' }], req([lookup()]));
    expect(ev.find((e) => e.type === 'tool_result')).toMatchObject({ outcome: { kind: 'error', code: 'FORBIDDEN' } });
    expect(last(ev)).toMatchObject({ reason: 'stop' });
    const boom: ToolSpec = { ...lookup(), execute: async () => Promise.reject(Object.assign(new Error('db down'), { code: 'INTERNAL' })) };
    const ev2 = await collect([{ tool: 'product_lookup', input: { q: 1 } }, { text: 'Xin lỗi' }], req([boom]));
    expect(ev2.find((e) => e.type === 'tool_result')).toMatchObject({ outcome: { kind: 'error', code: 'INTERNAL' } });
    const ac = new AbortController();
    ac.abort();
    expect(last(await collect([{ text: 'x' }], req([]), ac.signal))).toMatchObject({ type: 'finish', reason: 'cancelled', steps: 0 });
  });
});
