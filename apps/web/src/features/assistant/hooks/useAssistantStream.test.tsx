// Lượt Trợ lý qua SSE (TIP-023c 6a): chữ hiện dần trong bong bóng tạm rồi gỡ khi xong; rớt mạng → nối lại theo cursor (không gửi lại
// lượt); hết lần nối mà chưa `done` → lỗi rõ (không giả câu trả lời); frame gom thành sự kiện như JSON cũ; khung xương chỉ ở bong bóng live.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { StreamFrame } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { collect } from '@/shared/assistant/turn-stream';
import { useAssistantUi } from '../assistant-store';
import { useAssistantStream } from './useAssistantStream';

const f = (seq: number, event: StreamFrame['event']): StreamFrame => ({ run_id: 'run_1', seq, cursor: `c${seq}`, event });
const q = { text: 'tóm tắt', mode: 'chat' as const, requestId: 'req-test-0001' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAssistantUi.getState().reset();
});

describe('useAssistantStream', () => {
  it('delta hiện ngay trong bong bóng live, xong thì gỡ; kết quả = sự kiện đã gom', async () => {
    const texts: string[] = [];
    vi.spyOn(transport, 'stream').mockImplementation(async (_p, _b, onFrame) => {
      onFrame(f(1, { type: 'delta', text: 'Chào ' }));
      texts.push(useAssistantUi.getState().messages.find((m) => m.live)?.text ?? '');
      onFrame(f(2, { type: 'delta', text: 'anh' }));
      texts.push(useAssistantUi.getState().messages.find((m) => m.live)?.text ?? '');
      onFrame(f(3, { type: 'done', status: 'completed', session_id: 's1' }));
      return { finished: true, cursor: 'c3' };
    });
    const { result } = renderHook(() => useAssistantStream());
    let out: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => void (out = await result.current.run(q)));
    expect(texts).toEqual(['Chào ', 'Chào anh']);
    expect(out).toEqual({ session_id: 's1', run_id: 'run_1', events: [{ type: 'delta', text: 'Chào anh' }] });
    expect(useAssistantUi.getState().messages.some((m) => m.live)).toBe(false);
  });

  it('ui_skeleton → bong bóng live mang khung xương (không vào sự kiện kết quả); cây thật thay thế khi xong', async () => {
    const skel: unknown[] = [];
    const ui = { type: 'ui' as const, tree: { version: 1 as const, root: { type: 'text' as const, text: 'xong' } }, run_id: 'run_1', refs: {} };
    vi.spyOn(transport, 'stream').mockImplementation(async (_p, _b, onFrame) => {
      onFrame(f(1, { type: 'ui_skeleton', call_id: 'c1', root: { type: 'stack', children: [{ type: 'stat' }] }, blocks: 2 }));
      skel.push(useAssistantUi.getState().messages.find((m) => m.live)?.skeleton);
      onFrame(f(2, ui));
      onFrame(f(3, { type: 'done', status: 'completed', session_id: 's1' }));
      return { finished: true, cursor: 'c3' };
    });
    const { result } = renderHook(() => useAssistantStream());
    let out: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => void (out = await result.current.run(q)));
    expect(skel).toEqual([{ type: 'stack', children: [{ type: 'stat' }] }]);
    expect(out?.events).toEqual([ui]);
    expect(useAssistantUi.getState().messages.some((m) => m.live)).toBe(false);
  });

  it('rớt mạng → nối lại GET /assistant/runs/:id/stream?cursor= (không POST lại lượt)', async () => {
    const calls: [string, unknown][] = [];
    vi.spyOn(transport, 'stream').mockImplementation(async (path, body, onFrame) => {
      calls.push([path, body]);
      if (calls.length === 1) {
        onFrame(f(1, { type: 'delta', text: 'một' }));
        return { finished: false, cursor: 'c1' };
      }
      onFrame(f(2, { type: 'confirm', confirm_token: 't', action_id: 'contact.create', title: 'Tạo khách', risk: 'write', route: '/customers', rows: [], preview: null } as never));
      onFrame(f(3, { type: 'done', status: 'waiting_approval', session_id: 's1' }));
      return { finished: true, cursor: 'c3' };
    });
    const { result } = renderHook(() => useAssistantStream());
    let out: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => void (out = await result.current.run(q)));
    expect(calls.map((c) => c[0])).toEqual(['/assistant/messages', '/assistant/runs/run_1/stream?cursor=c1']);
    expect(calls[1]![1]).toBeUndefined();
    expect((calls[0]![1] as { request_id: string }).request_id).toBe('req-test-0001');
    expect(out!.events.map((e) => e.type)).toEqual(['delta', 'confirm']);
  });

  it('nối lại hết lượt vẫn chưa done → lỗi (caller hiện câu lỗi chung), bong bóng live được gỡ', async () => {
    vi.spyOn(transport, 'stream').mockImplementation(async (_p, _b, onFrame) => {
      onFrame(f(1, { type: 'delta', text: 'dở' }));
      return { finished: false, cursor: 'c1' };
    });
    const { result } = renderHook(() => useAssistantStream());
    await act(async () => {
      await expect(result.current.run(q)).rejects.toThrow('stream_incomplete');
    });
    expect(useAssistantUi.getState().messages).toHaveLength(0);
  });

  it('collect: gộp delta liền nhau, giữ thứ tự ui_command / ui, reset_required được báo', () => {
    const c = collect([
      f(1, { type: 'delta', text: 'a' }),
      f(2, { type: 'ui_command', command: { type: 'navigate', route: '/quotes' } }),
      f(3, { type: 'delta', text: 'b' }),
      f(4, { type: 'delta', text: 'c' }),
      f(5, { type: 'reset_required' }),
    ]);
    expect(c.events).toEqual([{ type: 'delta', text: 'a' }, { type: 'ui_command', command: { type: 'navigate', route: '/quotes' } }, { type: 'delta', text: 'bc' }]);
    expect(c.reset).toBe(true);
  });
});
