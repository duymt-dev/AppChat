// Preview quản lý tài khoản kênh (TIP-023b R2.8, drawer REQ-B11): cấu hình trước / sau chỉ trường đổi · tạm dừng / tiếp tục · lịch sử đồng
// bộ · ngắt kết nối (lịch sử giữ; tài khoản cuối của loại kênh → cảnh báo). Tài khoản lạ / đã ngắt → 404, agent lạ → 404 như execute.
// Chỉ đọc, không gửi lệnh worker.
import type { ActionInput, ActionPreview, channelDisconnect, channelPause, channelResume, channelSyncHistory, channelUpdateSettings } from '@appchat/actions';
import { channelRegistry } from '@appchat/channels';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { assertAgentAssignable } from '../../../ai/agents/agent-names';
import { settingsOf, type ChannelAccounts } from '../../services/accounts.service';

export async function updateSettingsPreview(accounts: ChannelAccounts, tx: TenantTx, i: ActionInput<typeof channelUpdateSettings>): Promise<ActionPreview> {
  const row = await accounts.live(tx, i.channel_account_id);
  const { name, agent_id, ...rest } = i.patch;
  await assertAgentAssignable(tx, agent_id);
  const cur = { name: row.name, ...settingsOf(row) };
  // D35: trần ngày cao hơn mặc định manifest → rủi ro khoá tài khoản (vẫn cho lưu, người bấm thấy cảnh báo).
  const capDefault = channelRegistry.manifests().find((m) => m.type === row.type)?.rateLimit.perDayProactive;
  const risky = capDefault !== undefined && (i.patch.daily_cap ?? 0) > capDefault;
  return preview('config', row.name, { changes: updated('channel_account', row.id, cur, { name, ...rest, agent_id: agent_id === undefined ? undefined : agent_id || null }), ...(risky ? { warnings: [`daily_cap_over_default:${capDefault}`] } : {}) });
}

export async function pausePreview(accounts: ChannelAccounts, tx: TenantTx, i: ActionInput<typeof channelPause>): Promise<ActionPreview> {
  const row = await accounts.live(tx, i.channel_account_id);
  return preview('config', row.name, { changes: updated('channel_account', row.id, { paused: !!row.pausedAt }, { paused: true }), warnings: ['stops_receiving'] });
}

export async function resumePreview(accounts: ChannelAccounts, tx: TenantTx, i: ActionInput<typeof channelResume>): Promise<ActionPreview> {
  const row = await accounts.live(tx, i.channel_account_id);
  return preview('config', row.name, { changes: updated('channel_account', row.id, { paused: !!row.pausedAt }, { paused: false }) });
}

export async function syncHistoryPreview(accounts: ChannelAccounts, tx: TenantTx, i: ActionInput<typeof channelSyncHistory>): Promise<ActionPreview> {
  const row = await accounts.live(tx, i.channel_account_id);
  const run = row.status === 'connected' && !row.pausedAt && i.history_days > 0;
  return preview('write', row.name, { changes: updated('channel_account', row.id, { history_days: settingsOf(row).history_days }, { history_days: i.history_days }), ...(run ? { warnings: [`sync:${i.history_days}`] } : {}) });
}

export async function disconnectPreview(accounts: ChannelAccounts, tx: TenantTx, i: ActionInput<typeof channelDisconnect>): Promise<ActionPreview> {
  const row = await accounts.live(tx, i.channel_account_id);
  const others = await tx.channelAccount.count({ where: { type: row.type, status: { not: 'disconnected' }, id: { not: row.id } } });
  return preview('delete', row.name, {
    changes: [removed('channel_account', row.id, { type: row.type, name: row.name, status: row.status })],
    warnings: ['history_kept', ...(others ? [] : [`last_account:${row.type}`])],
  });
}
