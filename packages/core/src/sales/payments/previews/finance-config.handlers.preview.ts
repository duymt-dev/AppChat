// Preview cấu hình tài chính (TIP-023b R2.8): tài khoản nhận tiền → ngân hàng / số TK / chủ TK trước / sau (nguồn VietQR của đề nghị); bank
// feed kết nối → nhà cung cấp + số TK (trường không bí mật), kiểm trường bắt buộc như connect — không gọi provider, không hiện secret; ngắt →
// nhà cung cấp + số TK đang nhận, cảnh báo giao dịch mới không tự khớp nữa. Chỉ đọc.
import type { ActionInput, ActionPreview, bankFeedConnect, bankFeedDisconnect, paymentAccountUpdate } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../../kernel/actions/preview-kit';
import type { ConnectionsService } from '../../../integrations/public';

export async function accountPreview(tx: TenantTx, i: ActionInput<typeof paymentAccountUpdate>): Promise<ActionPreview> {
  const a = await tx.paymentAccount.findUnique({ where: { id: 1 } });
  const cur = { bank: a?.bank ?? null, bank_bin: a?.bankBin ?? null, account_no: a?.accountNo ?? null, account_name: a?.accountName ?? null };
  const next = { bank: i.bank.trim(), bank_bin: i.bank_bin, account_no: i.account_no, account_name: i.account_name.trim().toUpperCase() };
  return preview('config', line(next.bank, next.account_no), { changes: updated('payment_account', '1', cur, next) });
}

export async function connectPreview(tx: TenantTx, connections: ConnectionsService | null, i: ActionInput<typeof bankFeedConnect>): Promise<ActionPreview> {
  if (!connections) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'integrations chưa cấu hình (APP_ENC_KEY)');
  const e = connections.entry(i.provider);
  const { config } = connections.split(e, i.fields);
  const accountNo = String(config.account_number ?? '').replace(/\D/g, '');
  const existing = await tx.integrationConnection.findFirst({ where: { connectorKey: i.provider, status: { not: 'disconnected' } }, select: { id: true } });
  return preview('config', line(e.manifest.name, accountNo), { changes: [created('bank_feed', { provider: i.provider, account_no: accountNo || undefined }, existing?.id)], ...(existing ? { warnings: ['reconnect'] } : {}) });
}

export async function disconnectPreview(tx: TenantTx, i: ActionInput<typeof bankFeedDisconnect>): Promise<ActionPreview> {
  const row = await tx.integrationConnection.findFirst({ where: { connectorKey: i.provider, status: { not: 'disconnected' } }, select: { id: true, name: true } });
  if (!row) throw new AppError('NOT_FOUND', 404, { provider: 'not_connected' });
  const feed = await tx.tenantBankFeed.findUnique({ where: { connectionId: row.id }, select: { id: true, accountNo: true, status: true } });
  return preview('config', line(row.name, feed?.accountNo), {
    changes: [{ entity: 'bank_feed', id: feed?.id ?? row.id, before: { provider: i.provider, status: feed?.status ?? 'active' }, after: { status: 'disconnected' } }],
    warnings: ['auto_match_off'],
  });
}
