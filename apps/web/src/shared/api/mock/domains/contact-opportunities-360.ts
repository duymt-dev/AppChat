// Nối cơ hội (TIP-026c) vào khách của mock — như server `withActivities` / `openSummary`: Hồ sơ 360° có `opportunity` (thẻ — mở mới nhất,
// không có thì mới nhất đã đóng) + `opportunities` (lịch sử); dòng bảng Khách hàng có `open_opportunity` (vắng khi không có cơ hội mở).
import type { SystemRole } from '@appchat/shared';
import { cardDto, currentOpp, itemDto, oppList, openSummaryOf, type OppStore } from './contact-opportunities';

export const opportunities360 = (s: OppStore, role: SystemRole, contactId: string) => {
  const cur = currentOpp(s, contactId);
  return { opportunity: cur ? cardDto(s, cur, role) : null, opportunities: oppList(s, contactId).map((o) => itemDto(o, role)) };
};

export const withOpenOpportunity = <T extends { id: string }>(s: OppStore, role: SystemRole, r: T) => {
  const o = openSummaryOf(s, role, r.id);
  return o ? { ...r, open_opportunity: o } : r;
};
