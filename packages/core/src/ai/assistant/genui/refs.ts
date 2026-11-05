// Dữ liệu `$ref` của cây GenUI (TIP-023c hợp đồng 5, standard §3): ref chỉ trỏ output bước `tool` THÀNH CÔNG của CÙNG run; server kiểm
// run thuộc phiên của người xem trước, rồi đọc output (đã `safeForModel` lúc ghi — bỏ ô bí mật, ≤ 20 dòng / mảng) và chỉ trả đúng giá trị
// mà ref trỏ tới (không gửi cả output). Khi mở lại phiên: quyền hiện hành phải còn quyền của action đã tạo bước — mất quyền → ref
// `unavailable` (không xoá lịch sử, không đoán số). Persist cây + descriptor ref, KHÔNG persist bản copy payload.
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { parseRef, readRef, type AuthzContext } from '@appchat/shared';
import { safeForModel } from '../read-dispatch';

const DEFS = new Map(registry.map((a) => [a.id, a]));
export const REF_UNAVAILABLE = { unavailable: true } as const;
export type RefValue = unknown | typeof REF_UNAVAILABLE;

type Db = Pick<TenantDb, 'aiRun' | 'aiRunStep'>;

/** Output đã lưu của một bước tool `call_action` (ToolOutcome ok) → { actionId, output }. */
function outcomeOf(step: { actionId: string | null; input: unknown; output: unknown; status: string }): { actionId: string; output: unknown } | null {
  if (step.status !== 'ok') return null;
  const out = (step.output ?? {}) as { kind?: string; output?: unknown };
  if (out.kind !== 'ok') return null;
  // Bước meta-tool `call_action` lưu actionId = 'call_action'; action thật nằm ở input.action_id.
  const inner = (step.input ?? {}) as { action_id?: unknown };
  const actionId = step.actionId === 'call_action' && typeof inner.action_id === 'string' ? inner.action_id : step.actionId;
  return actionId ? { actionId, output: out.output } : null;
}

const can = (authz: AuthzContext, actionId: string) => {
  const def = DEFS.get(actionId);
  if (!def) return false;
  // Ref chỉ cho action đọc (số liệu): ghi / gửi không là nguồn số hiển thị.
  if (def.risk !== 'read') return false;
  if (def.permission === 'self') return true;
  if (def.permission === 'platform_admin') return false;
  return authz.isOwner || authz.permissions.has(def.permission);
};

/**
 * Giá trị các ref của một cây cho người xem `userId` (chủ phiên) với quyền hiện hành `authz`. Run không thuộc người xem → mọi ref
 * unavailable (không lộ có tồn tại). Bước `qr` (login handle) dùng `loginRefs` riêng — ở đây chỉ số liệu.
 */
export async function resolveRefs(db: Db, q: { runId: string; userId: string; authz: AuthzContext; refs: string[] }): Promise<Record<string, RefValue>> {
  const out: Record<string, RefValue> = {};
  const parsed = q.refs.map((r) => [r, parseRef(r)] as const);
  const run = await db.aiRun.findUnique({ where: { id: q.runId }, select: { kind: true, initiatedByUserId: true } });
  const own = !!run && run.kind === 'assistant' && run.initiatedByUserId === q.userId;
  const idxs = [...new Set(parsed.flatMap(([, p]) => (p ? [p.step] : [])))];
  const steps = own && idxs.length ? await db.aiRunStep.findMany({ where: { runId: q.runId, idx: { in: idxs }, type: 'tool' }, select: { idx: true, actionId: true, input: true, output: true, status: true } }) : [];
  const outputs = new Map<number, unknown>();
  for (const s of steps) {
    const o = outcomeOf(s);
    if (o && can(q.authz, o.actionId)) outputs.set(s.idx, safeForModel(o.output));
  }
  for (const [r, p] of parsed) {
    const v = p && outputs.has(p.step) ? readRef(outputs, r) : undefined;
    out[r] = v === undefined ? REF_UNAVAILABLE : v;
  }
  return out;
}

/** Index bước tool hợp lệ cho ref trong run (model chỉ được trỏ các bước này — lỗi ref sai đưa lại model sửa). */
export async function refSteps(db: Pick<TenantDb, 'aiRunStep'>, runId: string): Promise<Map<number, string>> {
  const rows = await db.aiRunStep.findMany({ where: { runId, type: 'tool', status: 'ok' }, select: { idx: true, actionId: true, input: true, output: true, status: true } });
  const m = new Map<number, string>();
  for (const s of rows) {
    const o = outcomeOf(s);
    if (o) m.set(s.idx, o.actionId);
  }
  return m;
}
