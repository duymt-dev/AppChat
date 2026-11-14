// Meta-tool `render(tree)` (TIP-023c G1.2, standard §1–§5): model ghép cây từ khối đóng → server kiểm (1) zod + giới hạn §8, (2) mọi
// `$ref` trỏ bước tool thành công của run này, (3) nút / form action: action có handler thật, trong quyền người dùng + chế độ, (4) form
// không mang giá trị cho ô bí mật (ô bí mật do server đánh dấu, model không đổi được). Sai → lỗi ngắn để model sửa MỘT lần; sai lần
// hai → cây `text` báo lỗi an toàn (không render nửa vời). Hợp lệ → output `{ ui: tree }` (turn.service dựng phần `ui` + intent + refs).
import { getAction } from '@appchat/actions';
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { checkTree, parseRef, refsOf, serverMessages, walkTree, type UiBlock, type UiTree } from '@appchat/shared';
import { connectorSecretKeys, secretPaths, secretValuesPresent } from '../../../kernel/actions/secret-fields';
import type { Implemented } from '../catalog';
import { allowedFor, modeAllows } from '../catalog';
import type { AssistantTurnCtx } from '../types';
import { refSteps } from './refs';
import { appointmentOrderIssues, type OrderCardCheck } from './appointment-order';

export const RENDER_TOOL = 'render';
/** Số lần render bị từ chối trong một run trước khi thay bằng khối lỗi (§1: thử lại 1 lần). */
export const RENDER_RETRIES = 1;

type Issue = string;

/** Đánh dấu ô bí mật của form theo metadata server; bỏ mọi `value` model điền cho ô đó. */
export function markSecretFields(tree: UiTree): UiTree {
  const fix = (b: UiBlock): UiBlock => {
    if (b.type === 'form') {
      const def = getAction(b.action_id);
      const provider = b.fields.find((f) => f.name === 'provider')?.value;
      const secret = new Set([
        ...(def ? secretPaths(def, {}) : []),
        ...(def?.secret?.connector && typeof provider === 'string' ? connectorSecretKeys(provider).map((k) => `${def.secret!.connector!.fields}.${k}`) : []),
      ]);
      return { ...b, fields: b.fields.map((f) => (secret.has(f.name) ? { name: f.name, ...(f.label ? { label: f.label } : {}), secret: true } : { ...f, secret: false })) };
    }
    if (b.type === 'stack' || b.type === 'row' || b.type === 'section') return { ...b, children: b.children.map(fix) };
    return b;
  };
  return { version: 1, root: fix(tree.root) };
}

async function semanticIssues(db: Pick<TenantDb, 'aiRunStep'>, t: AssistantTurnCtx, tree: UiTree, implemented: Implemented): Promise<Issue[]> {
  const issues: Issue[] = [];
  const steps = await refSteps(db, t.runId);
  for (const r of refsOf(tree.root)) {
    const p = parseRef(r)!;
    if (!steps.has(p.step)) issues.push(`$ref ${r}: step ${p.step} is not a successful tool step of this run (valid: ${[...steps.keys()].join(', ') || 'none — call a read action first'})`);
  }
  walkTree(tree.root, (b, path) => {
    const actionId = b.type === 'form' ? b.action_id : b.type === 'button' && b.on.kind === 'action' ? b.on.action_id : null;
    if (!actionId) return;
    const def = getAction(actionId);
    if (!def || !allowedFor(def, t.authz) || !implemented(def.id) || !modeAllows(def, t.mode)) {
      issues.push(`node ${path || 'root'}: action ${actionId} not available to this user — use find_actions`);
      return;
    }
    if (b.type === 'form') {
      const values = Object.fromEntries(b.fields.filter((f) => f.value !== undefined).map((f) => [f.name, f.value]));
      const nested = b.fields.reduce<Record<string, unknown>>((acc, f) => {
        const parts = f.name.split('.');
        if (parts.length === 2 && f.value !== undefined) acc[parts[0]!] = { ...((acc[parts[0]!] as object) ?? {}), [parts[1]!]: f.value };
        return acc;
      }, { ...values });
      const leaked = secretValuesPresent(def, nested);
      if (leaked.length) issues.push(`node ${path || 'root'}: never prefill secret fields (${leaked.join(', ')}) — leave them empty, the user types them`);
    }
    if (b.type === 'button' && b.on.kind === 'action' && secretValuesPresent(def, b.on.input).length) issues.push(`node ${path}: button input must not carry secrets`);
  });
  return issues;
}

/** Cây lỗi an toàn (§1) — chữ theo locale người dùng. */
export function errorTree(locale: string): UiTree {
  return { version: 1, root: { type: 'text', text: serverMessages(locale).ai.assistant.genui.renderFailed, tone: 'warning' } };
}

export interface RenderDeps {
  db: Pick<TenantDb, 'aiRunStep'>;
  implemented: Implemented;
  /** TIP-033c: kiểm khối `appointment_order` qua bộ đọc gợi ý booking (vắng → khối bị từ chối). */
  orderCard?: OrderCardCheck;
}

export function renderTool(d: RenderDeps, t: AssistantTurnCtx): ToolSpec {
  let rejected = 0;
  return {
    name: RENDER_TOOL,
    description:
      'Show a small interface (closed block list: stack, row, section, text, stat, stat_group, table, list, progress, badge, chart, button, button_group, form, qr, appointment_order). appointment_order = {"type":"appointment_order","appointment_id":"<id from appointment.order_suggestions>"} shows the "create an order for this session?" card with the CURRENT price — never put prices in it. Numbers ONLY via {"$ref":"step:<idx>.<path>"} pointing to a successful tool step of this run; buttons are ui commands or {kind:"action",action_id,input}; forms are bound to an action_id, each field is {name, label?, value?} with name = input path (e.g. "fields.api_key", never "key"), and never prefill secret fields. Input: {"tree":{"version":1,"root":{...}}}.',
    inputSchema: { type: 'object', properties: { tree: { type: 'object' } }, required: ['tree'] },
    origin: 'meta',
    execute: async (input): Promise<ToolOutcome> => {
      const given = (input as { tree?: unknown } | null)?.tree;
      // Một số model gửi cây dạng chuỗi JSON — parse một lần rồi kiểm đầy đủ như cây object (không nới schema).
      let raw = given;
      if (typeof given === 'string') {
        try {
          raw = JSON.parse(given);
        } catch {
          raw = given;
        }
      }
      const c = checkTree(raw);
      const issues = c.ok ? [...(await semanticIssues(d.db, t, c.tree, d.implemented)), ...(await appointmentOrderIssues(d.orderCard, t.authz, c.tree))] : c.issues;
      if (c.ok && !issues.length) return { kind: 'ok', output: { ui: markSecretFields(c.tree) } };
      if (rejected++ < RENDER_RETRIES) return { kind: 'error', code: 'VALIDATION_FAILED', message: `render rejected — fix and call render again: ${issues.join(' | ')}` };
      return { kind: 'ok', output: { ui: errorTree(t.locale), rejected: issues.slice(0, 5) } };
    },
  };
}
