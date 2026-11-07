// TIP-039 pha 2 (AC06): useAction 402 CREDIT_EXHAUSTED → thông báo ví (PLAN_LIMIT_REACHED không); BillingNoticeHost: người có
// billing.manage thấy Nạp Credit, người khác chỉ nhắc liên hệ Chủ sở hữu; event hết Credit đến trễ khi ví đã > 0 → không hiện.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiRequestError } from '@appchat/shared';

const action = vi.fn();
const get = vi.fn();
let can = true;
vi.mock('../api/client', () => ({
  transport: { action: (...a: unknown[]) => action(...a), get: (...a: unknown[]) => get(...a) },
}));
vi.mock('../api/transport', () => ({ apiMode: () => 'mock' }));
vi.mock('../api/mock/store', () => ({ onMockEvent: () => () => undefined }));
vi.mock('../api/http-transport', () => ({
  sessionAuth: () => ({ token: null, workspace_id: null }),
  onSessionChange: () => () => undefined,
}));
vi.mock('../realtime/socket', () => ({ subscribeRealtime: () => () => undefined }));
vi.mock('../authz/useCan', () => ({ useCan: () => can }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('../actions/confirm-store', () => ({
  useConfirmStore: (sel: (s: { ask: () => void }) => unknown) => sel({ ask: vi.fn() }),
}));
vi.mock('antd', () => ({
  App: { useApp: () => ({ message: { info: vi.fn(), open: vi.fn(), error: vi.fn() } }) },
  Modal: ({
    children,
    title,
    okButtonProps,
  }: {
    children: ReactNode;
    title: string;
    okButtonProps?: { style?: { display?: string } };
  }) => (
    <div data-testid="billing-notice">
      <h2>{title}</h2>
      {okButtonProps?.style?.display === 'none' ? null : (
        <button data-testid="billing-notice-topup">topup</button>
      )}
      {children}
    </div>
  ),
}));

import { useAction } from '../actions/useAction';
import { BillingNoticeHost, pushChecked } from './BillingNoticeHost';
import { useBillingNotices } from './billing-notices';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  useBillingNotices.setState({ current: null, seen: [] });
  action.mockReset();
  get.mockReset();
  can = true;
});

describe('useAction → thông báo ví', () => {
  it('402 CREDIT_EXHAUSTED → thông báo hết; PLAN_LIMIT_REACHED → không', async () => {
    const { result } = renderHook(() => useAction('agent.test'), { wrapper });
    action.mockRejectedValueOnce(new ApiRequestError(402, { code: 'PLAN_LIMIT_REACHED', message: 'x' }));
    await act(() => result.current.run({}));
    expect(useBillingNotices.getState().current).toBeNull();
    action.mockRejectedValueOnce(new ApiRequestError(402, { code: 'CREDIT_EXHAUSTED', message: 'x' }));
    await act(() => result.current.run({}));
    expect(useBillingNotices.getState().current).toMatchObject({ kind: 'exhausted', workspace: 'mock' });
  });
});

describe('BillingNoticeHost', () => {
  it('Owner / billing.manage thấy Nạp Credit; người khác chỉ nhắc liên hệ Chủ sở hữu', () => {
    useBillingNotices.setState({
      current: { kind: 'exhausted', key: 'e1', workspace: 'mock' },
      seen: ['e1'],
    });
    const a = render(<BillingNoticeHost />, { wrapper });
    expect(screen.getByTestId('billing-notice-topup')).toBeTruthy();
    expect(screen.queryByTestId('billing-notice-ask-owner')).toBeNull();
    a.unmount();
    can = false;
    render(<BillingNoticeHost />, { wrapper });
    expect(screen.queryByTestId('billing-notice-topup')).toBeNull();
    expect(screen.getByTestId('billing-notice-ask-owner')).toBeTruthy();
  });

  it('event hết Credit đến trễ khi ví đã > 0 → không hiện; restored chỉ khi ví > 0', async () => {
    get.mockResolvedValue({ plan_balance: 0, topup_balance: 500 });
    await pushChecked({ kind: 'exhausted', key: 'late', workspace: 'mock' });
    expect(useBillingNotices.getState().current).toBeNull();
    get.mockResolvedValue({ plan_balance: 0, topup_balance: 0 });
    await pushChecked({ kind: 'exhausted', key: 'e2', workspace: 'mock' });
    expect(useBillingNotices.getState().current?.kind).toBe('exhausted');
    await pushChecked({ kind: 'restored', key: 'e3', workspace: 'mock' });
    expect(useBillingNotices.getState().current?.kind).toBe('exhausted');
    get.mockResolvedValue({ plan_balance: 10, topup_balance: 0 });
    await pushChecked({ kind: 'restored', key: 'e4', workspace: 'mock' });
    expect(useBillingNotices.getState().current?.kind).toBe('restored');
  });
});
