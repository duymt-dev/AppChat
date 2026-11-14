// UiCommand của calendar: Trợ lý phát lệnh → state màn đổi đúng (open / filter theo màn; prefill = hàm đăng ký toàn cục ở FormCommandHost).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { prefillCalendarForm, useCalendarUiCommands } from './ui-commands';
import { useCalendarUi } from './calendar-store';

describe('calendar ui-commands', () => {
  it('prefill mở form tạo lịch, open mở drawer, filter đổi trạng thái', () => {
    const { unmount } = renderHook(() => useCalendarUiCommands());
    prefillCalendarForm({ type: 'prefill', form: 'appointment.form', values: { service_id: 'sv1' } });
    expect(useCalendarUi.getState()).toMatchObject({ form: 'create', prefill: { service_id: 'sv1' } });
    dispatchUiCommand({ type: 'open', entity: 'appointment', id: 'ap_1215' });
    expect(useCalendarUi.getState().detail).toBe('ap_1215');
    dispatchUiCommand({ type: 'filter', table: 'calendar', filter: { status: 'pending' } });
    expect(useCalendarUi.getState().filter.status).toBe('pending');
    unmount();
  });
});
