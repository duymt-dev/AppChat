// Quét nguồn đến hạn cho action riêng (TIP-003c §5.1) — cơ chế chung, không chính sách: trang ID-only keyset (mốc, id) ≤ 200 (SQL của
// domain theo index partial của nó), mỗi ứng viên một trigger tất định → `runSystemAction`. Biên nhận đã kết thúc → bỏ qua (không gọi
// Executor); `admitted` (crash giữa chừng) vẫn gọi để hội tụ. Lỗi một mục không chặn mục khác.
import type { SystemOutput } from '@appchat/actions';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ActionExecutor } from '../executor';
import { runSystemAction, type SystemTrigger } from './admission';

export const SCAN_PAGE = 200;

export interface SystemRunDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  tenants: Pick<TenantDbResolver, 'get'>;
  onError?: (targetId: string, err: unknown) => void;
}

export type ScanRow = { id: string; at: Date };
/** Cursor keyset (at, id) — null ở trang đầu. */
export type ScanCursor = { at: Date | null; id: string | null };

async function settled(d: SystemRunDeps, t: SystemTrigger): Promise<boolean> {
  const db = await d.tenants.get(TenantContexts.system(t.workspaceId, `system:${t.actionId}`));
  const [r] = await db.$queryRaw<{ phase: string }[]>`
    SELECT phase::text AS phase FROM system_action_receipt WHERE source_kind = ${t.sourceKind}::system_source_kind AND source_ref = ${t.sourceRef}
       AND action_id = ${t.actionId} AND target_id = ${t.targetId} AND target_generation = ${t.generation} AND milestone = ${t.milestone ?? ''}`;
  return !!r && r.phase !== 'admitted';
}

/** Một trigger; true khi hiệu ứng MỚI đã áp / đã nhận (applied / handed_off). */
export async function runTrigger(d: SystemRunDeps, t: SystemTrigger): Promise<boolean> {
  try {
    if (await settled(d, t)) return false;
    const r = await runSystemAction<SystemOutput>(d.executor, d.tenants, t);
    const out = (r.data as { result?: SystemOutput }).result;
    return out?.disposition === 'applied' || out?.disposition === 'handed_off';
  } catch (err) {
    d.onError?.(t.targetId, err);
    return false;
  }
}

/** Quét hết mọi trang keyset; `trigger` trả null để bỏ ứng viên (vd. chưa tới mốc). Trả số hiệu ứng mới. */
export async function scanDue(d: SystemRunDeps, read: (c: ScanCursor) => Promise<ScanRow[]>, trigger: (r: ScanRow) => SystemTrigger | null): Promise<number> {
  let c: ScanCursor = { at: null, id: null };
  let n = 0;
  for (;;) {
    const rows = await read(c);
    for (const r of rows) {
      const t = trigger(r);
      if (t && (await runTrigger(d, t))) n++;
    }
    if (rows.length < SCAN_PAGE) return n;
    const last = rows[rows.length - 1]!;
    c = { at: last.at, id: last.id };
  }
}
