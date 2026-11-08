// Luật trạng thái hoạt động CRM (TIP-026b DC253) — dùng chung core (kiểm) + web (nút hợp lệ). Việc chăm sóc ≠ tác vụ AI; cơ hội ≠ báo giá.

export const CONTACT_NOTE_KINDS = ['note', 'comment'] as const;
export type ContactNoteKind = (typeof CONTACT_NOTE_KINDS)[number];

export const CONTACT_TASK_STATES = ['open', 'done', 'cancelled'] as const;
export type ContactTaskState = (typeof CONTACT_TASK_STATES)[number];

export const CONTACT_OPPORTUNITY_STAGES = ['open', 'qualified', 'proposal', 'won', 'lost'] as const;
export type ContactOpportunityStage = (typeof CONTACT_OPPORTUNITY_STAGES)[number];
export const OPPORTUNITY_TERMINAL: readonly ContactOpportunityStage[] = ['won', 'lost'];

export const ACTIVITY_KINDS = ['notes', 'comments', 'tasks', 'opportunities'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Chuyển trạng thái việc hợp lệ: open ↔ done; open / done → cancelled; cancelled → open chỉ khi mở lại tường minh. */
const TASK_MOVES: Record<ContactTaskState, readonly ContactTaskState[]> = { open: ['done', 'cancelled'], done: ['open', 'cancelled'], cancelled: ['open'] };
export const taskMoveAllowed = (from: ContactTaskState, to: ContactTaskState) => from === to || TASK_MOVES[from].includes(to);

/** Giá trị kỳ vọng: số nguyên VND 0…999.999.999.999 dạng chuỗi. */
export const OPPORTUNITY_AMOUNT_RE = /^(0|[1-9]\d{0,11})$/;
/** Xác suất người nhập: 0–100, tối đa 2 chữ số thập phân. */
export const probabilityOk = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100 && Math.round(n * 100) === n * 100;
