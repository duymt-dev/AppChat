// Luật trạng thái hoạt động CRM (TIP-026b DC253) — dùng chung core (kiểm) + web (nút hợp lệ). Việc chăm sóc ≠ tác vụ AI; cơ hội ≠ báo giá.
// Xác suất cơ hội cố định theo giai đoạn (TIP-026c) — không còn ô nhập tay.

export const CONTACT_NOTE_KINDS = ['note', 'comment'] as const;
export type ContactNoteKind = (typeof CONTACT_NOTE_KINDS)[number];

export const CONTACT_TASK_STATES = ['open', 'done', 'cancelled'] as const;
export type ContactTaskState = (typeof CONTACT_TASK_STATES)[number];

// TIP-026c (D60): giai đoạn cơ hội = bảng hằng 7 giai đoạn xác suất cố định ở `opportunity-stages.ts` (thay open / qualified / proposal).
export { OPPORTUNITY_STAGES as CONTACT_OPPORTUNITY_STAGES, OPPORTUNITY_CLOSED as OPPORTUNITY_TERMINAL, type OpportunityStage as ContactOpportunityStage } from './opportunity-stages';

export const ACTIVITY_KINDS = ['notes', 'comments', 'tasks', 'opportunities'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Chuyển trạng thái việc hợp lệ: open ↔ done; open / done → cancelled; cancelled → open chỉ khi mở lại tường minh. */
const TASK_MOVES: Record<ContactTaskState, readonly ContactTaskState[]> = { open: ['done', 'cancelled'], done: ['open', 'cancelled'], cancelled: ['open'] };
export const taskMoveAllowed = (from: ContactTaskState, to: ContactTaskState) => from === to || TASK_MOVES[from].includes(to);

/** Giá trị kỳ vọng: số nguyên VND 0…999.999.999.999 dạng chuỗi. */
export const OPPORTUNITY_AMOUNT_RE = /^(0|[1-9]\d{0,11})$/;
