// Đọc trạng thái lệnh thao tác trên tin (TIP-014b A) + trạng thái thao tác mới nhất của các tin trong luồng. Route inbox chỉ nhận lệnh
// thu hồi / cảm xúc gắn hội thoại; kiểm quyền hộp thư + scope hội thoại TRƯỚC payload, không thấy → 404 (không lộ tồn tại).
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type AuthzContext, type ChannelOperationDto, type ChannelOperationState } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { canSeeConversation, UUID } from '../../inbox/services/access';

type Row = NonNullable<Awaited<ReturnType<TenantTx['channelOperation']['findUnique']>>>;

const STATE: Record<string, ChannelOperationState> = { queued: 'pending', dispatch_reserved: 'pending' };

export function operationDto(r: Row): ChannelOperationDto {
  const parts = (r.result as { parts?: { part_no: number; status: 'confirmed' | 'failed' | 'unknown' }[] }).parts;
  return {
    id: r.id,
    kind: r.kind as 'recall' | 'react',
    conversation_id: r.conversationId,
    message_id: r.messageId,
    state: STATE[r.status] ?? (r.status as ChannelOperationState),
    ...(r.kind === 'react' ? { emoji: (r.desired as { emoji?: string | null }).emoji ?? null } : {}),
    error: r.error,
    ...(parts ? { parts: parts.map((p) => ({ part_no: p.part_no, status: p.status })) } : {}),
    created_at: r.createdAt.toISOString(),
    finished_at: r.finishedAt?.toISOString() ?? null,
  };
}

/** Trạng thái thao tác hiện hành theo tin (một lần truy vấn cho cả trang luồng): lệnh mới nhất mỗi (tin, loại). */
export async function latestOperations(tx: Pick<TenantTx, '$queryRaw'>, messageIds: string[]): Promise<Map<string, { recall?: ChannelOperationState; react?: ChannelOperationState }>> {
  const out = new Map<string, { recall?: ChannelOperationState; react?: ChannelOperationState }>();
  if (!messageIds.length) return out;
  const rows = await tx.$queryRaw<{ message_id: string; kind: string; status: string }[]>`
    SELECT DISTINCT ON (message_id, kind) message_id::text, kind, status::text
    FROM channel_operation WHERE message_id = ANY(${messageIds}::uuid[])
    ORDER BY message_id, kind, created_at DESC, id DESC`;
  for (const r of rows) {
    const cur = out.get(r.message_id) ?? {};
    cur[r.kind as 'recall' | 'react'] = STATE[r.status] ?? (r.status as ChannelOperationState);
    out.set(r.message_id, cur);
  }
  return out;
}

export class ChannelOperationRead {
  constructor(private readonly tenants: TenantDbResolver) {}

  async get(viewer: { workspaceId: string; userId: string; authz: AuthzContext }, id: string): Promise<ChannelOperationDto> {
    if (!viewer.authz.isOwner && !viewer.authz.permissions.has('inbox.view')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.view' });
    const db = await this.tenants.get(TenantContexts.fromRoute(viewer.workspaceId, 'channel-operations'));
    const r = UUID.test(id) ? await db.channelOperation.findUnique({ where: { id } }) : null;
    const missing = () => new AppError('NOT_FOUND', 404, { operation_id: 'not_found' });
    // Chỉ thao tác trên tin (thu hồi / cảm xúc) — lệnh khác (lịch sử / thăm dò / đồng bộ) đi route quản lý kênh.
    if (!r || (r.kind !== 'recall' && r.kind !== 'react')) throw missing();
    const c = await db.conversation.findUnique({ where: { id: r.conversationId }, select: { id: true, contactId: true, assigneeUserId: true } });
    if (!c || !(await canSeeConversation(db, viewer.authz, c))) throw missing();
    return operationDto(r);
  }
}
