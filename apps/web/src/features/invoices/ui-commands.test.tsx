// UiCommand của invoices: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useInvoicesUiCommands } from './ui-commands';
import { useInvoicesUi } from './invoices-store';

describe('invoices ui-commands', () => {
  it('prefill mở form tạo đề nghị, open mở drawer, filter đổi ô tìm', () => {
    const { unmount } = renderHook(() => useInvoicesUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'invoice.form', values: { order_id: 'ord_290411' } });
    expect(useInvoicesUi.getState()).toMatchObject({ form: 'create', prefill: { order_id: 'ord_290411' } });
    dispatchUiCommand({ type: 'open', entity: 'invoice', id: 'inv_2039' });
    expect(useInvoicesUi.getState().detail).toBe('inv_2039');
    dispatchUiCommand({ type: 'filter', table: 'invoices', filter: { q: 'bảo an' } });
    expect(useInvoicesUi.getState().q).toBe('bảo an');
    unmount();
  });
});
