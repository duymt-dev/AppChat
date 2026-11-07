// Preview tạo ticket (TIP-023b R2.8): dữ liệu mới + người phụ trách (tên; mặc định người tạo) + cảnh báo trùng (khách có ticket còn mở cùng
// danh mục trong 24 giờ, trong scope người gọi → execute sẽ hỏi gộp). Chỉ đọc.
import type { ActionInput, ActionPreview, ticketCreate } from '@appchat/actions';
import { TICKET_DUP_HOURS, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, defined, line, preview } from '../../../kernel/actions/preview-kit';
import type { CrmMembers } from '../../../crm/public';
import { inSupportScope } from '../../ticket-access';
import { who } from './ticket-edit.handlers.preview';

export async function createPreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof ticketCreate>, now: Date): Promise<ActionPreview> {
  const assignee = await who(tx, members, i.assignee_agent_id ? null : (i.assignee_user_id ?? a.userId), i.assignee_agent_id);
  const dup =
    i.contact_id && i.on_duplicate !== 'create'
      ? await tx.ticket.findFirst({ where: { contactId: i.contact_id, category: i.category, status: { not: 'closed' }, createdAt: { gte: new Date(now.getTime() - TICKET_DUP_HOURS * 3_600_000) } }, orderBy: { createdAt: 'desc' } })
      : null;
  const after = defined({ title: i.title.trim(), category: i.category, priority: i.priority, channel: i.channel, status: i.status, assignee, company: i.company, description: i.description?.trim() || undefined });
  return preview('write', line(i.title.trim(), i.priority, assignee), { changes: [created('ticket', after)], ...(dup && inSupportScope(a, dup) ? { warnings: [`duplicate_of:${dup.code}`] } : {}) });
}
