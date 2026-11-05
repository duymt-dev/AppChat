// Tệp đính kèm ô soạn Trợ lý (TIP-023c 8c): tải ngay → ready + file_id; lỗi → thử lại; huỷ khi đang tải không để lại tệp; mime / số
// lượng sai bị từ chối sớm (server vẫn kiểm lại); payload chỉ id + tên.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { transport } from '@/shared/api/client';
import { ATTACH_MAX_FILES } from '@/shared/assistant/attachment-extensions';
import { useAssistantAttachments, useAttachStore } from './useAssistantAttachments';

const file = (name: string, type = 'application/pdf', size = 10) => new File([new Uint8Array(size)], name, { type });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAttachStore.getState().set(() => []);
});

describe('useAssistantAttachments', () => {
  it('tải ngay → ready; payload chỉ id + tên', async () => {
    vi.spyOn(transport, 'upload').mockResolvedValue({ file_id: 'f-1', name: 'a.pdf', size: 10 });
    const { result } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('a.pdf')]));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.payload()).toEqual([{ id: 'f-1', name: 'a.pdf' }]);
    expect(transport.upload).toHaveBeenCalledWith(expect.any(File), 'attachment', expect.any(AbortSignal));
  });

  it('lỗi tải → error (chưa gửi được) → thử lại → ready', async () => {
    const up = vi.spyOn(transport, 'upload').mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce({ file_id: 'f-2', name: 'b.pdf', size: 10 });
    const { result } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('b.pdf')]));
    await waitFor(() => expect(result.current.items[0]?.status).toBe('error'));
    expect(result.current.ready).toBe(false);
    act(() => result.current.retry(result.current.items[0]!.key));
    await waitFor(() => expect(result.current.items[0]?.status).toBe('ready'));
    expect(up).toHaveBeenCalledTimes(2);
  });

  it('huỷ khi đang tải: abort + gỡ chip, kết quả trễ không sống lại', async () => {
    let resolve: (v: { file_id: string; name: string; size: number }) => void = () => undefined;
    let signal: AbortSignal | undefined;
    vi.spyOn(transport, 'upload').mockImplementation((_f, _p, s) => {
      signal = s;
      return new Promise((r) => (resolve = r));
    });
    const { result } = renderHook(() => useAssistantAttachments());
    act(() => result.current.add([file('c.pdf')]));
    act(() => result.current.remove(result.current.items[0]!.key));
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve({ file_id: 'late', name: 'c.pdf', size: 10 }));
    expect(result.current.items).toEqual([]);
  });

  it('mime lạ / quá số tệp bị từ chối sớm', () => {
    vi.spyOn(transport, 'upload').mockReturnValue(new Promise(() => undefined));
    const rejected: string[] = [];
    const { result } = renderHook(() => useAssistantAttachments((name, why) => rejected.push(`${name}:${why}`)));
    act(() => result.current.add([file('x.exe', 'application/x-msdownload')]));
    act(() => result.current.add(Array.from({ length: ATTACH_MAX_FILES + 1 }, (_, i) => file(`f${i}.png`, 'image/png'))));
    expect(result.current.items).toHaveLength(ATTACH_MAX_FILES);
    expect(rejected).toEqual(['x.exe:mime', `f${ATTACH_MAX_FILES}.png:too_many`]);
  });
});
