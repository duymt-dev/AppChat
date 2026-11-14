// Cụm thẻ hoạt động của tab Tổng quan Hồ sơ 360° (TIP-026b §3.3): Hộp thư (Overview360) và Khách hàng dùng chung. Chưa có tóm tắt
// (API cũ / mock thiếu) → không hiện gì thay vì dữ liệu mẫu. Thẻ cơ hội = Sales Pipeline (TIP-026c) — lịch sử từ `opportunities` của 360°.
'use client';
import type { ActivitySummaryDto, OpportunityItemDto } from '@appchat/shared';
import { OpportunityPanel } from '../opportunities';
import { TaskCard } from './TaskCard';
import { CommentCard, NoteCard } from './NoteCard';

export function DealCard({ contactId, a, history }: { contactId: string; a?: ActivitySummaryDto; history?: OpportunityItemDto[] }) {
  if (!a) return null;
  return <OpportunityPanel contactId={contactId} current={a.opportunity.current} history={history ?? []} total={a.opportunity.count} canEdit={a.can_edit} />;
}

export function ActivityCards({ contactId, a }: { contactId: string; a?: ActivitySummaryDto }) {
  if (!a) return null;
  return (
    <>
      <TaskCard contactId={contactId} a={a} />
      <NoteCard contactId={contactId} a={a} />
      <CommentCard contactId={contactId} a={a} />
    </>
  );
}
