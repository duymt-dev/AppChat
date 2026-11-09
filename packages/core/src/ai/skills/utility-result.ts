// Đọc kết quả kỹ năng tiện ích (TIP-019c §3.4): `GET /ai-utilities/:runId/result` — `handle` LUÔN là run con 019b thực (gốc, không phải
// run con sửa lại, không phải action_log id). Quyền: `assistant.use` + cùng phạm vi `readableRun` (owner của run gốc, hoặc có
// `ai.governance` thấy cả workspace). Không có / đã mất quyền → null (controller trả 404 đồng nhất, không phân biệt lý do).
// Trạng thái HIỆN TẠI đọc trực tiếp từ `utility_operation` — không suy từ `ai_run.status` (chữ thô có thể đã validating/generating dù
// run đã completed ở lớp model). `proposal` chỉ có khi `phase = validated`.
import { UTILITY_SCHEMA_VERSION, type AuthzContext, type UtilityEnvelope } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { readableRun, type ReadableRun } from '../runs/run-status';

type Db = Pick<TenantDb, 'aiRun' | 'utilityOperation'>;

const STATE: Record<string, UtilityEnvelope['state']> = {
  generating: 'pending', validating: 'pending', validated: 'completed', invalidated: 'invalidated', failed: 'failed', unknown: 'unknown', cancelled: 'cancelled',
};

/** Kết quả theo `runId` — null khi run không tồn tại / không thuộc kỹ năng tiện ích / người xem không có quyền (404 đồng nhất). */
export async function utilityResult(db: Db, authz: AuthzContext, runId: string): Promise<UtilityEnvelope | null> {
  const ok: ReadableRun | null = await readableRun(db, authz, runId);
  if (!ok) return null;
  const op = await db.utilityOperation.findUnique({ where: { runId: ok.id } });
  if (!op) return null; // run thật nhưng không phải lượt tiện ích (handle sai loại) — không phân biệt với 404 thường.
  const state = STATE[op.phase] ?? 'unknown';
  return {
    utility_run_id: ok.id,
    schema_version: op.schemaVersion ?? UTILITY_SCHEMA_VERSION,
    state,
    ...(state === 'completed' ? { proposal: op.validatedResult } : {}),
    ...(state === 'failed' && op.failureReason ? { reason: op.failureReason } : {}),
  };
}
