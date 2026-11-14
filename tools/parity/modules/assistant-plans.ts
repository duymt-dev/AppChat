// Parity TIP-023d §6: thẻ kế hoạch Cowork (PlanCard / PlanStep / PlanEditor) và gợi ý dùng lại cách làm trước KHÔNG có trong prototype
// (PD-027 — prototype ver2.1 chỉ có composer Cowork L1468–1808, không có thẻ kế hoạch nhiều bước) → không có khung để so pixel, không
// thêm dòng, không tuyên bố diff < 5%. Picker agent (SelectedAgentPicker) vẫn so ở `assistant:agent-picker` (một dòng mỗi agent như
// prototype L1199). Hành vi, trạng thái, i18n, 390 kiểm ở e2e/assistant-plans.spec.ts. Khi có thiết kế được duyệt, thêm dòng ở đây
// (appWait `[data-testid="plan-card"]`).
import type { ParityEntry } from '../parity.manifest';

export const ASSISTANT_PLANS: ParityEntry[] = [];
