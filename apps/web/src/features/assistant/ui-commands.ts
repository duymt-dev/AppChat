// UiCommand của Trợ lý / Coworks (frontend-structure §8): điền form tạo tác vụ, mở drawer tác vụ, điền ô chat.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useAssistantUi } from './assistant-store';

export function useAssistantUiCommands() {
  const prefillTask = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') useAssistantUi.getState().set({ taskPrefill: cmd.values, taskNew: true });
  }, []);
  const prefillChat = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') useAssistantUi.getState().set({ draft: String(cmd.values.text ?? '') });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useAssistantUi.getState().set({ taskOpen: cmd.id });
  }, []);
  useUiCommand('prefill:ai_task.form', prefillTask);
  useUiCommand('prefill:assistant.composer', prefillChat);
  useUiCommand('open:ai_task', open);
}
