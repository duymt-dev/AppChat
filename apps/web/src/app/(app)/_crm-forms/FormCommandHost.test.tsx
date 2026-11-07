// TIP-025b §D.3 — FormCommandHost: chỉ host toàn cục (không mount màn domain) mà 6 lệnh `prefill:*.form` của Trợ lý vẫn mở đúng form với
// ngữ cảnh (khách + hội thoại); một handler mỗi lệnh; gỡ host → lệnh không còn ai nhận.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useContactEditUi } from '@/shared/crm-forms/contact-edit-command';
import { useQuotesUi } from '@/features/quotes';
import { useContractsUi } from '@/features/contracts';
import { useOrdersUi } from '@/features/orders';
import { useTicketsUi } from '@/features/tickets';
import { useCalendarUi } from '@/features/calendar';
import { FormCommandHost } from './FormCommandHost';

const ctx = { contact_id: 'ct_lan', conversation_id: 'c_lan' };

describe('FormCommandHost', () => {
  it('6 lệnh điền form chạy khi chỉ có host toàn cục; giữ ngữ cảnh hội thoại', () => {
    const { unmount } = render(<FormCommandHost />);
    expect(dispatchUiCommand({ type: 'prefill', form: 'quote.form', values: ctx })).toBe(true);
    expect(useQuotesUi.getState()).toMatchObject({ form: 'create', prefill: ctx });
    dispatchUiCommand({ type: 'prefill', form: 'contract.form', values: ctx });
    expect(useContractsUi.getState()).toMatchObject({ form: 'create', prefill: ctx });
    dispatchUiCommand({ type: 'prefill', form: 'order.form', values: ctx });
    expect(useOrdersUi.getState()).toMatchObject({ form: 'create', prefill: ctx });
    dispatchUiCommand({ type: 'prefill', form: 'ticket.form', values: { ...ctx, source_message_id: 'm7' } });
    expect(useTicketsUi.getState()).toMatchObject({ form: true, prefill: { ...ctx, source_message_id: 'm7' } });
    dispatchUiCommand({ type: 'prefill', form: 'appointment.form', values: ctx });
    expect(useCalendarUi.getState()).toMatchObject({ form: 'create', prefill: ctx });
    dispatchUiCommand({ type: 'prefill', form: 'contact.form', values: { contact_id: 'ct_lan', version: 1 } });
    expect(useContactEditUi.getState().target).toEqual({ contactId: 'ct_lan', mode: 'edit' });
    unmount();
    expect(dispatchUiCommand({ type: 'prefill', form: 'quote.form', values: ctx })).toBe(false);
  });
});
