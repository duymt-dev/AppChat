// Bản ghi cho bộ lọc realtime theo policy ĐỌC chung (TIP-042c, record-policy) — dùng chung cho luật realtime của các domain (không import
// chéo domain). Hội thoại: người được gán / phụ trách khách / nhóm / quan hệ khách (collaborator + watcher, tra lúc phát); hội thoại nhóm
// không khách → người được gán / nhóm / all. Ticket: người phụ trách / người tạo / nhóm — không mở theo quan hệ khách CRM. Lịch hẹn:
// người phụ trách / nhóm / quan hệ khách (TIP-016b).
import { POLICIES } from '../../authz/data-access';
import type { RealtimeRequire } from './envelope';

type ConvCols = { contact_id: string | null; assignee_user_id: string | null; contact_owner_user_id: string | null; team_id?: string | null | undefined };
type TicketCols = { assignee_user_id: string | null; team_id?: string | null | undefined; created_by_user_id?: string | null | undefined };

export const convRecord = (p: ConvCols): NonNullable<RealtimeRequire['record']> => ({
  policy: POLICIES.inbox,
  ref: { assignee: p.assignee_user_id, team: p.team_id ?? null, contact: p.contact_id },
  mineUserId: p.contact_owner_user_id,
});

export const ticketRecord = (p: TicketCols): NonNullable<RealtimeRequire['record']> => ({
  policy: POLICIES.support,
  ref: { assignee: p.assignee_user_id, team: p.team_id ?? null },
  mineUserId: p.created_by_user_id ?? null,
});

type AppointmentCols = { owner_user_id?: string | null | undefined; team_id?: string | null | undefined; contact_id: string };

export const appointmentRecord = (p: AppointmentCols): NonNullable<RealtimeRequire['record']> => ({
  policy: POLICIES.booking,
  ref: { owner: p.owner_user_id ?? null, team: p.team_id ?? null, contact: p.contact_id },
});
