// TIP-032c §4.1: giữ đúng version của bản ghi đã mở; 409 STALE_VERSION → xung đột (bỏ toast chung), lỗi khác không nuốt; "Tải lại" chỉ
// làm mới truy vấn bản ghi đó rồi tắt xung đột (không tự gửi lại).
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiRequestError } from '@appchat/shared';
import { useOrderEditVersion } from './useOrderEditVersion';

const setup = () => {
  const qc = new QueryClient();
  const inv = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { inv, ...renderHook(() => useOrderEditVersion('x1', 4), { wrapper }) };
};

describe('useOrderEditVersion', () => {
  it('ifVersion = version đã mở', () => {
    expect(setup().result.current.ifVersion).toBe(4);
  });

  it('409 STALE_VERSION → conflict; lỗi khác để toast chung', () => {
    const { result } = setup();
    let handled = false;
    act(() => {
      handled = result.current.onError(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'v' }));
    });
    expect(handled).toBe(true);
    expect(result.current.conflict).toBe(true);
    expect(result.current.onError(new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'x' }))).toBe(false);
  });

  it('Tải lại: làm mới đúng bản ghi rồi tắt xung đột', async () => {
    const { result, inv } = setup();
    act(() => void result.current.onError(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'v' })));
    await act(() => result.current.reload());
    expect(inv).toHaveBeenCalledWith({ queryKey: ['orders', 'one', 'x1'] });
    expect(result.current.conflict).toBe(false);
  });
});
