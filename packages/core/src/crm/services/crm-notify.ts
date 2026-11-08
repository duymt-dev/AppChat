// Thông báo Khách hàng (Q-012 → DC-150): xin thông báo qua event `notify.requested` cùng transaction của action.
// crm_owner (chuyển phụ trách) → luật crm/events/ownership.rules (TIP-015d, hai bên, chiếu lúc đọc); crm_access → người phụ trách (hoặc ai có crm.reassign khi khách chưa có người)
// khi có yêu cầu chia sẻ, và → người xin khi được duyệt / từ chối (biến thể tiêu đề `variant`). Link mở Hồ sơ 360° `/customers?c=`.
import type { CrmMembers } from './members.service';

const cut = (s: string) => s.slice(0, 200);
const link = (contactId: string) => `/customers?c=${contactId}`;

export async function accessRequestedNotify(members: Pick<CrmMembers, 'names'>, a: { requesterId: string; ownerId: string | null; contact: { id: string; name: string } }) {
  const actor = (await members.names([a.requesterId])).get(a.requesterId) ?? '';
  const to = a.ownerId ? { user_ids: [a.ownerId] } : { permission: 'crm.reassign' };
  return [{ topic: 'notify.requested', payload: { kind: 'crm_access', to, params: { actor: cut(actor), contact: cut(a.contact.name) }, link: link(a.contact.id), exclude_user_id: a.requesterId } }];
}

export async function accessDecidedNotify(members: Pick<CrmMembers, 'names'>, a: { deciderId: string | null; requesterId: string; status: 'approved' | 'rejected'; contact: { id: string; name: string } }) {
  const actor = a.deciderId ? ((await members.names([a.deciderId])).get(a.deciderId) ?? '') : '';
  return [
    {
      topic: 'notify.requested',
      payload: { kind: 'crm_access', to: { user_ids: [a.requesterId] }, params: { variant: a.status, actor: cut(actor), contact: cut(a.contact.name) }, link: a.status === 'approved' ? link(a.contact.id) : '/customers' },
    },
  ];
}
