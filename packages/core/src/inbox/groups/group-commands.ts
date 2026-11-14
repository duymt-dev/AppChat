// Lệnh quản lý nhóm (TIP-025b §A.3–5): kiểm hội thoại nhóm + tài khoản kênh + năng lực manifest + vai trò tài khoản TRƯỚC khi xếp lệnh;
// ghi `group_command` + outbox `channel.group_command_requested` cùng transaction action. Worker giữ phiên gọi kênh (group-command.runner).
// Kết quả thật theo ACK: thêm thành viên báo từng người (không gộp "thành công hết"); đặt chỗ rồi sập → unknown, không gọi lại.
import { operationMode, type ChannelRegistry, type OperationKind } from '@appchat/channels';
import { AppError, type AuthzContext, type GroupCommandDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { visibleConversation, writableConversation, type Conv } from '../services/access';

export type GroupCommandKind = 'add_members' | 'update' | 'set_mute' | 'refresh' | 'link';
const CAPABILITY: Record<GroupCommandKind, OperationKind> = { add_members: 'group_add_members', update: 'group_settings', set_mute: 'group_mute', refresh: 'group_info', link: 'group_info' };
/** Đổi cài đặt nhóm cần tài khoản là chủ / phó nhóm (khi đã biết vai trò); thêm thành viên / tắt thông báo thành viên thường làm được. */
const NEEDS_ADMIN = new Set<GroupCommandKind>(['update']);

export const supports = (registry: ChannelRegistry, c: Pick<Conv, 'channelType'>, kind: GroupCommandKind) =>
  operationMode(registry.get(c.channelType)?.manifest.capabilities.operations, CAPABILITY[kind]) === 'remote';

/** Hội thoại nhóm người gọi được dùng cho lệnh `kind` (đọc với refresh, ghi với lệnh khác). Không phải nhóm → INVALID_TRANSITION. */
export async function groupConversation(tx: TenantTx, authz: AuthzContext, registry: ChannelRegistry, id: string, kind: GroupCommandKind | 'policy'): Promise<Conv> {
  const c = kind === 'refresh' || kind === 'link' ? await visibleConversation(tx, authz, id) : await writableConversation(tx, authz, id);
  if (c.kind !== 'group') throw new AppError('INVALID_TRANSITION', 409, { conversation_id: 'not_group' });
  if (kind === 'policy') return c;
  if (!supports(registry, c, kind)) throw new AppError('VALIDATION_FAILED', 422, { conversation_id: `${CAPABILITY[kind]}_unsupported` });
  const acc = await tx.channelAccount.findUnique({ where: { id: c.channelAccountId }, select: { status: true, pausedAt: true } });
  if (!acc || acc.status !== 'connected' || acc.pausedAt) throw new AppError('INVALID_STATE', 409, { channel_account_id: acc?.pausedAt ? 'paused' : (acc?.status ?? 'missing') });
  if (NEEDS_ADMIN.has(kind)) {
    const st = await tx.conversationGroupState.findUnique({ where: { conversationId: c.id }, select: { accountRole: true } });
    if (st?.accountRole === 'member') throw new AppError('FORBIDDEN', 403, { group: 'account_not_admin' });
  }
  return c;
}

export async function queueGroupCommand(tx: TenantTx, c: Conv, kind: GroupCommandKind, actorId: string | null, desired: Record<string, unknown>, now: Date, expectedVersion?: string) {
  const id = uuidv7(now.getTime());
  await tx.groupCommand.create({ data: { id, kind, channelAccountId: c.channelAccountId, conversationId: c.id, actorId, desired: desired as object, expectedVersion: expectedVersion ?? null, createdAt: now, updatedAt: now } });
  return { id, event: { topic: 'channel.group_command_requested', payload: { command_id: id, channel_account_id: c.channelAccountId } } };
}

const STATE: Record<string, GroupCommandDto['state']> = { queued: 'pending', dispatch_reserved: 'pending' };

/** Link tham gia (lệnh `link`) được trả trong 10 phút sau khi đọc, chỉ cho người yêu cầu (kiểm ở group-read). */
export const LINK_VISIBLE_MS = 10 * 60_000;

export function groupCommandDto(r: { id: string; kind: string; conversationId: string; status: string; error: string | null; result: unknown; createdAt: Date; finishedAt: Date | null }, link?: { enabled: boolean; url: string | null }): GroupCommandDto {
  const members = (r.result as { members?: { id: string; status: 'confirmed' | 'failed' | 'unknown'; error?: string }[] }).members;
  return {
    id: r.id,
    kind: r.kind as GroupCommandKind,
    conversation_id: r.conversationId,
    state: STATE[r.status] ?? (r.status as GroupCommandDto['state']),
    error: r.error,
    ...(members ? { members: members.map((m) => ({ id: m.id, status: m.status, error: m.error ?? null })) } : {}),
    ...(link ? { link } : {}),
    created_at: r.createdAt.toISOString(),
    finished_at: r.finishedAt?.toISOString() ?? null,
  };
}
