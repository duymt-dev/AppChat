// Màu chip trạng thái báo giá — prototype qStMeta L8066 (trạng thái theo COMMERCE §3).
import { color } from '@appchat/ui';
import type { QuoteStatus } from './types';

export const STATUS_TONE: Record<QuoteStatus, [fg: string, bg: string]> = {
  draft: [color.text3, color.divider],
  pending_approval: [color.pendingText, color.warnSoftBg],
  revision_requested: [color.amberText, color.amberBg],
  approved: [color.brandInk, color.brandBg],
  sent: [color.paidText, color.sentBg],
  viewed: [color.violet, color.violetChip],
  accepted: [color.brandInk, color.brandBg],
  rejected: [color.rejectText, color.roseBg],
  expired: [color.text3, color.divider],
  superseded: [color.text4, color.divider],
};

/** Cột kanban (prototype qKanbanCols L9417): Nháp · Đã gửi · Đã duyệt · Đã chốt. */
export const KANBAN: [key: QuoteStatus, tone: string][] = [
  ['draft', color.text3],
  ['sent', color.paidText],
  ['approved', color.brandInk],
  ['accepted', color.brandInk],
];

/** Chip lọc (prototype quoteFilters L9418). */
export const FILTERS = [
  'all',
  'draft',
  'sent',
  'revision_requested',
  'approved',
  'accepted',
  'rejected',
] as const;
