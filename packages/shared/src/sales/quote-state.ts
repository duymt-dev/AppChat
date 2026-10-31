// Luồng trạng thái báo giá (standards/domain/state-machine.md §4, COMMERCE §3) — dùng chung handler, mock FE, nút UI, Trợ lý.
// `send` từ `draft` chỉ khi không chạm ngưỡng duyệt (handler kiểm `approvalReasons` — QUOTE_NEEDS_APPROVAL); `extend_validity` từ
// `expired` chỉ khi không có phiên bản mới hơn (handler kiểm). Phiên bản cũ thành `superseded` khi bản mới được gửi.
import { defineFlow } from '../state/flow';

export const QUOTE_STATUSES = ['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'accepted', 'revision_requested', 'rejected', 'expired', 'superseded'] as const;
export type QuoteStatusKey = (typeof QUOTE_STATUSES)[number];

export const QUOTE_FLOW = defineFlow<QuoteStatusKey>({
  draft: { 'quote.update': 'draft', 'quote.submit_for_approval': 'pending_approval', 'quote.send': 'sent', 'quote.delete': 'draft' },
  pending_approval: { 'quote.approve': 'approved', 'quote.reject_internal': 'draft' },
  approved: { 'quote.send': 'sent' },
  sent: {
    'quote.view': 'viewed',
    'quote.mark_accepted': 'accepted',
    'quote.mark_rejected': 'rejected',
    'quote.request_revision': 'revision_requested',
    'quote.expire': 'expired',
    'quote.extend_validity': 'sent',
  },
  viewed: {
    'quote.mark_accepted': 'accepted',
    'quote.mark_rejected': 'rejected',
    'quote.request_revision': 'revision_requested',
    'quote.expire': 'expired',
    'quote.extend_validity': 'viewed',
  },
  revision_requested: { 'quote.supersede': 'superseded' },
  expired: { 'quote.extend_validity': 'sent' },
  accepted: {},
  rejected: {},
  superseded: {},
  terminal: ['accepted', 'rejected', 'superseded'],
});

/** Báo giá còn "đang mở" (chưa chốt) — luật lùi giai đoạn CRM khi bị từ chối / hết hạn (COMMERCE §8). */
export const OPEN_QUOTE_STATUSES: readonly QuoteStatusKey[] = ['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'revision_requested'];
