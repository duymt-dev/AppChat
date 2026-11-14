// Preview thêm / kết nối lại tài khoản kênh (TIP-023b R2.8, risk config): Zalo cá nhân → tài khoản mới (tên) + cảnh báo quét QR; quét lại →
// trạng thái → connecting. Hạn mức gói `max_channels` vẫn kiểm ở execute (khoá workspace, DB nền tảng). Chỉ đọc, không mở phiên worker.
import { AppError, serverMessages } from '@appchat/shared';
import type { ActionInput, ActionPreview, channelReconnect, channelZaloStartLogin } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, preview, updated } from '../../../kernel/actions/preview-kit';
import type { ChannelAccounts } from '../../services/accounts.service';

export function startLoginPreview(i: ActionInput<typeof channelZaloStartLogin>): ActionPreview {
  const name = i.label?.trim() || serverMessages('vi').channels.name.zalo_personal;
  return preview('config', name, { changes: [created('channel_account', { type: 'zalo_personal', name })], warnings: ['scan_qr'] });
}

export async function reconnectPreview(accounts: ChannelAccounts, tx: TenantTx, i: ActionInput<typeof channelReconnect>): Promise<ActionPreview> {
  const row = await accounts.live(tx, i.channel_account_id);
  if (row.type !== 'zalo_personal') throw new AppError('INVALID_STATE', 409, { type: row.type });
  return preview('config', row.name, { changes: updated('channel_account', row.id, { status: row.status }, { status: 'connecting' }), warnings: ['scan_qr'] });
}
