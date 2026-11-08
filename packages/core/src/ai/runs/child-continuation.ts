// Chạy tiếp run cha sau khi run con kết thúc (TIP-019b §4.3, DC-380). Cha dừng `waiting_child` (state = lời gọi delegate đang chờ +
// `child_run_id`). Con kết thúc (chạy tiếp sau duyệt / thao tác / huỷ) → `continueParent` claim cha `waiting_child` → `running` (một
// người thắng — job lặp / hai tiến trình chỉ chạy tiếp một lần) rồi nối kết quả con vào cha qua `AiRunner.resume`. Kết quả con chiếu lại
// theo người xem HIỆN TẠI: chỉ tên agent + trạng thái + tóm tắt chữ của con (không dữ liệu nghiệp vụ cũ chưa qua quyền). Cha đã huỷ /
// không còn chờ → không chạy tiếp. Con chưa kết thúc (vẫn chờ) → không làm gì.
import type { ToolOutcome } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { TERMINAL, type RunRow } from './run.store';

export interface ChildOutcome {
  parent: RunRow;
  outcome: ToolOutcome;
}

/**
 * Kết quả của run con cho lời gọi delegate của cha, hoặc null khi chưa nối được: con chưa kết thúc, không có cha, cha không chờ con
 * này. Không ghi gì — người gọi (job ai-resume / runner) chạy tiếp cha bằng `AiRunner.resume` (claim waiting_child).
 */
export async function childOutcome(db: Pick<TenantDb, 'aiRun' | 'aiAgent'>, childId: string): Promise<ChildOutcome | null> {
  const child = await db.aiRun.findUnique({ where: { id: childId }, select: { id: true, parentRunId: true, status: true, output: true, error: true, stopReason: true, agentId: true } });
  if (!child?.parentRunId || !(TERMINAL as readonly string[]).includes(child.status)) return null;
  const parent = await db.aiRun.findUnique({ where: { id: child.parentRunId } });
  if (!parent || parent.status !== 'waiting_child') return null;
  if ((parent.state as { child_run_id?: string } | null)?.child_run_id !== child.id) return null;
  const agent = child.agentId ? ((await db.aiAgent.findUnique({ where: { id: child.agentId }, select: { name: true } }))?.name ?? '') : '';
  const text = ((child.output ?? {}) as { text?: string }).text ?? '';
  if (child.status === 'completed') return { parent, outcome: { kind: 'ok', output: { agent, run_id: child.id, status: 'completed', summary: text.slice(0, 2000) } } };
  const code = child.status === 'cancelled' ? 'CANCELLED' : child.status === 'handoff' ? 'HANDOFF' : (child.error?.split(':')[0]?.trim() || 'DELEGATE_FAILED');
  return { parent, outcome: { kind: 'error', code, message: `Agent ${agent} không hoàn thành (${child.stopReason ?? child.status})` } };
}
