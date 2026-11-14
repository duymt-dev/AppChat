// Kiểm lại sau sự cố cho MỘT operation đã có chữ thô (TIP-019c §3.7, lát khôi phục): không gọi lại model. Giải LẠI nguồn hiện tại theo
// `source_bindings` (refs) bằng quyền hệ thống (toàn quyền đọc — chỉ để phát hiện dữ liệu đổi / còn tồn, KHÔNG cấp quyền thay actor gốc
// đã kiểm lúc sinh), rồi chạy ĐÚNG validator của action đó trên chữ thô cũ với chunk MỚI. Tin / khách đã xoá, thu hồi, gộp → giải nguồn
// lỗi → `invalidated`. Nguồn là chữ dán (không refs, chữ không lưu theo chủ ý thiết kế — §1.4) → không thể kiểm lại, `unknown`, không gọi
// lại model. Trích dẫn không còn khớp nội dung mới → `invalid_citation` tự nhiên từ validator → `failed` (không công khai kết quả sai).
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { parseModelJson, UtilityOutputError, type AuthzContext, type PermissionKey } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { conversationSource } from './sources/conversation';
import { contactSource } from './sources/contact';
import type { SourceChunk } from './sources/types';
import { failOperation, invalidateOperation, publishValidated } from './utility-operations';
import type { Revalidate, RevalidateOutcome } from './utility-recovery';

const SYSTEM_AUTHZ: AuthzContext = { userId: '00000000-0000-0000-0000-000000000000', isOwner: true, permissions: new Set<PermissionKey>(), scope: {} as never, teamIds: [] };

/** `source_bindings` lưu dạng `{refs, params}` (TIP-019c §3.1) — refs để giải lại nguồn, params để dựng đúng validator. */
interface SourceBindings {
  refs?: { conversation_id?: string; contact_id?: string; message_ids?: string[] };
  params?: Record<string, unknown>;
}

/** Nguồn hiện tại theo refs đã lưu — null khi refs rỗng (chữ dán, không có gì để giải lại); throw khi tin / khách không còn đọc được. */
async function currentChunks(tx: TenantTx, refs: { conversation_id?: string; contact_id?: string; message_ids?: string[] }): Promise<SourceChunk[] | null> {
  const chunks: SourceChunk[] = [];
  if (refs.contact_id) chunks.push(...(await contactSource(tx, SYSTEM_AUTHZ, refs.contact_id)).chunks);
  if (refs.conversation_id && refs.message_ids?.length) chunks.push(...(await conversationSource(tx, SYSTEM_AUTHZ, { conversation_id: refs.conversation_id, message_ids: refs.message_ids })).chunks);
  return chunks.length ? chunks : null;
}

/** Dựng validator từ `params` đã lưu lúc sinh (không gọi lại model) — đăng ký theo action ở `utility.handlers`/`ai.module`. */
export type ValidatorOf = (actionId: string, params: Record<string, unknown>) => ((raw: unknown, chunks: SourceChunk[]) => unknown) | null;

/** `revalidate` cho `recoverUtilities`: tái dùng validator của action đó (đăng ký ở ai.module qua `validatorOf`). */
export function makeRevalidate(_tenants: TenantDbResolver, _platform: Pick<PlatformDb, 'workspace'>, validatorOf: ValidatorOf): Revalidate {
  return async (tx: TenantTx, actionId: string, operationId: string, payload: string): Promise<RevalidateOutcome> => {
    const op = await tx.utilityOperation.findUnique({ where: { id: operationId } });
    if (!op) return 'failed';
    const bindings = (op.sourceBindings ?? {}) as SourceBindings;
    const refs = bindings.refs ?? {};
    let chunks: SourceChunk[] | null;
    try {
      chunks = await currentChunks(tx, refs);
    } catch {
      await invalidateOperation(tx, operationId); // tin / khách đã xoá, thu hồi, gộp, hoặc ngoài scope hệ thống (không thể xảy ra) từ lúc sinh.
      return 'invalidated';
    }
    if (!chunks) {
      // Chữ dán — không refs để giải lại, chủ ý không lưu chữ nguồn (§1.4). Không gọi lại model, không bịa kiểm.
      await failOperation(tx, operationId, 'unknown', op.repaired);
      return 'failed';
    }
    const validate = validatorOf(actionId, bindings.params ?? {});
    if (!validate) {
      await failOperation(tx, operationId, 'unknown', op.repaired);
      return 'failed';
    }
    try {
      const proposal = validate(parseModelJson(payload), chunks);
      await publishValidated(tx, operationId, proposal);
      return 'validated';
    } catch (e) {
      await failOperation(tx, operationId, e instanceof UtilityOutputError ? e.code : 'unknown', op.repaired);
      return 'failed';
    }
  };
}
