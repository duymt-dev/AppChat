// Cảnh báo gán tài khoản kênh khi tạo / xuất bản agent (TIP-022b E): đọc agent đang gán THẬT ở `channel_account.settings.agent_id` (không
// suy từ danh sách loại kênh `cfg.channels`). Bỏ trống = không đổi gán. Đổi gán là action riêng `channel.update_settings` (channels.manage)
// kèm `expected_version` (bản chụp cấu hình lúc xem) — gán bị đổi bởi người khác giữa chừng → 409, giữ gán cũ. agent.create_and_publish
// không vượt quyền này.
import type { ChannelBindingPreviewDto } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { bindingVersion } from '../../channels/services/binding-version';

/** Tài khoản (đang dùng) theo loại kênh của agent; tối đa 50. */
export async function channelBindingPreview(db: Pick<TenantDb, 'channelAccount' | 'aiAgent'>, types: readonly string[]): Promise<ChannelBindingPreviewDto> {
  const rows = await db.channelAccount.findMany({
    where: { status: { not: 'disconnected' }, ...(types.length ? { type: { in: [...types] } } : {}) },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 50,
    select: { id: true, name: true, type: true, settings: true },
  });
  const ids = [...new Set(rows.map((r) => (r.settings as { agent_id?: string | null } | null)?.agent_id).filter((x): x is string => !!x))];
  const names = new Map((await db.aiAgent.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
  return {
    accounts: rows.map((r) => {
      const cur = (r.settings as { agent_id?: string | null } | null)?.agent_id ?? null;
      return { channel_account_id: r.id, name: r.name, type: r.type, current_agent_id: cur, current_agent: cur ? (names.get(cur) ?? '') : '', version: bindingVersion(r.settings) };
    }),
  };
}
