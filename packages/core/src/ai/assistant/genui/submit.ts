// Gửi action từ node GenUI (TIP-023c hợp đồng 3 + 4): trình duyệt mang intent handle → server kiểm intent (người / workspace / action /
// input nút / ô form) → ngữ cảnh assistant do SERVER đặt (source assistant, actor assistant(người dùng), run của cây) → executor bắt
// xem trước / xác nhận như call_action. Ô bí mật: lần xem trước nhận giá trị thật từ form → cất vault (AES-256-GCM, gắn người /
// action / intent) và gỡ khỏi input trước khi hash confirm_token; lần xác nhận ghép lại từ vault, ack SAU khi action đã commit.
import { getAction } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../../kernel/actions/action-context';
import type { ExecuteOutcome, ToolExecutor } from '../../../kernel/actions/executor';
import type { GenUiIntents } from '../../../kernel/actions/genui-intent';
import { secretPaths, stripSecrets } from '../../../kernel/actions/secret-fields';
import { mergeSecrets, type SecretVault } from '../../../kernel/actions/secret-vault';

export interface GenUiSubmitDeps {
  executor: ToolExecutor;
  intents: GenUiIntents | null;
  vault: SecretVault | null;
}

const pick = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((x, k) => (x && typeof x === 'object' && Object.prototype.hasOwnProperty.call(x, k) ? (x as Record<string, unknown>)[k] : undefined), o);

/** Giá trị bí mật trong input (đường dẫn → chuỗi không rỗng). */
function secretsOf(paths: string[], input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of paths) {
    const v = pick(input, p);
    if (typeof v === 'string' && v !== '') out[p] = v;
  }
  return out;
}

/** Ngữ cảnh do server đặt: không dùng nguồn / actor từ header của trình duyệt. */
export const genUiCtx = (base: ActionContext, runId: string): ActionContext => ({
  workspaceId: base.workspaceId,
  source: 'assistant',
  actor: { type: 'assistant', id: base.actor.id },
  onBehalfOfUserId: base.actor.id,
  runId,
  authz: base.authz,
  ...(base.idempotencyKey ? { idempotencyKey: base.idempotencyKey } : {}),
  ...(base.confirmToken ? { confirmToken: base.confirmToken } : {}),
});

export async function runGenUiAction(d: GenUiSubmitDeps, base: ActionContext, actionId: string, q: { handle: string; input: unknown; vault?: string }): Promise<ExecuteOutcome> {
  if (!d.intents) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'genui intent chưa cấu hình');
  const def = getAction(actionId);
  if (!def) throw new AppError('ACTION_NOT_FOUND', 404, undefined, actionId);
  const userId = base.actor.id;
  const raw = (q.input ?? {}) as Record<string, unknown>;
  const paths = secretPaths(def, raw);
  const secrets = secretsOf(paths, raw);
  // Input không bí mật là thứ gắn intent / confirm_token; bí mật đi đường riêng.
  const plain = stripSecrets(def, raw) as Record<string, unknown>;
  const intent = await d.intents.resolve(q.handle, { workspaceId: base.workspaceId, userId, actionId, input: plain });
  const ctx = genUiCtx(base, intent.runId);
  const binding = { workspaceId: base.workspaceId, userId, actionId, intent: q.handle };

  // Lần xác nhận: bí mật lấy từ vault (form không gửi lại), ack sau khi có receipt.
  if (q.vault) {
    if (!d.vault) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'secret vault chưa cấu hình');
    if (Object.keys(secrets).length) throw new AppError('VALIDATION_FAILED', 422, { secret: 'use_vault_only' });
    const stored = await d.vault.claim(q.vault, binding);
    try {
      const out = await d.executor.execute(ctx, actionId, mergeSecrets(plain, stored));
      if (out.status === 200) await d.vault.ack(q.vault);
      else await d.vault.release(q.vault);
      return out;
    } catch (e) {
      await d.vault.release(q.vault);
      throw e;
    }
  }

  if (!Object.keys(secrets).length) return d.executor.execute(ctx, actionId, plain);
  if (!d.vault) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'secret vault chưa cấu hình');
  // Lần đầu có bí mật: chạy (preview hoặc chạy thẳng nếu policy cho) với input đầy đủ; nếu 202 preview → cất vault cho bước xác nhận.
  const out = await d.executor.execute(ctx, actionId, mergeSecrets(plain, secrets));
  // Handle vault đi trong 202 (cùng confirm_token); trình duyệt xác nhận bằng `secret_vault`, không gửi lại bí mật.
  if (out.status === 202 && out.data.status === 'preview_required') return { status: 202, data: { ...out.data, secret_vault: await d.vault.put(binding, secrets) } as typeof out.data };
  return out;
}
