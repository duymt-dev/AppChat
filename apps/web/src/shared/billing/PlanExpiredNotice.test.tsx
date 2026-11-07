// TIP-039 pha 3 (AC09): gói trả phí hết hạn → popup thật (gia hạn cho billing.manage, nhắc Chủ sở hữu cho người khác, ngày giữ dữ liệu);
// gói còn hạn / dùng thử không hiện; đóng rồi không bật lại cùng kỳ hết hạn.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const get = vi.fn();
const push = vi.fn();
let can = true;
vi.mock('../api/client', () => ({ transport: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('../authz/useCan', () => ({ useCan: () => can }));
vi.mock('../i18n/useFmt', () => ({ useFmt: () => ({ date: (d: string) => `D(${d})` }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('antd', () => ({
  Modal: ({
    children,
    onOk,
    onCancel,
    okButtonProps,
  }: {
    children: ReactNode;
    onOk: () => void;
    onCancel: () => void;
    okButtonProps?: { style?: { display?: string } };
  }) => (
    <div data-testid="plan-expired">
      {okButtonProps?.style?.display === 'none' ? null : <button data-testid="renew" onClick={onOk} />}
      <button data-testid="close" onClick={onCancel} />
      {children}
    </div>
  ),
}));

import { PlanExpiredNotice } from './PlanExpiredNotice';

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
const EXPIRED = { plan_name: 'Team', status: 'expired', expires_at: '2027-04-01', retain_until: '2027-05-01' };

beforeEach(() => {
  get.mockReset();
  push.mockReset();
  can = true;
  sessionStorage.clear();
});
afterEach(cleanup);

describe('PlanExpiredNotice', () => {
  it('hết hạn → popup có ngày giữ dữ liệu; Gia hạn → Gói & thanh toán mở Nâng cấp', async () => {
    get.mockResolvedValue(EXPIRED);
    render(<PlanExpiredNotice />, { wrapper: wrap });
    expect((await screen.findByTestId('plan-expired-retain')).textContent).toBe('retain');
    act(() => screen.getByTestId('renew').click());
    expect(push).toHaveBeenCalledWith('/settings/billing?upgrade=1');
    expect(screen.queryByTestId('plan-expired')).toBeNull();
  });

  it('không có billing.manage → không có Gia hạn, nhắc Chủ sở hữu', async () => {
    can = false;
    get.mockResolvedValue(EXPIRED);
    render(<PlanExpiredNotice />, { wrapper: wrap });
    expect(await screen.findByTestId('plan-expired-ask-owner')).toBeTruthy();
    expect(screen.queryByTestId('renew')).toBeNull();
  });

  it('còn hạn → không hiện; đã đóng cùng kỳ → không bật lại', async () => {
    get.mockResolvedValue({ ...EXPIRED, status: 'active' });
    const a = render(<PlanExpiredNotice />, { wrapper: wrap });
    await act(async () => undefined);
    expect(screen.queryByTestId('plan-expired')).toBeNull();
    a.unmount();
    get.mockResolvedValue(EXPIRED);
    const b = render(<PlanExpiredNotice />, { wrapper: wrap });
    await screen.findByTestId('plan-expired');
    act(() => screen.getByTestId('close').click());
    b.unmount();
    render(<PlanExpiredNotice />, { wrapper: wrap });
    await act(async () => undefined);
    expect(screen.queryByTestId('plan-expired')).toBeNull();
  });
});
