// Kind `conversation.bulk_update` của việc dữ liệu (TIP-025b §C.2, khung 045b annex D): runner kernel (bulk-dispatch) đã kiểm người tạo còn
// là thành viên + còn quyền action gốc; đây kiểm thêm `inbox.assign` khi lô có đổi người phụ trách, rồi áp thay đổi cho MỘT hội thoại trong
// transaction riêng cùng biên nhận (chạy lại / hai worker không ghi lần hai). Không thấy / chỉ đọc → lỗi bản ghi đó (failed, mã an toàn).
// Event realtime ghi outbox cùng transaction (danh sách / đếm làm mới theo scope).
import { AppError, can } from '@appchat/shared';
import { registerDataJobKind } from '../../kernel/jobs/bulk-dispatch';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { INBOX_BULK_KIND } from '../actions/bulk-update.handler';
import { writableConversation } from '../services/access';
import { applyBulkChange, type BulkChange } from '../services/conversation-mutations';

export function registerInboxBulkKind() {
  registerDataJobKind(INBOX_BULK_KIND, {
    label: 'Cập nhật hàng loạt hội thoại',
    link: dataJobUrl,
    item: async (c, tx, targetId) => {
      const change = (c.job.input as { change: BulkChange }).change;
      if (change.assignee_user_id && !can(c.authz, 'inbox.assign')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.assign' });
      const conv = await writableConversation(tx, c.authz, targetId);
      const now = c.now();
      const r = await applyBulkChange(tx, conv, change, now);
      if (r.events.length) await writeOutbox(tx, c.ws, r.events, now);
      return r.status;
    },
  });
}
