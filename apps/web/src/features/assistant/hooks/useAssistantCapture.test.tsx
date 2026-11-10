// Chụp màn hình Trợ lý (TIP-023f §4.3, AC 7): chỉ chụp khi gọi start (cú bấm người dùng); mọi track dừng ở thành công / từ chối; xem lại
// trước — "Đính kèm" mới đưa tệp PNG vào khay (không tự gửi); huỷ / đổi phạm vi → bỏ ảnh + giải phóng URL; kết quả trễ sau khi đổi phạm vi bị bỏ.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAssistantCapture } from './useAssistantCapture';

const stop = vi.fn();
const stream = { getTracks: () => [{ stop }, { stop }] };
let getDisplayMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getDisplayMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getDisplayMedia }, configurable: true });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['png'], { type: 'image/png' })));
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('useAssistantCapture', () => {
  it('không chụp khi chưa bấm; chụp → dừng mọi track → xem lại → Đính kèm đưa PNG vào khay (không tự gửi)', async () => {
    const attach = vi.fn();
    const { result } = renderHook(() => useAssistantCapture('s1', attach));
    expect(getDisplayMedia).not.toHaveBeenCalled();
    await act(() => result.current.start());
    expect(stop).toHaveBeenCalledTimes(2);
    expect(result.current.state.kind).toBe('review');
    expect(attach).not.toHaveBeenCalled();
    act(() => result.current.accept());
    expect(attach).toHaveBeenCalledWith([expect.any(File)]);
    expect((attach.mock.calls[0]![0] as File[])[0]!.type).toBe('image/png');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    expect(result.current.state.kind).toBe('idle');
  });

  it('từ chối quyền → lỗi thật, không có ảnh; không hỗ trợ → unsupported', async () => {
    getDisplayMedia.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    const { result } = renderHook(() => useAssistantCapture('s1', vi.fn()));
    await act(() => result.current.start());
    expect(result.current.state).toEqual({ kind: 'error', reason: 'denied' });
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    await act(() => result.current.start());
    expect(result.current.state).toEqual({ kind: 'error', reason: 'unsupported' });
  });

  it('đổi phạm vi khi đang chọn màn hình → kết quả trễ bị bỏ, track vẫn dừng', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    getDisplayMedia.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const attach = vi.fn();
    const { result, rerender } = renderHook(({ s }) => useAssistantCapture(s, attach), { initialProps: { s: 's1' } });
    let p: Promise<void> = Promise.resolve();
    act(() => void (p = result.current.start()));
    rerender({ s: 's2' });
    await act(async () => (resolve(stream), await p));
    expect(stop).toHaveBeenCalled();
    expect(result.current.state.kind).toBe('idle');
  });
});
