// TIP-003g: `useToday()` luôn trả ngày mới khi mở form sau 00:00 (và khi focus / qua nửa đêm) ở chế độ http,
// đồng thời giữ `MOCK_TODAY` cố định ở chế độ mock để parity không trôi.
import { createElement } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOCK_TODAY, todayIso, useToday } from './today';

function Probe({ id }: { id: string }) {
  const today = useToday();
  return createElement('span', { 'data-testid': id }, today);
}

describe('useToday (TIP-003g)', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('mock mode luôn giữ MOCK_TODAY ngay cả khi qua 00:00', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 14, 23, 59, 0));
    expect(todayIso()).toBe(MOCK_TODAY);
    render(createElement(Probe, { id: 'mock-probe' }));
    expect(screen.getByTestId('mock-probe').textContent).toBe(MOCK_TODAY);

    act(() => {
      vi.setSystemTime(new Date(2026, 6, 15, 0, 1, 0));
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByTestId('mock-probe').textContent).toBe(MOCK_TODAY);
  });

  it('http mode: tab nạp lúc 23:59 → mở form lúc 00:01 nhận ngày mới; form đang mở tự đổi khi qua 00:00 và khi focus', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_MODE', 'http');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 14, 23, 59, 0));

    // Form đang mở từ 23:59 ngày 14/07.
    render(createElement(Probe, { id: 'open-form' }));
    expect(screen.getByTestId('open-form').textContent).toBe('2026-07-14');

    // Qua 00:01 ngày 15/07 (timer nửa đêm kích hoạt cho form đang mở, và mount form mới như vừa bấm mở modal).
    await act(async () => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(screen.getByTestId('open-form').textContent).toBe('2026-07-15');

    render(createElement(Probe, { id: 'late-modal' }));
    expect(screen.getByTestId('late-modal').textContent).toBe('2026-07-15');

    // Khi đồng hồ chuyển sang 16/07 (vd. máy ngủ qua đêm) rồi tab focus lại → cập nhật ngay không cần remount.
    act(() => {
      vi.setSystemTime(new Date(2026, 6, 16, 9, 0, 0));
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByTestId('open-form').textContent).toBe('2026-07-16');
  });
});
