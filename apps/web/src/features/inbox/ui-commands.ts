// UiCommand của Hộp thư (frontend-structure §8): điền bản nháp composer, mở hội thoại, lọc theo tab / kênh.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useInboxUi } from './inbox-store';
import type { ChannelType } from './types';

export function useInboxUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type !== 'prefill') return;
    const s = useInboxUi.getState();
    if (cmd.values.conversation_id) s.select(String(cmd.values.conversation_id));
    s.set({ draft: String(cmd.values.text ?? ''), composerMode: cmd.values.note ? 'note' : 'reply' });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useInboxUi.getState().select(cmd.id);
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type !== 'filter') return;
    const f = cmd.filter;
    useInboxUi.getState().set({
      ...(f.tab ? { tab: String(f.tab) } : {}),
      ...(f.channel !== undefined ? { channel: (f.channel || null) as ChannelType | null } : {}),
    });
  }, []);
  useUiCommand('prefill:inbox.composer', prefill);
  useUiCommand('open:conversation', open);
  useUiCommand('filter:conversations', filter);
}
