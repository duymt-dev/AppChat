// TIP-023c 6a "Structured tree stream": input `render` đến dần → khung xương chỉ có loại khối (không chữ / $ref / nút / action_id / giá trị
// form), chỉ phát khi hình đổi, giữ trần §8 (sâu 4, 30 khối), loại lạ bị bỏ. Engine phát `tool_input` TRƯỚC khi model xong bước (barrier).
import { describe, expect, it } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { AiSdkEngine, TreeSkeletonStream, skeletonOf, staticModelSource, type RunEvent, type RunRequest } from '../src';

const usage = { inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 3, text: 3, reasoning: 0 } };
const TREE = JSON.stringify({
  tree: {
    version: 1,
    root: {
      type: 'stack',
      children: [
        { type: 'stat', label: 'Doanh thu SECRET-LABEL', value: { $ref: 'step:1.total' } },
        { type: 'button', label: 'Gửi', on: { kind: 'action', action_id: 'message.send', input: { text: 'x' } } },
        { type: 'form', action_id: 'channel.email.connect', fields: [{ name: 'fields.password', value: 'PW-CANARY' }] },
      ],
    },
  },
});

describe('TreeSkeletonStream', () => {
  it('ghép dần: khung xương lớn lên theo khối, chỉ phát khi hình đổi, không mang nội dung', async () => {
    const s = new TreeSkeletonStream();
    const seen: unknown[] = [];
    for (let i = 0; i < TREE.length; i += 7) {
      const sk = await s.push(TREE.slice(i, i + 7));
      if (sk) seen.push(sk);
    }
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.length).toBeLessThan(TREE.length / 7);
    expect(seen.at(-1)).toEqual({ root: { type: 'stack', children: [{ type: 'stat' }, { type: 'button' }, { type: 'form' }] }, blocks: 4 });
    const all = JSON.stringify(seen);
    for (const leak of ['SECRET-LABEL', 'step:1', 'message.send', 'PW-CANARY', 'action_id', 'label']) expect(all).not.toContain(leak);
  });

  it('trần §8: sâu > 4 bị cắt, > 30 khối dừng; loại lạ (html / script) bị bỏ', () => {
    const deep = { root: { type: 'stack', children: [{ type: 'stack', children: [{ type: 'stack', children: [{ type: 'stack', children: [{ type: 'stack', children: [{ type: 'text' }] }] }] }] }] } };
    const d = skeletonOf(deep)!;
    expect(JSON.stringify(d)).not.toContain('"text"');
    const wide = skeletonOf({ root: { type: 'stack', children: Array.from({ length: 50 }, () => ({ type: 'text' })) } })!;
    expect(wide.blocks).toBe(30);
    expect(skeletonOf({ root: { type: 'html' } })).toBeNull();
    expect(skeletonOf({ root: { type: 'stack', children: [{ type: 'script' }, { type: 'badge' }] } })!.root).toEqual({ type: 'stack', children: [{ type: 'badge' }] });
  });
});

describe('engine phát tool_input trực tiếp', () => {
  it('mảnh input render đầu tới trước khi bước model xong', async () => {
    let open!: () => void;
    const barrier = new Promise<void>((r) => (open = r));
    const model = new MockLanguageModelV4({
      provider: 'p1',
      modelId: 'm1',
      doStream: async () => ({
        stream: new ReadableStream({
          async start(c) {
            c.enqueue({ type: 'tool-input-start', id: 'call1', toolName: 'render' });
            c.enqueue({ type: 'tool-input-delta', id: 'call1', delta: TREE.slice(0, 60) });
            await barrier;
            c.enqueue({ type: 'tool-input-delta', id: 'call1', delta: TREE.slice(60) });
            c.enqueue({ type: 'tool-input-end', id: 'call1' });
            c.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage });
            c.close();
          },
        }),
      }),
    });
    const engine = new AiSdkEngine(staticModelSource([{ provider: 'p1', model: 'm1', handle: model }]));
    const req: RunRequest = { runId: 'r', workspaceId: 'ws', system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [{ name: 'render', origin: 'meta', description: 'r', inputSchema: { type: 'object' }, execute: async () => ({ kind: 'ok', output: {} }) }], tier: 'standard', maxSteps: 1, budget: { maxCredits: 100 } };
    const it = engine.run(req, new AbortController().signal)[Symbol.asyncIterator]();
    const first = (await it.next()).value as RunEvent;
    expect(first).toMatchObject({ type: 'tool_input', toolCallId: 'call1', toolName: 'render', delta: TREE.slice(0, 60) });
    open();
    const rest: RunEvent[] = [];
    for (let r = await it.next(); !r.done; r = await it.next()) rest.push(r.value);
    expect(rest.filter((e) => e.type === 'tool_input').map((e) => (e as { delta: string }).delta).join('')).toBe(TREE.slice(60));
  });
});
