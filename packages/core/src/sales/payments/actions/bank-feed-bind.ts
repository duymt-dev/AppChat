// `bank_feed.connect { connection_id, if_version }` (TIP-012b §5.2): gắn feed tài chính vào kết nối SePay / Casso ĐÃ LƯU — kiểm kết nối
// hiện tại cùng tenant / provider / port bank_feed / tài khoản đã cấu hình / phiên bản khoá, dùng khoá đã lưu bên trong (không gửi lại,
// không trả ra). Không xoay khoá (không đổi credential_rev, không huỷ lệnh / con trỏ kéo). Kết nối lại feed cũ giữ feed_id (link webhook
// đã dán). Pha tenant ghi feed, pha nền tảng ghi route — cùng khung 045b của nhánh `fields`.
import { accountOrEmpty } from '@appchat/integrations';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { webhookPathOf } from '../services/bank-feed';

export interface BindPlan {
  bind: true;
  /** `finalizePlatform` chung đọc `conn.id` (route webhook) + `feedId` + `provider` (route feed). */
  conn: { id: string };
  connectionId: string;
  credentialRev: number;
  feedId: string;
  accountNo: string;
  provider: string;
  at: string;
}

/** Pha nền tảng (tenant chỉ đọc): kiểm kết nối hiện tại → kế hoạch gắn. 404 chung cho kết nối lạ / provider lệch / đã ngắt. */
export async function bindExisting(_ctx: ActionContext, tx: TenantTx, provider: string, connectionId: string, ifVersion: number | undefined, now: Date) {
  const row = await tx.integrationConnection.findUnique({ where: { id: connectionId } });
  if (!row || row.connectorKey !== provider || row.port !== 'bank_feed' || row.status === 'disconnected' || !row.secretEnc) throw new AppError('NOT_FOUND', 404, { connection_id: 'not_found' });
  if (ifVersion !== undefined && ifVersion !== row.credentialRev) throw new AppError('CONFLICT', 409, { if_version: 'stale' });
  const accountNo = accountOrEmpty((row.config as Record<string, unknown>).account_number);
  // Khớp tự động cần tài khoản đã ràng buộc (§1.2) — kết nối chưa có số tài khoản không được bật khớp tiền.
  if (!accountNo) throw new AppError('VALIDATION_FAILED', 422, { account_number: 'required' });
  const existing = await tx.tenantBankFeed.findUnique({ where: { connectionId: row.id } });
  const feedId = existing?.id ?? uuidv7(now.getTime());
  const plan: BindPlan = { bind: true, conn: { id: row.id }, connectionId: row.id, credentialRev: row.credentialRev, feedId, accountNo, provider, at: now.toISOString() };
  return {
    result: { feed_id: feedId, webhook_path: webhookPathOf(provider, feedId) },
    after: { provider, feed_id: feedId, account_no: accountNo, mode: row.mode, connection_id: row.id },
    tenantPlan: plan as unknown as Record<string, unknown>,
  };
}

/** Pha tenant: rào phiên bản khoá (đổi khoá giữa hai pha → 409, không gắn khoá cũ), bật / tạo feed. */
export async function applyBind(tx: TenantTx, p: BindPlan) {
  const row = await tx.integrationConnection.findUnique({ where: { id: p.connectionId } });
  if (!row || row.status === 'disconnected' || row.credentialRev !== p.credentialRev) throw new AppError('CONFLICT', 409, { if_version: 'stale' });
  const existing = await tx.tenantBankFeed.findUnique({ where: { id: p.feedId } });
  if (existing) await tx.tenantBankFeed.update({ where: { id: p.feedId }, data: { status: 'active', accountNo: p.accountNo, provider: p.provider } });
  else await tx.tenantBankFeed.create({ data: { id: p.feedId, connectionId: row.id, provider: p.provider, accountNo: p.accountNo, createdAt: new Date(p.at) } });
  return { events: [] };
}
