// UiCommand của Cài đặt: mở mục (kể cả alias cũ), điền sẵn hộp mời thành viên, lọc thành viên.
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useSettingsUiCommands } from './ui-commands';
import { useSettingsUi } from './settings-store';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('settings ui-commands', () => {
  it('open điều hướng mục registry, prefill mở hộp mời, filter đổi ô tìm', () => {
    const { unmount } = renderHook(() => useSettingsUiCommands());
    dispatchUiCommand({ type: 'open', entity: 'settings', id: 'canned-replies' });
    expect(push).toHaveBeenCalledWith('/settings/replies');
    dispatchUiCommand({ type: 'open', entity: 'settings', id: 'không-có' });
    expect(push).toHaveBeenLastCalledWith('/settings/general');
    dispatchUiCommand({ type: 'prefill', form: 'member.invite', values: { email: 'lan@spa.vn', role: 'owner' } });
    expect(useSettingsUi.getState().memberModal).toEqual({ name: '', email: 'lan@spa.vn', role: 'sales' });
    dispatchUiCommand({ type: 'filter', table: 'members', filter: { q: 'trâm' } });
    expect(useSettingsUi.getState().memberQ).toBe('trâm');
    unmount();
  });
});
