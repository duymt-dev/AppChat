// Đọc lại sau xác nhận (TIP-023b E · AC "UI→AI readback"): thao tác Trợ lý vừa chạy có `ui_target` mở bản ghi → đọc lại bản ghi đó bằng chính
// action `<thực thể>.get` (cùng query + scope của màn chi tiết), quyền HIỆN TẠI của người dùng. Kết quả đưa cho model (đã lọc bí mật, ≤ 20
// dòng) để trả lời đúng trạng thái thật — không tự suy "đã tạo / đã gửi" từ việc bấm xác nhận. Không có action get / ngoài scope / lỗi →
// không có readback (model chỉ nhận kết quả action như cũ). Đọc không ghi action_log nghiệp vụ, không trừ credit.
import { registry } from '@appchat/actions';
import { AppError, type UiCommandDto } from '@appchat/shared';
import { implementedBy, type ToolExecutor } from '../../kernel/actions/executor';
import { assistantActionCtx } from './meta-tools';
import { safeForModel } from './read-dispatch';
import type { AssistantTurnCtx } from './types';

const GETS = new Map(registry.filter((a) => a.risk === 'read' && a.id.endsWith('.get')).map((a) => [a.id.slice(0, -'.get'.length), a]));

/** Action đọc lại của thực thể trong `ui_target` (`open` contact → contact.get), null khi không có. */
export function readbackOf(target: UiCommandDto | undefined): { actionId: string; input: Record<string, string> } | null {
  if (!target || target.type !== 'open') return null;
  const def = GETS.get(target.entity);
  return def ? { actionId: def.id, input: { [`${target.entity}_id`]: target.id } } : null;
}

export async function readBack(executor: ToolExecutor, t: AssistantTurnCtx, stepIdx: number, target: UiCommandDto | undefined): Promise<unknown | null> {
  const r = readbackOf(target);
  if (!r || !implementedBy(executor)(r.actionId)) return null;
  try {
    const out = await executor.execute(assistantActionCtx(t, stepIdx), r.actionId, r.input);
    return out.status === 200 ? safeForModel(out.data.result) : null;
  } catch (e) {
    if (e instanceof AppError) return null;
    throw e;
  }
}
