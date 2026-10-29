// UiCommand của contracts: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useContractsUiCommands } from './ui-commands';
import { useContractsUi } from './contracts-store';

describe('contracts ui-commands', () => {
  it('prefill mở form tạo hợp đồng, open mở drawer, filter đổi chip', () => {
    const { unmount } = renderHook(() => useContractsUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'contract.form', values: { contact_id: 'ct_lan' } });
    expect(useContractsUi.getState()).toMatchObject({ form: 'create', prefill: { contact_id: 'ct_lan' } });
    dispatchUiCommand({ type: 'open', entity: 'contract', id: 'ctr_1180' });
    expect(useContractsUi.getState().detail).toBe('ctr_1180');
    dispatchUiCommand({ type: 'filter', table: 'contracts', filter: { status: 'pending' } });
    expect(useContractsUi.getState().filter.status).toBe('pending');
    unmount();
  });
});
