// Quyền đọc một run (TIP-019b §5.2–5.3, DC-380) — dùng chung cho REST chi tiết run và bộ lọc WS: `assistant.use` + phạm vi `runScope`
// (không có `ai.governance` → chỉ run mà CÂY do chính mình khởi tạo — người khởi tạo của run GỐC, nên run con / tiện ích không có người
// khởi tạo riêng vẫn theo người ra lệnh của gốc). Tra lại mỗi lần (không tin owner / scope trong payload hay cache).
import { can, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { runScope } from './runs.service';

type Db = Pick<TenantDb, 'aiRun'>;

export interface ReadableRun {
  id: string;
  rootRunId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Run người xem được đọc, hoặc null (không có / sai tenant / ngoài phạm vi / thiếu quyền — không phân biệt, gọi chỗ trả 404). */
export async function readableRun(db: Db, authz: AuthzContext, runId: string): Promise<ReadableRun | null> {
  if (!UUID.test(runId) || !can(authz, 'assistant.use')) return null;
  const run = await db.aiRun.findUnique({ where: { id: runId }, select: { id: true, rootRunId: true, initiatedByUserId: true } });
  if (!run) return null;
  const scope = runScope(authz);
  if (!scope.initiatedBy) return { id: run.id, rootRunId: run.rootRunId };
  const owner = run.rootRunId === run.id ? run.initiatedByUserId : (await db.aiRun.findUnique({ where: { id: run.rootRunId }, select: { initiatedByUserId: true } }))?.initiatedByUserId;
  return owner === scope.initiatedBy ? { id: run.id, rootRunId: run.rootRunId } : null;
}
