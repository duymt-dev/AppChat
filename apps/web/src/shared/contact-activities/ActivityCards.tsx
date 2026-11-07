// Cụm thẻ hoạt động của tab Tổng quan Hồ sơ 360° (TIP-026b §3.3): Hộp thư (Overview360) và Khách hàng dùng chung. Chưa có tóm tắt
// (API cũ / mock thiếu) → không hiện gì thay vì dữ liệu mẫu.
'use client';
import type { ActivitySummaryDto } from '@appchat/shared';
import { OpportunityCard } from './OpportunityCard';
import { TaskCard } from './TaskCard';
import { CommentCard, NoteCard } from './NoteCard';

export function DealCard({ contactId, a }: { contactId: string; a?: ActivitySummaryDto }) {
  return a ? <OpportunityCard contactId={contactId} a={a} /> : null;
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
