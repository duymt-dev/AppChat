// UiCommand của customers: Trợ lý phát lệnh → state màn đổi đúng (open / filter theo màn; prefill = hàm toàn cục ở FormCommandHost).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { prefillContactForm, useCustomersUiCommands } from './ui-commands';
import { useContactEditUi } from '@/shared/crm-forms/contact-edit-command';
import { useCrmUi } from './crm-store';

describe('customers ui-commands', () => {
  it('Khách hàng: prefill mở form tạo với giá trị điền sẵn, open mở 360°, filter đổi bộ lọc', () => {
    const { unmount } = renderHook(() => useCustomersUiCommands());
    prefillContactForm({ type: 'prefill', form: 'contact.form', values: { full_name: 'Chị Lan', phone: '0987' } });
    expect(useCrmUi.getState()).toMatchObject({ modal: 'create', prefill: { full_name: 'Chị Lan', phone: '0987' } });
    // Có contact_id → form sửa toàn cục (edit-context mới), không phải modal của màn.
    prefillContactForm({ type: 'prefill', form: 'contact.form', values: { contact_id: 'ct_1', city: 'HN' } });
    expect(useContactEditUi.getState().target).toEqual({ contactId: 'ct_1', mode: 'edit' });
    dispatchUiCommand({ type: 'open', entity: 'contact', id: 'ct_2' });
    expect(useCrmUi.getState().detail).toBe('ct_2');
    dispatchUiCommand({ type: 'filter', table: 'contacts', filter: { stage: 'lead', mine: true } });
    expect(useCrmUi.getState().filter).toMatchObject({ stage: 'lead', mine: true });
    unmount();
    expect(dispatchUiCommand({ type: 'open', entity: 'contact', id: 'x' })).toBe(false);
  });
});

describe('customers highlight (REQ-E05b)', () => {
  it('highlight contact:<id> → state; đổi bộ lọc bỏ highlight; target lạ bỏ qua', () => {
    const { unmount } = renderHook(() => useCustomersUiCommands());
    dispatchUiCommand({ type: 'highlight', target: 'contact:ct_lan' });
    expect(useCrmUi.getState().highlight).toBe('ct_lan');
    useCrmUi.getState().setFilter({ q: 'x' });
    expect(useCrmUi.getState().highlight).toBeNull();
    dispatchUiCommand({ type: 'highlight', target: 'quote:q1' });
    expect(useCrmUi.getState().highlight).toBeNull();
    unmount();
  });
});
