// UiCommand của tickets: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useTicketsUiCommands } from './ui-commands';
import { useTicketsUi } from './tickets-store';

describe('tickets ui-commands', () => {
  it('prefill mở form tạo ticket, open mở drawer, filter đổi bộ lọc SLA', () => {
    const { unmount } = renderHook(() => useTicketsUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'ticket.form', values: { title: 'Hoàn tiền' } });
    expect(useTicketsUi.getState()).toMatchObject({ form: true, prefill: { title: 'Hoàn tiền' } });
    dispatchUiCommand({ type: 'open', entity: 'ticket', id: 'tk_2041' });
    expect(useTicketsUi.getState().detail).toBe('tk_2041');
    dispatchUiCommand({ type: 'filter', table: 'tickets', filter: { sla: 'breach' } });
    expect(useTicketsUi.getState().filter.sla).toBe('breach');
    unmount();
  });
});
