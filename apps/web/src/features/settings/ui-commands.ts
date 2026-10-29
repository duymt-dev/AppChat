// UiCommand của Cài đặt (frontend-structure §8): mở mục theo registry, điền sẵn hộp mời thành viên, lọc danh sách thành viên.
'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useSettingsUi, type MemberDraft } from './settings-store';
import { resolveSection } from './registry';

const ROLES = ['manager', 'sales', 'cs', 'accountant'];
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function useSettingsUiCommands() {
  const router = useRouter();
  const open = useCallback(
    (cmd: UiCommand) => {
      if (cmd.type === 'open') router.push(`/settings/${resolveSection(cmd.id).key}`);
    },
    [router],
  );
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type !== 'prefill') return;
    const role = ROLES.includes(str(cmd.values.role)) ? (str(cmd.values.role) as MemberDraft['role']) : 'sales';
    useSettingsUi.getState().set({ memberModal: { name: str(cmd.values.name), email: str(cmd.values.email), role } });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useSettingsUi.getState().set({ memberQ: str(cmd.filter.q) });
  }, []);
  useUiCommand('open:settings', open);
  useUiCommand('prefill:member.invite', prefill);
  useUiCommand('filter:members', filter);
}
