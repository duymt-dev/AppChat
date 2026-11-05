// Đổi Chủ sở hữu workspace (TIP-045b annex A3, rbac §7). Hai bước, đều là thao tác nền tảng có sổ (kernel/consistency):
// 1) `requestOtp`: Owner hiện tại (đọc `workspace.owner_user_id`, không tin quyền `workspace.transfer_ownership` — uỷ quyền không chuyển
//    được) xin mã cho một thành viên active khác; mã 6 số chỉ lưu sha256, hạn 10 phút, sai 5 lần khoá, gắn workspace + Owner + người nhận +
//    `authz_epoch` lúc xin; mã cũ còn sống bị huỷ. Thư là hiệu ứng bền gửi sau commit (mã chỉ trong payload mã hoá).
// 2) `transfer`: khoá workspace rồi hai membership theo thứ tự userId (tất định — hai lệnh song song không deadlock), kiểm lại mọi ràng
//    buộc, tiêu mã CÙNG commit, đổi `owner_user_id`, người nhận `role_key=owner`, Owner cũ `manager` (Admin của prototype — DC248; không
//    thêm vai trò, không đổi bộ quyền), tăng `authz_epoch`. Hạn mức ghế không đổi (số thành viên giữ nguyên).
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { bumpAuthzEpoch } from '../../kernel/consistency/handler-adapter';
import { newOtp, sameHash, sha256 } from './secrets';
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS } from './otp.service';

export const TRANSFER_OTP_MAIL_EFFECT = 'identity.transfer_otp_mail';
export const PREVIOUS_OWNER_ROLE = 'manager';

export interface TransferOtpMail {
  to: string;
  locale: string;
  code: string;
}

const invalid = (why: string) => new AppError('OTP_INVALID', 422, { otp: why });

/** `ab•••@d.vn` — chỉ để hiện "đã gửi tới". */
export const maskEmail = (e: string) => {
  const [u, d] = e.split('@') as [string, string];
  return `${u.slice(0, 2)}•••@${d}`;
};

/** Người gọi phải là Owner hiện tại (theo DB, không theo cache / quyền uỷ). */
async function lockOwner(ptx: PlatformTx, ws: string, actorUserId: string) {
  await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ws}::uuid FOR UPDATE`;
  const w = await ptx.workspace.findUniqueOrThrow({ where: { id: ws }, select: { ownerUserId: true, authzEpoch: true } });
  if (w.ownerUserId !== actorUserId) throw new AppError('FORBIDDEN', 403, { owner: 'not_owner' });
  return w;
}

async function activeTarget(ptx: PlatformTx, ws: string, owner: string, target: string) {
  if (target === owner) throw new AppError('VALIDATION_FAILED', 422, { to_user_id: 'self' });
  const m = await ptx.membership.findFirst({ where: { workspaceId: ws, userId: target, status: 'active' }, select: { userId: true, roleKey: true } });
  if (!m) throw new AppError('NOT_FOUND', 404, { to_user_id: 'not_member' });
  return m;
}

export async function requestTransferOtp(ptx: PlatformTx, ws: string, actorUserId: string, target: string, now: Date, code = newOtp()) {
  const w = await lockOwner(ptx, ws, actorUserId);
  await activeTarget(ptx, ws, w.ownerUserId, target);
  const owner = await ptx.user.findUniqueOrThrow({ where: { id: w.ownerUserId }, select: { email: true, locale: true, emailVerifiedAt: true } });
  if (!owner.emailVerifiedAt) throw new AppError('VALIDATION_FAILED', 422, { email: 'unverified' });
  // Một mã sống mỗi workspace: xin mã mới huỷ mã cũ (đổi người nhận không dùng lại mã cũ được).
  await ptx.ownerTransferOtp.updateMany({ where: { workspaceId: ws, consumedAt: null }, data: { consumedAt: now } });
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  await ptx.ownerTransferOtp.create({
    data: { id: uuidv7(now.getTime()), workspaceId: ws, ownerUserId: w.ownerUserId, targetUserId: target, authzEpoch: w.authzEpoch, codeHash: sha256(code), expiresAt },
  });
  const mail: TransferOtpMail = { to: owner.email, locale: owner.locale, code };
  return { sentTo: maskEmail(owner.email), expiresAt, mail };
}

/**
 * Kiểm mã + đổi Owner trong ptx của thao tác. Sai mã → attempts++ ghi NGAY (transaction riêng qua `bumpFail`) rồi lỗi, để lần lỗi không bị
 * rollback cùng transaction thao tác.
 */
export async function transferOwnership(
  ptx: PlatformTx,
  ws: string,
  actorUserId: string,
  input: { to_user_id: string; otp: string },
  now: Date,
  operationId: string | undefined,
  bumpFail: (otpId: string) => Promise<void>,
) {
  const w = await lockOwner(ptx, ws, actorUserId);
  const row = await ptx.ownerTransferOtp.findFirst({ where: { workspaceId: ws, consumedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!row || row.expiresAt <= now || row.attempts >= OTP_MAX_ATTEMPTS) throw invalid('expired');
  // Mã gắn Owner + người nhận + phiên bản quyền: đổi người nhận / quyền đã đổi sau khi xin mã → mã chết.
  if (row.ownerUserId !== w.ownerUserId || row.targetUserId !== input.to_user_id || row.authzEpoch !== w.authzEpoch) throw invalid('stale');
  if (!sameHash(row.codeHash, sha256(input.otp))) {
    await bumpFail(row.id);
    throw invalid('invalid');
  }
  // Khoá hai membership theo thứ tự userId — tất định.
  const ids = [w.ownerUserId, input.to_user_id].sort();
  for (const uid of ids) await ptx.$queryRaw`SELECT user_id FROM membership WHERE workspace_id = ${ws}::uuid AND user_id = ${uid}::uuid FOR UPDATE`;
  const target = await activeTarget(ptx, ws, w.ownerUserId, input.to_user_id);
  const used = await ptx.ownerTransferOtp.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: now, consumedOperationId: operationId ?? null } });
  if (used.count !== 1) throw invalid('expired');
  await ptx.workspace.update({ where: { id: ws }, data: { ownerUserId: target.userId } });
  await ptx.membership.update({ where: { workspaceId_userId: { workspaceId: ws, userId: target.userId } }, data: { roleKey: 'owner' } });
  await ptx.membership.update({ where: { workspaceId_userId: { workspaceId: ws, userId: w.ownerUserId } }, data: { roleKey: PREVIOUS_OWNER_ROLE } });
  const epoch = await bumpAuthzEpoch(ptx, ws);
  return { previousOwner: w.ownerUserId, previousTargetRole: target.roleKey, newOwner: target.userId, epoch };
}
