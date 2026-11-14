// Một lượt gọi action chuẩn (TIP-034c §3.4): khoá Idempotency dùng lại qua xem trước / xác nhận (không khoá mới khi gửi lại), 202 preview →
// hộp xác nhận → gửi lại với confirm_token; ô bí mật GenUI qua vault. Dùng chung cho useAction và cầu nối hoàn tác (useUndoAction) — một
// vòng chính sách duy nhất, không gọi hook lồng, không có đường POST ghi thứ hai.
import {
  REQUESTABLE_PREVIEW_ACTIONS,
  getAction,
  requiresIdempotencyKey,
  type ActionPreview,
} from '@appchat/actions';
import { transport } from '../api/client';
import type { ActionResponse } from '../api/transport';

export interface RequestOptions {
  /** Hỏi người dùng xác nhận thẻ xem trước; false = huỷ. */
  ask: (actionId: string, preview: ActionPreview) => Promise<boolean>;
  genui?: { intent: string; secretPaths?: string[] };
}

/** Bản sao input không có các ô bí mật (`fields.password`). */
export function withoutPaths(input: unknown, paths: string[]): unknown {
  if (!paths.length || !input || typeof input !== 'object') return input;
  const out = structuredClone(input) as Record<string, unknown>;
  for (const p of paths) {
    const keys = p.split('.');
    const parent = keys
      .slice(0, -1)
      .reduce<unknown>(
        (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
        out,
      );
    if (parent && typeof parent === 'object') delete (parent as Record<string, unknown>)[keys.at(-1)!];
  }
  return out;
}

/** Gửi action; trả phản hồi cuối (200 hoặc 202 không phải preview) hoặc null khi người dùng huỷ xem trước. */
export async function runActionRequest<O>(
  id: string,
  input: unknown,
  o: RequestOptions,
): Promise<ActionResponse<O> | null> {
  const def = getAction(id);
  // Một khoá mỗi lần bấm (dùng lại khi xác nhận preview) — gửi lại do mạng không tạo bản ghi thứ hai.
  const idem = {
    ...(def && requiresIdempotencyKey(id, def.risk) ? { idempotencyKey: crypto.randomUUID() } : {}),
    ...(o.genui ? { genuiIntent: o.genui.intent } : {}),
  };
  // TIP-028b: gửi / duyệt chứng từ → xin xem trước để ConfirmActionHost hiện bảng kiểm pháp lý (cảnh báo, không chặn).
  const res = await transport.action<O>(id, input, {
    ...idem,
    ...(REQUESTABLE_PREVIEW_ACTIONS.has(id) ? { preview: true } : {}),
  });
  if (res.status !== 202 || res.data.status !== 'preview_required') return res;
  if (!(await o.ask(id, res.data.preview))) return null;
  const vault = (res.data as { secret_vault?: string }).secret_vault;
  return vault
    ? transport.action<O>(id, withoutPaths(input, o.genui?.secretPaths ?? []), {
        ...idem,
        confirmToken: res.data.confirm_token,
        secretVault: vault,
      })
    : transport.action<O>(id, input, { ...idem, confirmToken: res.data.confirm_token });
}
