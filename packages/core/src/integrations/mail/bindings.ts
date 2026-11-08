// Vật liệu xác thực callback mail giữ riêng (TIP-012c §4.4–§4.5): chụp TOKEN WEBHOOK (không bao giờ khoá API / mật khẩu SMTP) trong
// transaction đổi phiên bản kết nối (kết nối lại / ngắt), TRƯỚC khi thay / xoá bí mật — chỉ khi kết nối mail đã có thư được nhận.
// Hạn = 30 ngày sau lần nhận gần nhất của kết nối. Binding chỉ xác thực callback cho biên nhận đã có — không gửi, không tạo kết nối.
// Chụp lại cùng phiên bản (phục hồi thao tác) → cùng khoá (connection_id, verification_rev), không nhân đôi. Dọn ở purge.ts.
import type { TenantTx } from '../../kernel/actions/action-context';
import { decryptSecret, encryptSecret, openSecrets } from '../../kernel/crypto';

export const BINDING_TTL_MS = 30 * 86_400_000;
type Tx = Pick<TenantTx, 'integrationConnection' | 'tenantMailDelivery' | 'tenantMailCallbackBinding'>;

/** Chụp token webhook của phiên bản hiện tại (gọi trước khi thay / xoá bí mật). Không có token / chưa thư nào được nhận → không chụp. */
export async function captureBinding(tx: Tx, connectionId: string, operationId: string, key: Buffer, now: Date): Promise<'captured' | 'none'> {
  const c = await tx.integrationConnection.findUnique({ where: { id: connectionId }, select: { port: true, credentialRev: true, secretEnc: true, mailSenders: true } });
  if (!c || c.port !== 'mail' || !c.secretEnc) return 'none';
  const last = await tx.tenantMailDelivery.findFirst({ where: { connectionId, state: 'accepted' }, orderBy: { acceptedAt: 'desc' }, select: { acceptedAt: true } });
  if (!last?.acceptedAt) return 'none';
  const token = openSecrets(c.secretEnc, key).webhook_token;
  if (!token) return 'none';
  const expiresAt = new Date(Math.max(now.getTime(), last.acceptedAt.getTime()) + BINDING_TTL_MS);
  const accountRef = ((c.mailSenders as { account_ref?: string | null } | null)?.account_ref ?? '') || '';
  await tx.tenantMailCallbackBinding.createMany({
    data: [{ connectionId, accountRef, verificationRev: c.credentialRev, verifierEnc: new Uint8Array(encryptSecret(token, key)), operationId, expiresAt, createdAt: now }],
    skipDuplicates: true,
  });
  return 'captured';
}

/** Token đã giữ còn hạn của kết nối (mới nhất trước) — chỉ cho đường callback, không bao giờ cho gửi. */
export async function retainedTokens(tx: Pick<TenantTx, 'tenantMailCallbackBinding'>, connectionId: string, key: Buffer, now: Date): Promise<string[]> {
  const rows = await tx.tenantMailCallbackBinding.findMany({ where: { connectionId, expiresAt: { gt: now }, verifierEnc: { not: null } }, orderBy: { verificationRev: 'desc' }, take: 5, select: { verifierEnc: true } });
  return rows.map((r) => decryptSecret(r.verifierEnc!, key));
}
