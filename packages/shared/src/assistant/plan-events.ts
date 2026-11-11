// Sự kiện outbox kế hoạch Cowork (TIP-023d §1.5, §6.2) — chỉ ID/revision/phase/đếm, không title/instructions/input thô (model đọc lại
// qua GET có quyền, không qua payload sự kiện).
export const PLAN_PROPOSED = 'assistant.plan_proposed';
export const PLAN_PROGRESSED = 'assistant.plan_progressed';
export const PLAN_EDIT_REQUESTED = 'assistant.plan_edit_requested';

export interface PlanProposedPayload {
  plan_id: string;
  owner_user_id: string;
  session_id: string;
  revision: number;
}

export interface PlanProgressedPayload {
  plan_id: string;
  revision: number;
  phase: string;
}

export interface PlanEditRequestedPayload {
  plan_id: string;
  plan_epoch: number;
}
