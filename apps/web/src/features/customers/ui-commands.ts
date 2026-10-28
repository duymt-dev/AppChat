// UiCommand của Khách hàng (frontend-structure §8): prefill form tạo / sửa, mở drawer 360°, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useCrmUi } from './crm-store';
import type { ContactFilter } from './api';

const str = (v: Record<string, unknown>) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x ?? '')]));

export function useCustomersUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type !== 'prefill') return;
    const { contact_id, ...values } = cmd.values;
    const s = useCrmUi.getState();
    s.set({ prefill: str(values) });
    s.set({ modal: contact_id ? 'edit' : 'create', target: contact_id ? String(contact_id) : null });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useCrmUi.getState().set({ detail: cmd.id });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useCrmUi.getState().setFilter(cmd.filter as Partial<ContactFilter>);
  }, []);
  useUiCommand('prefill:contact.form', prefill);
  useUiCommand('open:contact', open);
  useUiCommand('filter:contacts', filter);
}
