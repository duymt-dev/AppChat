// UiCommand của assistant: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useAssistantUiCommands } from './ui-commands';
import { useAssistantUi } from './assistant-store';

describe('assistant ui-commands', () => {
  it('Trợ lý: prefill mở modal tạo tác vụ, điền ô chat, open mở drawer tác vụ', () => {
    renderHook(() => useAssistantUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'ai_task.form', values: { name: 'Nhắc công nợ', tier: 'max' } });
    expect(useAssistantUi.getState()).toMatchObject({ taskNew: true, taskPrefill: { name: 'Nhắc công nợ', tier: 'max' } });
    dispatchUiCommand({ type: 'prefill', form: 'assistant.composer', values: { text: 'Tóm tắt hôm nay' } });
    expect(useAssistantUi.getState().draft).toBe('Tóm tắt hôm nay');
    dispatchUiCommand({ type: 'open', entity: 'ai_task', id: 'tk_2' });
    expect(useAssistantUi.getState().taskOpen).toBe('tk_2');
  });
});
