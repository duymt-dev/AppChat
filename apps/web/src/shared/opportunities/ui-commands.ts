// Lệnh Trợ lý cho cơ hội (TIP-026c §5.1) — `open:opportunity` mở drawer Cơ hội 360°, `prefill:opportunity.form` mở thêm nhanh ở Hồ sơ
// 360° của khách (điền tên / giá trị — người dùng vẫn bấm Lưu). Thiếu contact_id → bỏ qua (không đoán khách). Đăng ký MỘT lần ở
// FormCommandHost toàn cục (chạy cả khi chỉ mở Hộp thư).
import type { UiCommand } from '@appchat/actions';
import { useOpportunityUi } from './opportunity-store';
import { useQuickAddUi } from './quick-add-store';

const openDrawer = (cmd: UiCommand) => {
  if (cmd.type === 'open' && cmd.id) useOpportunityUi.getState().open(cmd.id);
};

const prefill = (cmd: UiCommand) => {
  if (cmd.type !== 'prefill') return;
  const contactId = typeof cmd.values.contact_id === 'string' ? cmd.values.contact_id : '';
  if (contactId) useQuickAddUi.getState().start(contactId, cmd.values);
};

export const OPPORTUNITY_COMMANDS: [string, (cmd: UiCommand) => void][] = [
  ['open:opportunity', openDrawer],
  ['prefill:opportunity.form', prefill],
];
