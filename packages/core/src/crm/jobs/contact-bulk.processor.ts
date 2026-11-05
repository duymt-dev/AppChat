// Kind `contact.bulk_update` của việc dữ liệu (TIP-045b annex D): runner kernel (bulk-dispatch) đã kiểm quyền HIỆN TẠI của người tạo +
// lease; đây áp patch cho một khách trong transaction riêng cùng biên nhận. Ngoài scope / watcher / xoá mềm → lỗi bản ghi đó (failed).
import { fieldRoleOf } from '@appchat/shared';
import { registerDataJobKind } from '../../kernel/jobs/bulk-dispatch';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { CONTACT_BULK_KIND } from '../actions/contact-bulk.handler';
import { applyBulkPatch, type BulkPatch } from '../services/contact-bulk';

registerDataJobKind(CONTACT_BULK_KIND, {
  label: 'Cập nhật hàng loạt khách hàng',
  link: dataJobUrl,
  item: (c, tx, targetId) => applyBulkPatch(tx, { authz: c.authz, fieldRole: fieldRoleOf(c.authz), userId: c.job.actorId, now: c.now() }, targetId, (c.job.input as { patch: BulkPatch }).patch),
});
