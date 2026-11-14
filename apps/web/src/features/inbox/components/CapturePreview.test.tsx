// TIP-025b §F.4 — chụp màn hình: một khung rồi dừng MỌI track; xem trước trước khi đính kèm; Chấp nhận mới đưa File vào tệp chờ gửi (không
// gửi); Bỏ / unmount giải phóng URL blob; từ chối / không hỗ trợ → gợi ý chọn tệp (không "thành công" rỗng).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));

import { captureScreenFrame } from '@/shared/media/screen-capture';
import { useInboxCapture } from '../hooks/useInboxCapture';
import { CapturePreview } from './CapturePreview';

const stops: number[] = [];
function fakeDisplay(mode: 'ok' | 'deny') {
  const track = { stop: () => stops.push(1) };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getDisplayMedia: async () => (mode === 'deny' ? Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })) : { getTracks: () => [track, track] }) },
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: () => {} } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['png'], { type: 'image/png' })));
}

describe('screen capture', () => {
  afterEach(() => {
    cleanup();
    stops.length = 0;
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  });

  it('không hỗ trợ / từ chối: lý do rõ, không có ảnh', async () => {
    expect(await captureScreenFrame()).toEqual({ ok: false, reason: 'unsupported' });
    fakeDisplay('deny');
    expect(await captureScreenFrame()).toEqual({ ok: false, reason: 'denied' });
  });

  it('một khung rồi dừng mọi track', async () => {
    fakeDisplay('ok');
    const r = await captureScreenFrame();
    expect(r.ok).toBe(true);
    expect(stops).toHaveLength(2);
  });

  it('xem trước → Chấp nhận đưa File vào tệp chờ; Bỏ / unmount giải phóng URL', async () => {
    fakeDisplay('ok');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:shot');
    const accepted: File[][] = [];
    const h = renderHook(() => useInboxCapture('c1', (f) => accepted.push(f)));
    await act(() => h.result.current.start());
    expect(h.result.current.state.kind).toBe('preview');
    act(() => h.result.current.accept());
    expect(accepted[0]![0]).toBeInstanceOf(File);
    expect(accepted[0]![0]!.type).toBe('image/png');
    expect(revoke).toHaveBeenCalledWith('blob:shot');
    await act(() => h.result.current.start());
    h.unmount();
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('lỗi hiện nút chọn tệp; preview có cảnh báo nhạy cảm', () => {
    const pick = vi.fn();
    const cancel = vi.fn();
    render(<CapturePreview state={{ kind: 'error', reason: 'denied' }} onAccept={vi.fn()} onCancel={cancel} onPickFile={pick} />);
    expect(screen.getByText('inbox.composer.capture.denied')).toBeTruthy();
    fireEvent.click(screen.getByTestId('capture-fallback'));
    expect([pick.mock.calls.length, cancel.mock.calls.length]).toEqual([1, 1]);
    cleanup();
    render(<CapturePreview state={{ kind: 'preview', blob: new Blob(), url: 'blob:x' }} onAccept={vi.fn()} onCancel={cancel} onPickFile={pick} />);
    expect(screen.getByText('inbox.composer.capture.warn')).toBeTruthy();
    expect(screen.getByTestId('capture-img').getAttribute('src')).toBe('blob:x');
  });
});
