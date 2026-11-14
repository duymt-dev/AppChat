// UiCommand của Khách thân thiết (frontend-structure §8): mở thành viên, mở hộp điều chỉnh điểm (điền SĐT), lọc theo hạng.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useLoyaltyUi } from './loyalty-store';
import type { MemberFilter } from './types';

export function useLoyaltyUiCommands() {
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useLoyaltyUi.getState().set({ detail: cmd.id, tab: 'overview' });
  }, []);
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') {
      const phone = typeof cmd.values.phone === 'string' ? cmd.values.phone : null;
      useLoyaltyUi.getState().set({ adjust: true, adjustFor: phone });
    }
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useLoyaltyUi.getState().setFilter(cmd.filter as Partial<MemberFilter>);
  }, []);
  useUiCommand('open:loyalty_member', open);
  useUiCommand('prefill:loyalty.adjust', prefill);
  useUiCommand('filter:loyalty_members', filter);
}
