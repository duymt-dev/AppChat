// Kiểm nguồn ký trong transaction (TIP-030c §2.1, §3.3): thứ tự khoá chuẩn — họ khách (015f, id tăng dần) → hợp đồng → người ký → token.
// Họ khách lấy từ contact_id của hợp đồng TRƯỚC khi khoá, đọc lại contact_id sau khoá; đổi (gộp / chuyển) → thử lại có giới hạn rồi 409.
// Token công khai phải còn đúng hợp đồng + người ký, chưa dùng, còn hạn; hợp đồng đang chờ ký đúng bên; chưa sai OTP quá giới hạn.
import { AppError, SIGN_OTP_MAX_FAILS } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { familyIds } from '../../crm/lifecycle/lock';
import type { SigningCapability } from './capability';

export const signInvalid = () => new AppError('SIGN_LINK_INVALID', 410, { token: 'invalid' });

/** Khoá họ khách của hợp đồng rồi hợp đồng (FOR UPDATE), đọc lại contact_id sau khoá. */
export async function lockSigningRoots(tx: TenantTx, contractId: string) {
  for (let i = 0; i < 3; i++) {
    const c0 = await tx.contract.findUnique({ where: { id: contractId }, select: { contactId: true } });
    if (!c0) throw signInvalid();
    const ids = await familyIds(tx, c0.contactId);
    await tx.$queryRaw`SELECT id FROM contact WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
    await tx.$queryRaw`SELECT 1 FROM contract WHERE id = ${contractId}::uuid FOR UPDATE`;
    const c = await tx.contract.findUnique({ where: { id: contractId } });
    if (!c) throw signInvalid();
    if (c.contactId === c0.contactId) return c;
  }
  throw new AppError('CONFLICT', 409, { contact_id: 'family_changed' });
}

/** Bên khách: khoá + kiểm token / hợp đồng / người ký theo capability. `forSign` = còn được ký (không quá giới hạn sai). */
export async function liveCustomer(tx: TenantTx, cap: Pick<SigningCapability, 'contractId' | 'signerId' | 'tokenId' | 'tokenHash'>, now: Date) {
  const c = await lockSigningRoots(tx, cap.contractId);
  await tx.$queryRaw`SELECT 1 FROM contract_signer WHERE id = ${cap.signerId}::uuid FOR UPDATE`;
  const [s, t] = await Promise.all([tx.contractSigner.findUnique({ where: { id: cap.signerId } }), cap.tokenId ? tx.contractSignToken.findUnique({ where: { id: cap.tokenId } }) : null]);
  if (!s || !t || c.deletedAt || s.contractId !== c.id || s.party !== 'customer' || t.contractId !== c.id || t.signerId !== s.id || t.tokenHash !== cap.tokenHash) throw signInvalid();
  if (t.usedAt || t.expiresAt < now || c.status !== 'pending_signature' || s.otpFails >= SIGN_OTP_MAX_FAILS) throw signInvalid();
  return { c, s, t };
}
