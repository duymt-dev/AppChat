// TIP-045b A2: bộ lọc audit — ô trống không gửi; ngày → ISO đầu ngày / đầu ngày kế (khoảng nửa mở); đặt / xoá lọc.
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { toAuditFilter, useAuditFilters } from './useAuditFilters';

describe('useAuditFilters', () => {
  it('ô trống bỏ; khoảng ngày nửa mở', () => {
    expect(toAuditFilter({ actor: '', action: '', status: '', from: '', to: '' })).toEqual({});
    const f = toAuditFilter({ actor: '', action: 'security', status: 'warn', from: '2026-11-01', to: '2026-11-01' });
    expect(f).toMatchObject({ action: 'security', status: 'warn' });
    expect(new Date(f.to!).getTime() - new Date(f.from!).getTime()).toBe(86_400_000);
  });

  it('set / reset + active', () => {
    const { result } = renderHook(() => useAuditFilters());
    expect(result.current.active).toBe(false);
    act(() => result.current.set({ status: 'ok' }));
    expect([result.current.active, result.current.filter]).toEqual([true, { status: 'ok' }]);
    act(() => result.current.reset());
    expect(result.current.filter).toEqual({});
  });
});
