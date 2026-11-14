// TIP-023d §3.2 (AC3): cổng sửa kế hoạch trong engine — batch 3 lời gọi, dừng sau lời gọi đầu: tool đầu đã chạy giữ kết quả, hai lời
// gọi còn lại thành `PLAN_SUPERSEDED` đúng một lần (transcript đủ tool-result), không chạy lại; dừng trước lời gọi model mới không gọi
// provider; checkpoint sống qua JSON và chạy tiếp nối tin kế hoạch mới mà không phát lại batch cũ.
import { describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, resumeFromCheckpoint, staticModelSource, type MockScript, type PlanCheckpoint, type RunEvent, type RunRequest, type ToolSpec } from '../src';

const req = (tools: ToolSpec[], gate: () => Promise<{ paused: number } | null>, messages: RunRequest['messages'] = [{ role: 'user', content: 'làm 3 việc' }]): RunRequest => ({
  runId: 'r1',
  workspaceId: 'ws',
  system: 'Bạn là trợ lý.',
  messages,
  tools,
  tier: 'standard',
  maxSteps: 8,
  budget: { maxCredits: 1000 },
  hooks: { planGate: gate },
});

async function collect(script: MockScript, r: RunRequest) {
  let calls = 0;
  const model = mockLanguageModel((ctx) => {
    calls++;
    return typeof script === 'function' ? script(ctx) : script[ctx.call]!;
  });
  const engine = new AiSdkEngine(staticModelSource([{ provider: 'mock', model: 'm1', handle: model }]));
  const ev: RunEvent[] = [];
  for await (const e of engine.run(r, new AbortController().signal)) ev.push(e);
  return { ev, calls: () => calls };
}

describe('plan checkpoint (TIP-023d §3.2)', () => {
  it('batch nhiều lời gọi: tool đã chạy giữ kết quả, còn lại superseded một lần, không chạy lại', async () => {
    const ran: string[] = [];
    const tool = (name: string): ToolSpec => ({ name, description: name, inputSchema: { type: 'object' }, origin: 'action', execute: async () => (ran.push(name), { kind: 'ok', output: { done: name } }) });
    let paused = false;
    const gate = async () => (paused ? { paused: 4 } : null);
    const tools = [tool('a'), tool('b'), tool('c')];
    // Tool `a` chạy xong thì người dùng bấm "Sửa kế hoạch".
    tools[0] = { ...tools[0]!, execute: async () => ((paused = true), ran.push('a'), { kind: 'ok', output: { done: 'a' } }) };
    const { ev } = await collect(({ call }) => (call === 0 ? { tools: [{ tool: 'a', input: {} }, { tool: 'b', input: {} }, { tool: 'c', input: {} }] } : { text: 'không được gọi' }), req(tools, gate));
    expect(ran).toEqual(['a']);
    const last = ev.at(-1)!;
    expect(last.type).toBe('plan_paused');
    const cp = JSON.parse(JSON.stringify((last as { checkpoint: PlanCheckpoint }).checkpoint)) as PlanCheckpoint;
    expect(cp).toMatchObject({ stepIdx: 1, epoch: 4, superseded: [{ toolName: 'b' }, { toolName: 'c' }] });
    const toolMsg = cp.messages.at(-1) as { role: string; content: { toolName: string; output: { value: unknown } }[] };
    expect(toolMsg.role).toBe('tool');
    expect(toolMsg.content.map((p) => p.toolName)).toEqual(['a', 'b', 'c']);
    expect(toolMsg.content[0]!.output.value).toEqual({ done: 'a' });
    expect(toolMsg.content[1]!.output.value).toMatchObject({ error: { code: 'PLAN_SUPERSEDED' } });
  });

  it('đã yêu cầu sửa trước lời gọi model → dừng, không gọi provider', async () => {
    const r = await collect({ 0: { text: 'không được gọi' } } as never, req([], async () => ({ paused: 2 })));
    expect(r.calls()).toBe(0);
    expect(r.ev).toEqual([{ type: 'plan_paused', checkpoint: { messages: [{ role: 'user', content: 'làm 3 việc' }], stepIdx: 0, superseded: [], epoch: 2 } }]);
  });

  it('chạy tiếp từ checkpoint: nối tin kế hoạch mới, giữ bộ đếm bước, không phát lại tool cũ', async () => {
    const ran: string[] = [];
    const tool: ToolSpec = { name: 'a', description: 'a', inputSchema: { type: 'object' }, origin: 'action', execute: async () => (ran.push('a'), { kind: 'ok', output: {} }) };
    const cp: PlanCheckpoint = { messages: [{ role: 'user', content: 'làm' }], stepIdx: 3, superseded: [], epoch: 1 };
    const seen: string[] = [];
    const r = await collect(({ lastUser }) => (seen.push(lastUser), { text: 'tiếp tục theo kế hoạch mới' }), { ...req([tool], async () => null, resumeFromCheckpoint(cp, 'Kế hoạch đã sửa: bước 2 bỏ.')), startStep: cp.stepIdx });
    expect(ran).toEqual([]);
    expect(seen).toEqual(['Kế hoạch đã sửa: bước 2 bỏ.']);
    expect(r.ev.at(-1)).toMatchObject({ type: 'finish', reason: 'stop', steps: 4 });
  });
});
