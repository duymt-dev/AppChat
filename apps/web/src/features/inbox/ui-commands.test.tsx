// UiCommand của inbox: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useInboxUiCommands } from './ui-commands';
import { useInboxUi } from './inbox-store';

describe('inbox ui-commands', () => {
  it('Hộp thư: prefill chọn hội thoại + điền composer (ghi chú), filter tab / kênh', () => {
    renderHook(() => useInboxUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'inbox.composer', values: { conversation_id: 'c_hieu', text: 'Dạ em gửi báo giá', note: true } });
    expect(useInboxUi.getState()).toMatchObject({ selectedId: 'c_hieu', draft: 'Dạ em gửi báo giá', composerMode: 'note' });
    dispatchUiCommand({ type: 'filter', table: 'conversations', filter: { tab: 'unread', channel: 'webchat' } });
    expect(useInboxUi.getState()).toMatchObject({ tab: 'unread', channel: 'webchat' });
  });
});
