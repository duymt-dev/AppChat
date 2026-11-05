// Thao tác đang chờ xác nhận của Trợ lý (TIP-023b R1.6 / REQ-E03b): ánh xạ token → run nằm ở Redis, còn input chuẩn hoá (đã đổi mã → id,
// đã qua scope) lưu cùng run (`ai_run.state.canonicalInput`) — không phụ thuộc RAM, chạy được ở process khác. Hàm ở đây: đọc snapshot của
// run đang chờ, thay snapshot khi người dùng Sửa (token mới, token cũ bị thu hồi), và trình bày input cho thẻ (bỏ ô bí mật).
import type { PausedState } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { KeyValueStore } from '../../kernel/redis';
import { CONFIRM_TTL_MS, hashInput, revokeConfirm } from '../../kernel/actions/confirm-token';
import { RunStore, type RunRow } from '../runs/run.store';
import { safeForModel } from './read-dispatch';

export const cfKey = (token: string) => `assistant:confirm:${token}`;

export interface Pending {
  run: RunRow;
  state: PausedState;
  actionId: string;
  /** Input executor sẽ chạy khi xác nhận (canonical; thẻ cũ trước 023b → input thô của lời gọi). */
  input: unknown;
  /** sha256 ổn định của input — thẻ / log so được hai bước mà không lộ input. */
  digest: string;
}

/** Run đang chờ của token, chỉ của người tạo; token lạ / hết hạn → 409, run của người khác → 404 (trả token lại cho chủ). */
export async function takePending(kv: KeyValueStore, db: TenantDb, now: () => Date, userId: string, token: string): Promise<Pending> {
  const runId = await kv.getdel(cfKey(token));
  if (!runId) throw new AppError('CONFLICT', 409, { confirm_token: 'expired' }, 'CONFIRM_EXPIRED');
  const run = await new RunStore(db, now).get(runId);
  if (!run || run.kind !== 'assistant' || run.initiatedByUserId !== userId) {
    // Không phải người tạo: trả token lại cho chủ (đoán token của người khác không làm mất thẻ của họ).
    if (run) await kv.set(cfKey(token), runId, 'PX', CONFIRM_TTL_MS);
    throw new AppError('NOT_FOUND', 404, { confirm_token: 'not_found' });
  }
  if (run.status !== 'waiting_approval' || !run.state) throw new AppError('CONFLICT', 409, { confirm_token: 'expired' }, 'CONFIRM_EXPIRED');
  const state = run.state as unknown as PausedState;
  const call = state.pendingToolCall.input as { action_id: string; input?: unknown };
  const input = state.canonicalInput ?? call.input ?? {};
  return { run, state, actionId: call.action_id, input, digest: hashInput(input) };
}

/** Gắn token mới vào run (thẻ mới). */
export const bindToken = (kv: KeyValueStore, token: string, runId: string) => kv.set(cfKey(token), runId, 'PX', CONFIRM_TTL_MS);

/**
 * Sửa thẻ: snapshot mới thay snapshot cũ trong run (canonicalInput + input của lời gọi đang chờ), token cũ của executor bị thu hồi — confirm
 * cũ không chạy được input cũ lẫn input mới (token mới gắn input mới).
 */
export async function replacePending(db: TenantDb, kv: KeyValueStore, p: Pending, oldToken: string, input: unknown): Promise<void> {
  await revokeConfirm(kv, oldToken);
  const call = p.state.pendingToolCall;
  const state: PausedState = { ...p.state, canonicalInput: input, pendingToolCall: { ...call, input: { ...(call.input as object), input } } };
  await db.aiRun.update({ where: { id: p.run.id }, data: { state: JSON.parse(JSON.stringify(state)) as object } });
}

/** Input hiển thị trên thẻ / form Sửa: bỏ ô bí mật theo tên (không đưa secret vào lịch sử chat), không cắt mảng (Sửa không mất dòng). */
export const presentInput = (input: unknown): Record<string, unknown> | undefined =>
  input && typeof input === 'object' && !Array.isArray(input) ? (safeForModel(input, Number.MAX_SAFE_INTEGER) as Record<string, unknown>) : undefined;

/** Input Sửa giữ lại ô bí mật đã ẩn khỏi thẻ (form không gửi được ô đó — không để người dùng sửa secret qua chat). */
export function keepHidden(prev: unknown, next: Record<string, unknown>): Record<string, unknown> {
  const p = (prev ?? {}) as Record<string, unknown>;
  const shown = presentInput(p) ?? {};
  return { ...next, ...Object.fromEntries(Object.keys(p).filter((k) => !(k in shown)).map((k) => [k, p[k]])) };
}
