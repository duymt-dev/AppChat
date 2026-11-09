// TIP-033b §1.1 — chân drawer lịch hẹn: expired → gợi ý + Xác nhận lại (gửi if_version) + Huỷ; không có Đổi giờ / Khách đã đến.
// Chờ → Xác nhận gửi kèm if_version; không có quyền booking.manage → không hiện thao tác.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const run = vi.fn();
const set = vi.fn();
let can = true;
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: (id: string) => ({ run: (i: unknown) => run(id, i), isPending: false }) }));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => can }));
vi.mock('../calendar-store', () => ({ useCalendarUi: () => ({ set }) }));

import { App } from 'antd';
import { AppointmentFooter } from './AppointmentFooter';
import type { Appointment } from '../types';

const base = { id: 'ap_1', code: 'LH-1', status: 'expired', version: 3 } as Appointment;
const mount = (a: Appointment) => render(<App><AppointmentFooter a={a} /></App>);

describe('AppointmentFooter', () => {
  afterEach(() => {
    cleanup();
    run.mockReset();
    set.mockReset();
    can = true;
  });

  it('expired → Xác nhận lại gửi if_version; Huỷ mở hộp huỷ; không có Đổi giờ / Khách đã đến', () => {
    mount(base);
    expect(screen.getByTestId('cal-expired-hint').textContent).toBe('calendar.detail.expiredHint');
    expect(screen.queryByTestId('cal-reschedule')).toBeNull();
    expect(screen.queryByTestId('cal-checkin')).toBeNull();
    fireEvent.click(screen.getByTestId('cal-reconfirm'));
    expect(run).toHaveBeenCalledWith('appointment.confirm', { appointment_id: 'ap_1', if_version: 3 });
    fireEvent.click(screen.getByTestId('cal-expired-cancel'));
    expect(set).toHaveBeenCalledWith({ cancelFor: 'ap_1' });
  });

  it('chờ → Xác nhận gửi if_version', () => {
    mount({ ...base, status: 'pending' });
    fireEvent.click(screen.getByTestId('cal-confirm'));
    expect(run).toHaveBeenCalledWith('appointment.confirm', { appointment_id: 'ap_1', if_version: 3 });
  });

  it('không có quyền → không hiện thao tác', () => {
    can = false;
    mount(base);
    expect(screen.queryByTestId('cal-reconfirm')).toBeNull();
  });
});
