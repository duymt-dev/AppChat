// Phần `ui` của tin Trợ lý (TIP-023c G1.2 + standard §11): lưu `{ type:'ui', tree, run_id }` — chỉ cây + descriptor ref, KHÔNG lưu payload.
// Khi phát (lượt mới / mở lại phiên) dựng `GenUiPart` cho người xem: refs đọc lại theo quyền HIỆN HÀNH, intent ký lại cho từng node
// action (đường dẫn node → handle) sau khi kiểm action còn trong quyền + có handler. Mở lại phiên không gọi model, không chạy action.
import { getAction } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { refsOf, walkTree, type AuthzContext, type GenUiPart, type UiTree } from '@appchat/shared';
import type { GenUiIntents } from '../../../kernel/actions/genui-intent';
import { allowedFor } from '../catalog';
import { resolveRefs } from './refs';

export interface StoredUiPart {
  type: 'ui';
  tree: UiTree;
  run_id: string;
}

export interface Viewer {
  ws: string;
  userId: string;
  authz: AuthzContext;
  implemented: (actionId: string) => boolean;
}

/** Ô form gửi được = tên gốc của mỗi ô (`fields.password` → `fields`). */
const formRoots = (fields: { name: string }[]) => [...new Set(fields.map((f) => f.name.split('.')[0]!))];

/** Ký intent cho các node action còn hợp lệ với người xem; node không còn quyền → không có intent (renderer ẩn nút). */
export async function intentsFor(intents: GenUiIntents | null, v: Viewer, p: StoredUiPart): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!intents) return out;
  const nodes: { path: string; actionId: string; input?: Record<string, unknown>; fields?: string[] }[] = [];
  walkTree(p.tree.root, (b, path) => {
    if (b.type === 'button' && b.on.kind === 'action') nodes.push({ path, actionId: b.on.action_id, input: b.on.input });
    else if (b.type === 'form') nodes.push({ path, actionId: b.action_id, fields: formRoots(b.fields) });
  });
  for (const n of nodes) {
    const def = getAction(n.actionId);
    if (!def || !allowedFor(def, v.authz) || !v.implemented(def.id)) continue;
    out[n.path] = await intents.issue({ workspaceId: v.ws, userId: v.userId, runId: p.run_id, node: n.path, actionId: n.actionId, ...(n.input ? { input: n.input } : {}), ...(n.fields ? { fields: n.fields } : {}) });
  }
  return out;
}

/** Dựng phần `ui` cho người xem (lượt mới + mở lại phiên). */
export async function presentUi(db: Pick<TenantDb, 'aiRun' | 'aiRunStep'>, intents: GenUiIntents | null, v: Viewer, p: StoredUiPart): Promise<GenUiPart> {
  const refs = await resolveRefs(db, { runId: p.run_id, userId: v.userId, authz: v.authz, refs: refsOf(p.tree.root) });
  return { type: 'ui', tree: p.tree, run_id: p.run_id, refs, intents: await intentsFor(intents, v, p) };
}

/** Bước `render` thành công từ `fromIdx` → các phần `ui` cần lưu (theo thứ tự bước). */
export async function uiPartsOf(db: Pick<TenantDb, 'aiRunStep'>, runId: string, fromIdx: number): Promise<StoredUiPart[]> {
  const rows = await db.aiRunStep.findMany({ where: { runId, type: 'tool', actionId: 'render', status: 'ok', idx: { gte: fromIdx } }, orderBy: { idx: 'asc' }, select: { output: true } });
  return rows.flatMap((r) => {
    const tree = ((r.output ?? {}) as { output?: { ui?: UiTree } }).output?.ui;
    return tree ? [{ type: 'ui' as const, tree, run_id: runId }] : [];
  });
}
