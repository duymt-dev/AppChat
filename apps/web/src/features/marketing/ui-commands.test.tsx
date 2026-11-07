// UiCommand của marketing: Trợ lý phát lệnh → state màn đổi đúng (prefill wizard / mở chi tiết / lọc).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useMarketingUiCommands } from './ui-commands';
import { useMarketingUi } from './marketing-store';

describe('marketing ui-commands', () => {
  it('prefill mở wizard, open mở chi tiết, filter đổi kênh + trạng thái', () => {
    const { unmount } = renderHook(() => useMarketingUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'campaign.form', values: { name: 'Win-back', channel: 'email' } });
    expect(useMarketingUi.getState()).toMatchObject({ wizard: true, prefill: { name: 'Win-back', channel: 'email' } });
    dispatchUiCommand({ type: 'open', entity: 'campaign', id: 'cp_2101' });
    expect(useMarketingUi.getState().detail).toBe('cp_2101');
    dispatchUiCommand({ type: 'filter', table: 'campaigns', filter: { channel: 'zalo', status: 'running' } });
    expect(useMarketingUi.getState().filter).toMatchObject({ channel: 'zalo', status: 'running' });
    unmount();
  });
});
