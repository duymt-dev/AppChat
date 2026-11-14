// Sửa thẻ xem trước của Trợ lý (TIP-023b REQ-E03b): `POST /assistant/preview-edit { confirm_token, input }`. Chỉ xem trước lại — không thực
// thi. Token cũ (Redis của Trợ lý + token của executor) bị thu hồi trước; input mới đi lại đúng đường call_action: đổi mã → id trong scope,
// chặn trường tuỳ biến không phải AI, executor validate + quyền HIỆN TẠI + preview → token mới gắn actor / action / input mới / TTL. Bản ghi
// hoặc quyền đổi giữa hai bước → lỗi của executor (404 / 403 / 409 / 422) trả nguyên, thẻ cũ không chạy được nữa. Ô bí mật đã ẩn khỏi thẻ
// giữ giá trị cũ (form không sửa được secret).
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { AppError, type AuthzContext, type ConfirmEventDto } from '@appchat/shared';
import type { ToolExecutor } from '../../kernel/actions/executor';
import type { KeyValueStore } from '../../kernel/redis';
import { confirmCard } from './card';
import { resolveCodes } from './code-refs';
import { aiCustomErrors } from './custom-schema';
import { assistantActionCtx, assistantIdemKey } from './meta-tools';
import { bindToken, keepHidden, replacePending, takePending } from './pending-action';
import { acceptedOutcome } from './read-dispatch';
import { replaceCard } from './sessions';
import type { AssistantTurnCtx } from './types';
import { bindingOf } from './plans/driver';
import { selectedCtx } from './plans/selected-agent';

const DEFS = new Map(registry.map((a) => [a.id, a]));

export interface EditDeps {
  executor: ToolExecutor;
  kv: KeyValueStore;
  now: () => Date;
}

export interface EditRequest {
  ws: string;
  userId: string;
  authz: AuthzContext;
  role?: string;
  token: string;
  input: Record<string, unknown>;
}

export async function editPreview(d: EditDeps, db: TenantDb, q: EditRequest): Promise<{ card: ConfirmEventDto }> {
  const p = await takePending(d.kv, db, d.now, q.userId, q.token);
  const def = DEFS.get(p.actionId);
  if (!def) throw new AppError('ACTION_NOT_FOUND', 404, undefined, p.actionId);
  const run = p.run.input as { mode?: 'chat' | 'cowork'; locale?: string; role?: string; selected_agent?: unknown };
  const t: AssistantTurnCtx = { ws: q.ws, runId: p.run.id, userId: q.userId, authz: q.authz, mode: run.mode ?? 'cowork', locale: run.locale ?? 'vi', role: q.role ?? run.role, ...selectedCtx(run) };
  try {
    const { input } = await resolveCodes(db, def.id, keepHidden(p.input, q.input), q.authz);
    const notAi = await aiCustomErrors(db, def, input, q.authz.isOwner ? 'owner' : (t.role ?? 'member'));
    if (Object.keys(notAi).length) throw new AppError('VALIDATION_FAILED', 422, notAi);
    const stepIdx = p.state.stepIdx - 1;
    const idem = def.risk === 'read' ? {} : { idempotencyKey: assistantIdemKey(p.run.id, stepIdx, p.state.pendingToolCall.toolCallId) };
    // Sửa thẻ của bước kế hoạch: xem trước lại vẫn theo đúng binding cũ (bước + thế hệ) — không đổi bước bằng cách sửa input.
    const planBinding = bindingOf(p.state.binding);
    const out = await d.executor.execute(assistantActionCtx(t, stepIdx, { ...idem, ...(planBinding ? { planBinding } : {}) }), def.id, input);
    // Xem trước lại bắt buộc ra 202 preview: 200 (action đọc) / chờ duyệt không phải đường Sửa của thẻ xác nhận.
    const o = out.status === 202 ? acceptedOutcome(out.data, input) : null;
    if (!o || o.kind !== 'needs_confirmation') throw new AppError('CONFLICT', 409, { confirm_token: 'not_previewable' });
    await replacePending(db, d.kv, p, q.token, input);
    await bindToken(d.kv, o.confirmToken, p.run.id);
    const card = confirmCard(def, o.preview, o.confirmToken, t.locale, input);
    await replaceCard(db, p.run.id, q.token, card);
    return { card };
  } catch (e) {
    // Lỗi (validation / quyền / bản ghi đổi): thẻ cũ vẫn chờ với input cũ — trả token cho chủ để sửa tiếp hoặc huỷ.
    await bindToken(d.kv, q.token, p.run.id);
    throw e;
  }
}
