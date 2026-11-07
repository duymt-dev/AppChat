// UiCommand của loyalty: Trợ lý phát lệnh → state màn đổi đúng (mở thành viên / mở điều chỉnh điểm / lọc hạng).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useLoyaltyUiCommands } from './ui-commands';
import { useLoyaltyUi } from './loyalty-store';

describe('loyalty ui-commands', () => {
  it('open mở drawer thành viên, prefill mở hộp điều chỉnh với SĐT, filter đổi hạng', () => {
    const { unmount } = renderHook(() => useLoyaltyUiCommands());
    dispatchUiCommand({ type: 'open', entity: 'loyalty_member', id: 'ct_lan' });
    expect(useLoyaltyUi.getState().detail).toBe('ct_lan');
    dispatchUiCommand({ type: 'prefill', form: 'loyalty.adjust', values: { phone: '0903 123 456' } });
    expect(useLoyaltyUi.getState()).toMatchObject({ adjust: true, adjustFor: '0903 123 456' });
    dispatchUiCommand({ type: 'filter', table: 'loyalty_members', filter: { tier: 'gold' } });
    expect(useLoyaltyUi.getState().filter.tier).toBe('gold');
    unmount();
  });
});
