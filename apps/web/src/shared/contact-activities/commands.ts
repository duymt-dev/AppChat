// Lệnh Trợ lý điền form hoạt động CRM (TIP-026b §3.3, §3.5) — đăng ký MỘT lần ở FormCommandHost toàn cục: chạy cả khi chỉ mở Hộp thư.
// Chỉ mở + điền sẵn; ghi vẫn qua action khi người dùng bấm Lưu. Thiếu contact_id → bỏ qua (không đoán khách). Tên cũ
// `prefill:contact_opportunity.form` trỏ thêm nhanh cơ hội mới (TIP-026c) — cùng handler với `prefill:opportunity.form`.
import type { UiCommand } from '@appchat/actions';
import { OPPORTUNITY_COMMANDS } from '../opportunities/ui-commands';
import { useActivityUi, type ActivityFormKind } from './activity-store';

const prefill = (kind: ActivityFormKind) => (cmd: UiCommand) => {
  if (cmd.type !== 'prefill') return;
  const contactId = typeof cmd.values.contact_id === 'string' ? cmd.values.contact_id : '';
  if (!contactId) return;
  const f = kind === 'note' && cmd.values.kind === 'comment' ? 'comment' : kind;
  useActivityUi.getState().openForm({ kind: f, contactId, values: cmd.values });
};

export const ACTIVITY_PREFILL: [string, (cmd: UiCommand) => void][] = [
  ['prefill:contact_note.form', prefill('note')],
  ['prefill:contact_task.form', prefill('task')],
  ['prefill:contact_opportunity.form', OPPORTUNITY_COMMANDS[1]![1]],
];
