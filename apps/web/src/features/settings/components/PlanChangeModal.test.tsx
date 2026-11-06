// TIP-039 pha 3 (AC03 / AC09): hộp xác nhận gói hiện đúng cách tính theo giá server (`/billing/quote`) — nâng giữa kỳ (chênh + giữ ngày
// hết hạn), đổi xuống từ kỳ sau, gia hạn; hoá đơn chờ được dùng lại; lỗi đọc giá → báo, không cho mua; xác nhận mới gọi mua.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const get = vi.fn();
const buy = vi.fn();
vi.mock('@/shared/api/client', () => ({ transport: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('../hooks/useBuy', () => ({ useBuy: () => ({ buy, pending: false }) }));
vi.mock('@/shared/i18n/useFmt', () => ({
  useFmt: () => ({ date: (d: string) => `D(${d})`, money: (v: string) => `M(${v})`, number: (n: number) => String(n) }),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k),
}));

import { useBillingUi } from '../billing-store';
import { PlanChangeModal } from './PlanChangeModal';

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);
const NAMES: Record<string, string> = { team: 'Team', business: 'Business' };
const names = (k: string) => NAMES[k] ?? k;
const Q = { credits: null, months: 1, starts_at: null, ends_at: null, from_plan_key: null, open: null };

beforeEach(() => {
  get.mockReset();
  buy.mockReset();
  useBillingUi.setState({ planChange: 'business' });
});
afterEach(cleanup);

describe('PlanChangeModal', () => {
  it('nâng giữa kỳ: chênh theo kỳ còn lại, giữ ngày hết hạn, Credit chênh; xác nhận → mua đúng gói', async () => {
    get.mockResolvedValue({ ...Q, mode: 'upgrade', amount: '450000', credits: 2500, from_plan_key: 'team', ends_at: '2027-05-01T00:00:00.000Z' });
    render(<PlanChangeModal planName={names} />, { wrapper: wrap });
    const mode = await screen.findByTestId('plan-change-mode');
    expect(mode.dataset.mode).toBe('upgrade');
    expect(mode.textContent).toContain('"from":"Team"');
    expect(mode.textContent).toContain('D(2027-05-01');
    expect(screen.getByTestId('plan-change-amount').textContent).toContain('M(450000)');
    expect(screen.getByTestId('plan-change-amount').textContent).toContain('"n":"2500"');
    expect(get).toHaveBeenCalledWith('/billing/quote', { kind: 'plan', item: 'business' });
    await act(async () => void fireEvent.click(screen.getByTestId('plan-change-modal-save')));
    expect(buy).toHaveBeenCalledWith('plan', 'business');
    expect(useBillingUi.getState().planChange).toBeNull();
  });

  it('đổi xuống từ kỳ sau + hoá đơn chờ dùng lại', async () => {
    get.mockResolvedValue({ ...Q, mode: 'switch', amount: '990000', starts_at: '2027-05-01T00:00:00.000Z', open: { id: 'i1', code: 'INV-1' } });
    render(<PlanChangeModal planName={names} />, { wrapper: wrap });
    expect((await screen.findByTestId('plan-change-mode')).dataset.mode).toBe('switch');
    expect(screen.getByTestId('plan-change-reuse').textContent).toContain('INV-1');
  });

  it('lỗi đọc giá → báo lỗi, nút xác nhận tắt, không mua', async () => {
    get.mockRejectedValue(new Error('down'));
    render(<PlanChangeModal planName={names} />, { wrapper: wrap });
    expect(await screen.findByTestId('plan-change-error')).toBeTruthy();
    expect((screen.getByTestId('plan-change-modal-save') as HTMLButtonElement).disabled).toBe(true);
    expect(buy).not.toHaveBeenCalled();
  });
});
