// Cài đặt nhóm Zalo cá nhân (TIP-025b §A.3–4) trên cổng thao tác 014b: đổi tên (1–100 ký tự) / bật-tắt link tham gia / tắt thông báo của
// chính TÀI KHOẢN kênh. Chỉ allowlist này — không chuyển chủ, không xoá thành viên, không cài đặt tuỳ ý. Vai trò tài khoản suy từ
// creatorId / adminIds của getGroupInfo (người tạo = owner). Lỗi tham số → ChannelOperationError('invalid') TRƯỚC khi gọi kênh.
import { ChannelOperationError, type GroupSettingsPatch } from '../operations';
import type { ZaloGroupInfo, ZaloSession } from './transport';

export const GROUP_NAME_MAX = 100;

/** Vai trò của tài khoản (`ownId`) trong nhóm; nhà cung cấp không trả người tạo / phó nhóm → null (chưa biết, không đoán). */
export function accountRoleOf(g: ZaloGroupInfo, ownId: string): 'owner' | 'admin' | 'member' | null {
  if (!g.creatorId && !g.adminIds) return null;
  if (g.creatorId === ownId) return 'owner';
  return g.adminIds?.includes(ownId) ? 'admin' : 'member';
}

export async function applyGroupSettings(s: ZaloSession, groupId: string, patch: GroupSettingsPatch): Promise<{ linkEnabled: boolean | null }> {
  const name = patch.name?.trim();
  if (patch.name !== undefined && (!name || name.length > GROUP_NAME_MAX)) throw new ChannelOperationError('invalid', 'name');
  if (name === undefined && patch.inviteLinkEnabled === undefined) throw new ChannelOperationError('invalid', 'empty_patch');
  if (name !== undefined) await s.changeGroupName(groupId, name);
  if (patch.inviteLinkEnabled !== undefined) await s.setGroupLink(groupId, patch.inviteLinkEnabled);
  return { linkEnabled: patch.inviteLinkEnabled ?? null };
}
