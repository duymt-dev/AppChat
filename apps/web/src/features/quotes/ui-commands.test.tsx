// UiCommand của quotes: Trợ lý phát lệnh → state màn đổi đúng (open / filter theo màn; prefill = hàm đăng ký toàn cục ở FormCommandHost).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { prefillQuotesForm, useQuotesUiCommands } from './ui-commands';
import { useQuotesUi } from './quotes-store';

describe('quotes ui-commands', () => {
  it('prefill mở form tạo báo giá, open mở drawer, filter đổi trạng thái', () => {
    const { unmount } = renderHook(() => useQuotesUiCommands());
    prefillQuotesForm({ type: 'prefill', form: 'quote.form', values: { contact_id: 'ct_lan' } });
    expect(useQuotesUi.getState()).toMatchObject({ form: 'create', prefill: { contact_id: 'ct_lan' } });
    dispatchUiCommand({ type: 'open', entity: 'quote', id: 'q_2041' });
    expect(useQuotesUi.getState().detail).toBe('q_2041');
    dispatchUiCommand({ type: 'filter', table: 'quotes', filter: { status: 'sent' } });
    expect(useQuotesUi.getState().filter.status).toBe('sent');
    unmount();
  });
});
