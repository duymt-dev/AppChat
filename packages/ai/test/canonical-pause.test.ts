// TIP-023b R1.6: input chuẩn hoá (mã → id) mà confirm token gắn được giữ trong trạng thái dừng — qua JSON (jsonb) vẫn còn, nên
// xác nhận ở process khác chạy đúng input đó, không lấy lại input thô của model (mã KH-/BG- có thể đã trỏ sang đối tượng khác).
import { describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript, type RunEvent, type RunRequest, type ToolSpec } from '../src';

const req = (tools: ToolSpec[]): RunRequest => ({
  runId: 'r1',
  workspaceId: 'ws',
  system: 'Bạn là trợ lý.',
  messages: [{ role: 'user', content: 'Sửa SĐT KH-1016' }],
  tools,
  tier: 'standard',
  maxSteps: 8,
  budget: { maxCredits: 1000 },
});

async function paused(script: MockScript, tools: ToolSpec[]) {
  const engine = new AiSdkEngine(staticModelSource([{ provider: 'mock', model: 'm1', handle: mockLanguageModel(script) }]));
  const ev: RunEvent[] = [];
  for await (const e of engine.run(req(tools), new AbortController().signal)) ev.push(e);
  const p = ev.at(-1);
  if (p?.type !== 'paused') throw new Error(`không dừng: ${JSON.stringify(p)}`);
  return p;
}

const raw = { contact_id: 'KH-1016', patch: { phone: '0901111222' }, items: [{ product_id: 'SP-7' }] };
const canonical = { contact_id: '7c1e2b8a-0000-4000-8000-000000000001', patch: { phone: '0901111222' }, items: [{ product_id: '7c1e2b8a-0000-4000-8000-000000000002' }] };

describe('canonical input qua pause (TIP-023b R1.6)', () => {
  it('needs_confirmation có canonicalInput → state giữ đúng input đó, sống qua JSON', async () => {
    const update: ToolSpec = { name: 'contact__update', description: 'Sửa khách', inputSchema: { type: 'object' }, origin: 'action', execute: async () => ({ kind: 'needs_confirmation', preview: { summary: 'Sửa SĐT', risk: 'write' }, confirmToken: 'tok', canonicalInput: canonical }) };
    const p = await paused([{ tool: 'contact__update', input: raw }], [update]);
    const state = JSON.parse(JSON.stringify(p.state)) as typeof p.state;
    expect(state.canonicalInput).toEqual(canonical);
    expect(state.pendingToolCall.input).toEqual(raw);
    expect(state.pendingToolCall.toolCallId).toEqual(expect.any(String));
  });

  it('không có canonicalInput (needs_approval / tool cũ) → state không bịa ô', async () => {
    const send: ToolSpec = { name: 'message__send', description: 'Gửi', inputSchema: { type: 'object' }, origin: 'action', execute: async () => ({ kind: 'needs_approval', approvalId: 'ap1' }) };
    const p = await paused([{ tool: 'message__send', input: { text: 'Chào' } }], [send]);
    expect('canonicalInput' in p.state).toBe(false);
  });
});
