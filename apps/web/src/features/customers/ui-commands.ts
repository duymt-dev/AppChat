// UiCommand của Khách hàng (frontend-structure §8): prefill form tạo / sửa, mở drawer 360°, lọc danh sách, tô sáng một khách
// (`contact:<id>` — màn tự focus dòng nếu đang tải, chưa tải thì mở 360° lấy bản ghi theo scope; không phải mutation).
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useContactEditUi } from '@/shared/crm-forms/contact-edit-command';
import { useCrmUi } from './crm-store';
import type { ContactFilter } from './api';

const str = (v: Record<string, unknown>) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x ?? '')]));

/**
 * `prefill:contact.form` — đăng ký MỘT lần ở FormCommandHost (TIP-025b §D.3). Có `contact_id` → form sửa toàn cục (edit-context mới,
 * không dùng giá trị model đưa làm phiên bản); không có → form tạo của màn Khách hàng với giá trị điền sẵn.
 */
export function prefillContactForm(cmd: UiCommand) {
  if (cmd.type !== 'prefill') return;
  const { contact_id, ...values } = cmd.values;
  if (contact_id) return useContactEditUi.getState().open(String(contact_id));
  const s = useCrmUi.getState();
  s.set({ prefill: str(values) });
  s.set({ modal: 'create', target: null });
}

export function useCustomersUiCommands() {
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useCrmUi.getState().set({ detail: cmd.id });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useCrmUi.getState().setFilter(cmd.filter as Partial<ContactFilter>);
  }, []);
  const highlight = useCallback((cmd: UiCommand) => {
    if (cmd.type !== 'highlight') return;
    const [entity, id] = cmd.target.split(':');
    if (entity === 'contact' && id) useCrmUi.getState().set({ highlight: id });
  }, []);
  useUiCommand('highlight', highlight);
  useUiCommand('open:contact', open);
  useUiCommand('filter:contacts', filter);
}
