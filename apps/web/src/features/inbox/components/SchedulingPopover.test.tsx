// TIP-025b §E — popover Đặt lịch hẹn: chỉ khung giờ trống thật theo dịch vụ / ngày / nhân viên (thứ tự server, không nhãn "AI tốt nhất");
// chọn giờ mở form lịch hẹn chuẩn điền sẵn khách + hội thoại (không chèn câu "xác nhận lịch"); hội thoại chưa gắn khách không bịa khách;
// rỗng / lỗi có trạng thái riêng.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const paths: string[] = [];
let slots: unknown = { slots: [{ start: '09:00', end: '10:00', staff_ids: ['s1'] }, { start: '10:30', end: '11:30', staff_ids: ['s2', 's1'] }] };
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}` }));
vi.mock('@/shared/api/client', () => ({
  transport: {
    get: async (path: string, q?: unknown) => {
      paths.push(path + JSON.stringify(q ?? {}));
      if (path.startsWith('/calendar/meta')) return { today: '2026-11-07', services: [{ id: 'sv1', name: 'Gội', duration: 60 }], staff: [{ id: 's1', name: 'An' }, { id: 's2', name: 'Bình' }] };
      if (path.startsWith('/calendar/slots')) {
        if (slots instanceof Error) throw slots;
        return slots;
      }
      return null;
    },
  },
}));

import { useCalendarUi } from '@/features/calendar';
import { SchedulingPopover } from './SchedulingPopover';

const conv = (contact: string | null) => ({ id: 'c1', contact_id: contact }) as never;
const wrap = (contact: string | null, onInsert = vi.fn(), onClose = vi.fn()) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SchedulingPopover conv={conv(contact)} customer="Lan" onInsert={onInsert} onClose={onClose} /></QueryClientProvider>);

describe('SchedulingPopover', () => {
  afterEach(() => {
    cleanup();
    paths.length = 0;
    useCalendarUi.getState().set({ form: null, prefill: null } as never);
  });

  it('khung giờ trống thật theo thứ tự server, chọn giờ mở form lịch hẹn điền sẵn khách + hội thoại', async () => {
    const onInsert = vi.fn();
    const onClose = vi.fn();
    wrap('ct1', onInsert, onClose);
    await waitFor(() => expect(screen.getAllByTestId('sched-slot')).toHaveLength(2));
    expect(screen.getAllByTestId('sched-slot').map((b) => b.textContent)).toEqual(['09:00–10:00An', '10:30–11:30Bình, An']);
    expect(document.body.textContent).not.toMatch(/best|ai/);
    expect(paths.some((p) => p.includes('/calendar/slots') && p.includes('sv1') && p.includes('2026-11-07'))).toBe(true);
    fireEvent.click(screen.getAllByTestId('sched-slot')[1]!);
    fireEvent.click(screen.getByTestId('sched-book'));
    expect(useCalendarUi.getState().form).toBe('create');
    expect(useCalendarUi.getState().prefill).toMatchObject({ contact_id: 'ct1', conversation_id: 'c1', service_id: 'sv1', date: '2026-11-07', start: '10:30', staff_id: 's2' });
    expect(onInsert).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('hội thoại chưa gắn khách: không gửi contact_id; đề xuất giờ chỉ chèn câu hỏi vào nháp', async () => {
    const onInsert = vi.fn();
    wrap(null, onInsert);
    await waitFor(() => expect(screen.getAllByTestId('sched-slot')).toHaveLength(2));
    fireEvent.click(screen.getAllByTestId('sched-slot')[0]!);
    fireEvent.click(screen.getByTestId('sched-propose'));
    expect(onInsert.mock.calls[0]![0]).toContain('"time":"09:00"');
    fireEvent.click(screen.getByTestId('sched-book'));
    expect(useCalendarUi.getState().prefill).not.toHaveProperty('contact_id');
  });

  it('rỗng và lỗi có trạng thái riêng, nút đặt bị khoá', async () => {
    slots = { slots: [] };
    wrap('ct1');
    await waitFor(() => expect(screen.getByText('inbox.composer.sched.empty')).toBeTruthy());
    expect((screen.getByTestId('sched-book') as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    slots = new Error('boom');
    wrap('ct1');
    await waitFor(() => expect(screen.getByText('inbox.composer.sched.error')).toBeTruthy());
  });
});
