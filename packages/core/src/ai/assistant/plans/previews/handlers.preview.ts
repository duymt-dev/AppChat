// Preview assistant.plan_propose (TIP-023d §1.5, risk write): chỉ đọc từ input (plan chưa tồn tại) — tóm tắt số bước + bước đầu,
// đúng khuôn mẫu preview-kit (TIP-023b R2.8). Không đọc DB: nội dung bước do người dùng/model soạn, không có gì để tra trước.
import type { ActionInput, ActionPreview, assistantPlanPropose } from '@appchat/actions';
import { created, line, preview } from '../../../../kernel/actions/preview-kit';

export function planProposePreview(i: ActionInput<typeof assistantPlanPropose>): ActionPreview {
  return preview('write', line(`${i.steps.length} bước`, i.steps[0]!.title), {
    count: i.steps.length,
    changes: [created('assistant_plan', { steps: i.steps.length, titles: i.steps.map((s) => s.title) })],
  });
}
