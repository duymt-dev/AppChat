// Luật event chiến dịch (TIP-037, Blueprint §2.3 consumer `notify` / `realtime`): gửi duyệt → `campaign_approval` cho người có quyền
// campaign.approve (Chủ sở hữu / quản lý — theo ma trận quyền, không theo tên vai trò); duyệt / từ chối → báo người gửi duyệt. WS
// `campaign.updated` (chỉ id + trạng thái) cho người xem được Marketing. Chỉ phụ thuộc shared + notify — nạp ở notify/events/domain.rules.ts.
import { campaignChangedEvent } from '@appchat/shared';
import { registerNotificationRule, registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

const link = (id: string) => `/marketing?open=${id}`;

registerNotificationRule('marketing.approval', 'campaign.submitted', (e) => {
  const p = campaignChangedEvent.parse(e.payload);
  return [{ kind: 'campaign_approval', to: { permission: 'campaign.approve' }, params: { code: p.code }, link: link(p.campaign_id) }];
});

for (const [topic, key] of [['campaign.approved', 'approved'], ['campaign.rejected', 'rejected']] as const)
  registerNotificationRule(`marketing.${key}`, topic, (e) => {
    const p = campaignChangedEvent.parse(e.payload);
    // Người gửi duyệt nằm ở lịch sử chiến dịch — consumer notify không đọc DB domain; báo người có campaign.manage (người làm chiến dịch).
    return [{ kind: 'campaign_approval', to: { permission: 'campaign.manage' }, params: { code: p.code, variant: key }, link: link(p.campaign_id) }];
  });

for (const topic of ['campaign.submitted', 'campaign.approved', 'campaign.rejected', 'campaign.paused', 'campaign.resumed', 'campaign.cancelled', 'campaign.completed', 'campaign.updated'])
  registerRealtimeRule(`marketing.${topic}`, topic, (e) => {
    const p = campaignChangedEvent.parse(e.payload);
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'campaign.updated', data: { campaign_id: p.campaign_id, status: p.status }, require: { permission: 'campaign.view' } }];
  });
