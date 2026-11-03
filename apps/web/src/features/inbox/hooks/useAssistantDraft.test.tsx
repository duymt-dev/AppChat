// TIP-023c REQ-C05c: useAssistantDraft — đề xuất chỉ vào ô soạn khi người bấm Thay / Chèn (không gửi, không đổi chế độ AI); người sửa nháp
// trong lúc chờ → xung đột, không ghi đè; đổi hội thoại → bỏ kết quả cũ, nháp người viết giữ nguyên; lỗi → thử lại; huỷ → kết quả về muộn
// bị bỏ.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAssistantDraft } from './useAssistantDraft';

const post = vi.fn();
vi.mock('@/shared/api/client', () => ({ transport: { post: (...a: unknown[]) => post(...a), action: vi.fn(), get: vi.fn() } }));

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => ((resolve = a), (reject = b)));
  return { promise, resolve, reject };
};
const reply = (conv: string, base: number, text = 'Dạ, giá 500k ạ.') => ({ purpose: 'inbox_rewrite', conversation_id: conv, base_version: base, proposed_text: text, run_id: 'r', credits_used: 1 });

function setup(conv = 'c1', initial = 'giá 500k') {
  const onDraft = vi.fn();
  const h = renderHook(({ conv, draft }) => useAssistantDraft(conv, draft, onDraft), { initialProps: { conv, draft: initial } });
  return { ...h, onDraft };
}

describe('useAssistantDraft', () => {
  beforeEach(() => post.mockReset());

  it('viết lại → đề xuất; Thay mới đổi nháp; không có action nào được gọi', async () => {
    post.mockResolvedValueOnce(reply('c1', 0));
    const { result, onDraft } = setup();
    await act(async () => result.current.rewrite());
    expect(post).toHaveBeenCalledWith('/assistant/messages', { purpose: 'inbox_rewrite', conversation_id: 'c1', base_version: 0, draft: 'giá 500k' });
    expect(result.current.proposal).toEqual({ purpose: 'inbox_rewrite', text: 'Dạ, giá 500k ạ.', conflict: false });
    expect(onDraft).not.toHaveBeenCalled();
    act(() => result.current.replace());
    expect(onDraft).toHaveBeenCalledWith('Dạ, giá 500k ạ.');
    expect(result.current.proposal).toBeNull();
  });

  it('người sửa nháp trong lúc chờ → xung đột, không tự ghi đè; Chèn giữ chữ người viết', async () => {
    const d = deferred<ReturnType<typeof reply>>();
    post.mockReturnValueOnce(d.promise);
    const { result, rerender, onDraft } = setup();
    act(() => result.current.rewrite());
    rerender({ conv: 'c1', draft: 'giá 500k, có ship' });
    await act(async () => d.resolve(reply('c1', 0)));
    expect(result.current.proposal?.conflict).toBe(true);
    expect(onDraft).not.toHaveBeenCalled();
    act(() => result.current.insert());
    expect(onDraft).toHaveBeenCalledWith('giá 500k, có ship\nDạ, giá 500k ạ.');
  });

  it('đổi hội thoại khi đang chờ → bỏ kết quả cũ, không đổi nháp', async () => {
    const d = deferred<ReturnType<typeof reply>>();
    post.mockReturnValueOnce(d.promise);
    const { result, rerender, onDraft } = setup();
    act(() => result.current.rewrite());
    rerender({ conv: 'c2', draft: '' });
    await act(async () => d.resolve(reply('c1', 0)));
    expect(result.current.proposal).toBeNull();
    expect(result.current.pending).toBeNull();
    expect(onDraft).not.toHaveBeenCalled();
  });

  it('lỗi → error + thử lại; huỷ → kết quả về muộn bị bỏ', async () => {
    post.mockRejectedValueOnce(new Error('502'));
    const { result } = setup('c1', '');
    await act(async () => result.current.compose());
    expect(result.current.error).toBe(true);
    post.mockResolvedValueOnce({ ...reply('c1', 0, 'Dạ em chào chị'), purpose: 'inbox_compose' });
    await act(async () => result.current.retry());
    expect(result.current.proposal?.text).toBe('Dạ em chào chị');
    act(() => result.current.dismiss());
    const d = deferred<ReturnType<typeof reply>>();
    post.mockReturnValueOnce(d.promise);
    act(() => result.current.compose());
    expect(result.current.pending).toBe('inbox_compose');
    act(() => result.current.cancel());
    await act(async () => d.resolve(reply('c1', 0)));
    expect(result.current.proposal).toBeNull();
  });
});
