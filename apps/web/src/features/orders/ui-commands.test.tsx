// UiCommand của orders: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useOrdersUiCommands } from './ui-commands';
import { useOrdersUi } from './orders-store';

describe('orders ui-commands', () => {
  it('prefill mở form tạo đơn, open mở drawer, filter đổi chip', () => {
    const { unmount } = renderHook(() => useOrdersUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'order.form', values: { contact_id: 'ct_lan' } });
    expect(useOrdersUi.getState()).toMatchObject({ form: 'create', prefill: { contact_id: 'ct_lan' } });
    dispatchUiCommand({ type: 'open', entity: 'order', id: 'ord_290411' });
    expect(useOrdersUi.getState().detail).toBe('ord_290411');
    dispatchUiCommand({ type: 'filter', table: 'orders', filter: { chip: 'pending' } });
    expect(useOrdersUi.getState().filter.chip).toBe('pending');
    unmount();
  });
});
