// TIP-033c §2.3 (unit): thẻ hiển thị giá / thuế / tổng từ DTO server; không có quyền tạo → không nút; bấm tạo → trạng thái chờ xác nhận;
// biên nhận 200 → "đã tạo" / "đã có đơn" (reused) + mở đơn; 409 → "đã đổi" + đọc lại, 404 → "không còn khả dụng"; huỷ xem trước (run null)
// → về nút tạo, không báo thành công; rỗng → không hiện gì.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiRequestError } from '@appchat/shared';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v?.code ? `:${v.code}` : ''}` }));
vi.mock('../i18n/useFmt', () => ({ useFmt: () => ({ money: (v: string) => `${v}₫`, date: () => 'd', time: () => 't' }) }));
const action = vi.fn();
vi.mock('../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a) } }));
const run = vi.fn();
vi.mock('../actions/useAction', () => ({ useAction: () => ({ run, isPending: false, accepted: null }) }));

import { AppointmentOrderCards } from './AppointmentOrderCard';
import type { OrderSuggestion } from './types';

afterEach(() => {
  cleanup();
  action.mockReset();
  run.mockReset();
});

const card = (o: Partial<OrderSuggestion> = {}): OrderSuggestion => ({
  appointment_id: 'a1',
  code: 'LH-1',
  revision: '1.1.1',
  conversation_id: null,
  service_id: 's1',
  service_name: 'Gội',
  start_at: '2026-06-24T10:00:00+07:00',
  end_at: '2026-06-24T11:00:00+07:00',
  unit_price: '300000',
  tax_rate: 8,
  tax_total: '24000',
  total: '324000',
  can_create: true,
  ...o,
});
const page = (data: OrderSuggestion[]) => action.mockResolvedValue({ status: 200, data: { result: { data, next_cursor: null } } });
const mount = (open = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AppointmentOrderCards source={{ appointmentId: 'a1' }} onOpenOrder={open} />
    </QueryClientProvider>,
  );

describe('AppointmentOrderCards', () => {
  it('giá / thuế / tổng từ DTO; đọc qua action gợi ý theo đúng lịch', async () => {
    page([card()]);
    mount();
    expect((await screen.findByTestId('appt-order-total')).textContent).toContain('324000₫');
    expect(action).toHaveBeenCalledWith('appointment.order_suggestions', { appointment_id: 'a1' });
  });

  it('rỗng → không hiện; không có quyền tạo → không nút tạo', async () => {
    page([]);
    const { container } = mount();
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="appt-order-card"]')).toBeNull();
    cleanup();
    page([card({ can_create: false })]);
    mount();
    expect(await screen.findByTestId('appt-order-noright')).toBeTruthy();
    expect(screen.queryByTestId('appt-order-create')).toBeNull();
  });

  it('xác nhận → biên nhận "đã tạo" + mở đơn; reused → "đã có đơn"', async () => {
    page([card()]);
    run.mockResolvedValue({ result: { order_id: 'o1', code: 'DH-1', reused: false } });
    const open = vi.fn();
    mount(open);
    fireEvent.click(await screen.findByTestId('appt-order-create'));
    expect((await screen.findByTestId('appt-order-created')).textContent).toContain('calendar.orderCard.created:DH-1');
    fireEvent.click(screen.getByTestId('appt-order-open'));
    expect(open).toHaveBeenCalledWith('o1');
    expect(run).toHaveBeenCalledWith({ appointment_id: 'a1' }, expect.anything());
    cleanup();
    page([card()]);
    run.mockResolvedValue({ result: { order_id: 'o1', code: 'DH-1', reused: true } });
    mount();
    fireEvent.click(await screen.findByTestId('appt-order-create'));
    expect((await screen.findByTestId('appt-order-created')).textContent).toContain('calendar.orderCard.reused:DH-1');
  });

  it('409 → "đã đổi" (đọc lại); 404 → "không còn khả dụng"; huỷ xem trước → về nút tạo, không báo đã tạo', async () => {
    page([card()]);
    run.mockImplementation(async (_i: unknown, o: { onError: (e: ApiRequestError) => boolean }) => (o.onError(new ApiRequestError(409, { code: 'CONFLICT', message: '' })), null));
    mount();
    fireEvent.click(await screen.findByTestId('appt-order-create'));
    expect(await screen.findByTestId('appt-order-changed')).toBeTruthy();
    await waitFor(() => expect(action.mock.calls.length).toBeGreaterThan(1));
    cleanup();
    page([card()]);
    run.mockImplementation(async (_i: unknown, o: { onError: (e: ApiRequestError) => boolean }) => (o.onError(new ApiRequestError(404, { code: 'NOT_FOUND', message: '' })), null));
    mount();
    fireEvent.click(await screen.findByTestId('appt-order-create'));
    expect(await screen.findByTestId('appt-order-unavailable')).toBeTruthy();
    cleanup();
    page([card()]);
    run.mockResolvedValue(null);
    mount();
    fireEvent.click(await screen.findByTestId('appt-order-create'));
    await waitFor(() => expect((screen.getByTestId('appt-order-create')).textContent).toContain('calendar.orderCard.create'));
    expect(screen.queryByTestId('appt-order-created')).toBeNull();
  });
});
