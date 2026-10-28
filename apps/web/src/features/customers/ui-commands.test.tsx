// UiCommand của customers: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useCustomersUiCommands } from './ui-commands';
import { useCrmUi } from './crm-store';

describe('customers ui-commands', () => {
  it('Khách hàng: prefill mở form tạo với giá trị điền sẵn, open mở 360°, filter đổi bộ lọc', () => {
    const { unmount } = renderHook(() => useCustomersUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'contact.form', values: { full_name: 'Chị Lan', phone: '0987' } });
    expect(useCrmUi.getState()).toMatchObject({ modal: 'create', prefill: { full_name: 'Chị Lan', phone: '0987' } });
    dispatchUiCommand({ type: 'prefill', form: 'contact.form', values: { contact_id: 'ct_1', city: 'HN' } });
    expect(useCrmUi.getState()).toMatchObject({ modal: 'edit', target: 'ct_1', prefill: { city: 'HN' } });
    dispatchUiCommand({ type: 'open', entity: 'contact', id: 'ct_2' });
    expect(useCrmUi.getState().detail).toBe('ct_2');
    dispatchUiCommand({ type: 'filter', table: 'contacts', filter: { stage: 'lead', mine: true } });
    expect(useCrmUi.getState().filter).toMatchObject({ stage: 'lead', mine: true });
    unmount();
    expect(dispatchUiCommand({ type: 'open', entity: 'contact', id: 'x' })).toBe(false);
  });
});
