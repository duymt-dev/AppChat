// Tệp đính kèm ô soạn Trợ lý (TIP-023c 8c → TIP-023f §1.1, §4.1-4.2): tải lên → attachment_prepare → hỏi trạng thái tới ready → handle
// { artifact_id, revision }; lỗi có lý do → thử lại; bỏ khi đang tải huỷ + kết quả trễ không gắn lại; bỏ artifact nháp → attachment_remove;
// đuôi / số / tổng sai bị từ chối sớm (server vẫn kiểm theo nội dung); đổi workspace → khay rỗng + nonce mới.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const upload = vi.fn();
const get = vi.fn();
const run = vi.fn();
let ws = 'ws-1';
vi.mock('@/shared/api/client', () => ({ transport: { upload: (...a: unknown[]) => upload(...a), get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: (id: string) => ({ run: (input: unknown, opts: unknown) => run(id, input, opts) }) }));
vi.mock('@/shared/shell/useShellData', () => ({ useMe: () => ({ data: { current_workspace_id: ws } }) }));

import { ATTACH_MAX_FILES } from '@/shared/assistant/attachment-extensions';
import { useAssistantAttachments, useAttachStore } from './useAssistantAttachments';

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name, { type: name.endsWith('.png') ? 'image/png' : 'application/pdf' });
const ART = '0190f000-0000-7000-8000-000000000001';

beforeEach(() => {
  ws = 'ws-1';
  run.mockImplementation(async (id: string) => (id === 'assistant.attachment_prepare' ? { result: { artifact_id: ART, revision: 1, phase: 'queued' } } : { result: {} }));
  get.mockResolvedValue({ artifact_id: ART, revision: 1, phase: 'ready', error_reason: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAttachStore.getState().renew();
});

describe('useAssistantAttachments', () => {
  it('tải lên → prepare (đúng nonce bản nháp) → ready; handle chỉ id + revision', async () => {
    upload.mockResolvedValue({ file_id: 'f-1', name: 'a.pdf', size: 10 });
    const { result } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('a.pdf')]));
    await waitFor(() => expect(result.current.items[0]?.status).toBe('ready'));
    expect(result.current.ready).toBe(true);
    expect(result.current.handles()).toEqual([{ artifact_id: ART, revision: 1 }]);
    expect(upload).toHaveBeenCalledWith(expect.any(File), 'attachment', expect.any(AbortSignal));
    expect(run).toHaveBeenCalledWith('assistant.attachment_prepare', { file_id: 'f-1', draft_nonce: useAttachStore.getState().nonce }, expect.anything());
  });

  it('parse lỗi → error có lý do (chưa gửi được) → thử lại không tải lên lại', async () => {
    upload.mockResolvedValue({ file_id: 'f-2', name: 'b.pdf', size: 10 });
    get.mockResolvedValueOnce({ artifact_id: ART, revision: 1, phase: 'failed', error_reason: 'encrypted' });
    const { result } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('b.pdf')]));
    await waitFor(() => expect(result.current.items[0]?.status).toBe('error'));
    expect(result.current.items[0]?.reason).toBe('encrypted');
    expect(result.current.ready).toBe(false);
    act(() => result.current.retry(result.current.items[0]!.key));
    await waitFor(() => expect(result.current.items[0]?.status).toBe('ready'));
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('huỷ khi đang tải: abort + gỡ chip, kết quả trễ không sống lại', async () => {
    let resolve: (v: { file_id: string; name: string; size: number }) => void = () => undefined;
    let signal: AbortSignal | undefined;
    upload.mockImplementation((_f: File, _p: string, s: AbortSignal) => {
      signal = s;
      return new Promise((r) => (resolve = r));
    });
    const { result } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('c.pdf')]));
    act(() => result.current.remove(result.current.items[0]!.key));
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve({ file_id: 'late', name: 'c.pdf', size: 10 }));
    expect(result.current.items).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('bỏ tệp đã chuẩn bị → attachment_remove đúng revision (không xoá tệp gốc)', async () => {
    upload.mockResolvedValue({ file_id: 'f-3', name: 'd.pdf', size: 10 });
    const { result } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('d.pdf')]));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.remove(result.current.items[0]!.key));
    expect(run).toHaveBeenCalledWith('assistant.attachment_remove', { artifact_id: ART, if_revision: 1 }, expect.anything());
  });

  it('đuôi lạ / quá số tệp / quá tổng dung lượng bị từ chối sớm', () => {
    upload.mockReturnValue(new Promise(() => undefined));
    const rejected: string[] = [];
    const { result } = renderHook(() => useAssistantAttachments((name, why) => rejected.push(`${name}:${why}`)));
    act(() => result.current.add([file('x.exe'), file('y.msg')]));
    act(() => result.current.add(Array.from({ length: ATTACH_MAX_FILES + 1 }, (_, i) => file(`f${i}.png`))));
    expect(result.current.items).toHaveLength(ATTACH_MAX_FILES);
    expect(rejected).toEqual(['x.exe:mime', 'y.msg:mime', `f${ATTACH_MAX_FILES}.png:too_many`]);
    act(() => result.current.clear());
    act(() => result.current.add([file('a.pdf', 24 * 1024 * 1024), file('b.pdf', 24 * 1024 * 1024), file('c.pdf', 24 * 1024 * 1024)]));
    expect(rejected.at(-1)).toBe('c.pdf:total');
  });

  it('đổi workspace → huỷ thao tác, khay rỗng, nonce mới', async () => {
    upload.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('a.pdf')]));
    const nonce = useAttachStore.getState().nonce;
    ws = 'ws-2';
    rerender();
    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(useAttachStore.getState().nonce).not.toBe(nonce);
  });
});
