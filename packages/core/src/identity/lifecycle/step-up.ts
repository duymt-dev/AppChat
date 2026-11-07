// Xác thực bước hai cho thao tác nguy hiểm của Owner (TIP-041 §4, DC-245): hiện chỉ `delete_workspace`. Mã 6 số gửi email đã xác minh của
// Owner (mục đích riêng — không dùng lại OTP đăng nhập / đổi chủ), chỉ lưu HMAC-SHA256 với khoá máy chủ (APP_ENC_KEY), hạn 5 phút, sai 5 lần
// khoá, tối đa 5 lần xin mã / 15 phút / (user, workspace). Thử thách gắn người + workspace + thao tác + băm bản xem trước + status_version:
// xem trước đổi (đổi tên, trạng thái, gói) hay quyền đổi → mã chết. Tiêu một lần CÙNG commit thao tác. Mã không bao giờ vào log / model.
import { createHmac } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { newOtp, sameHash } from '../services/secrets';

export type StepUpOperation = 'delete_workspace';
export const STEP_UP_TTL_MS = 5 * 60_000;
export const STEP_UP_MAX_ATTEMPTS = 5;
export const STEP_UP_MAX_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60_000;

export const stepUpHash = (key: Buffer, challengeId: string, code: string) => createHmac('sha256', key).update(`appchat:step-up:${challengeId}:${code}`).digest('hex');

const invalid = (why: 'expired' | 'invalid' | 'stale' | 'locked') => new AppError('OTP_INVALID', 422, { otp: why });

export interface StepUpIssue {
  workspaceId: string;
  userId: string;
  operation: StepUpOperation;
  previewHash: string;
  expectedVersion: number;
  now: Date;
}

/** Tạo thử thách mới (huỷ thử thách còn sống của cùng người / workspace / thao tác). Trả mã rõ để gửi thư — không lưu. */
export async function issueStepUp(ptx: PlatformTx, key: Buffer, o: StepUpIssue, code = newOtp()): Promise<{ id: string; code: string; expiresAt: Date }> {
  const since = new Date(o.now.getTime() - WINDOW_MS);
  const recent = await ptx.workspaceStepUp.count({ where: { userId: o.userId, workspaceId: o.workspaceId, operation: o.operation, createdAt: { gte: since } } });
  if (recent >= STEP_UP_MAX_PER_WINDOW) throw new AppError('RATE_LIMITED', 429, { step_up: 'too_many' });
  await ptx.workspaceStepUp.updateMany({ where: { userId: o.userId, workspaceId: o.workspaceId, operation: o.operation, consumedAt: null }, data: { consumedAt: o.now } });
  const id = uuidv7(o.now.getTime());
  const expiresAt = new Date(o.now.getTime() + STEP_UP_TTL_MS);
  await ptx.workspaceStepUp.create({
    data: { id, workspaceId: o.workspaceId, userId: o.userId, operation: o.operation, previewHash: o.previewHash, expectedVersion: o.expectedVersion, codeHash: stepUpHash(key, id, code), expiresAt, createdAt: o.now },
  });
  return { id, code, expiresAt };
}

export interface StepUpConsume {
  challengeId: string;
  workspaceId: string;
  userId: string;
  operation: StepUpOperation;
  /** Băm bản xem trước + phiên bản HIỆN TẠI (tính lại lúc xác nhận). */
  previewHash: string;
  currentVersion: number;
  code: string;
  now: Date;
}

/**
 * Kiểm + tiêu thử thách trong `ptx` của thao tác. Sai mã → `bumpFail` ghi lần sai ở transaction RIÊNG (không bị rollback cùng thao tác) rồi
 * lỗi. Xem trước / phiên bản đổi → `stale` (xin mã mới). KHÔNG khoá dòng thử thách ở `ptx` (bumpFail cập nhật chính dòng đó trên kết nối
 * khác — khoá sẽ tự chờ nhau): người gọi đã giữ khoá dòng workspace nên mọi lần xác nhận cùng workspace đã tuần tự; tiêu bằng CAS consumed_at.
 */
export async function consumeStepUp(ptx: PlatformTx, key: Buffer, o: StepUpConsume, bumpFail: (id: string) => Promise<void>): Promise<void> {
  const row = await ptx.workspaceStepUp.findUnique({ where: { id: o.challengeId } });
  if (!row || row.userId !== o.userId || row.workspaceId !== o.workspaceId || row.operation !== o.operation) throw invalid('invalid');
  if (row.consumedAt || row.expiresAt <= o.now) throw invalid('expired');
  if (row.attempts >= STEP_UP_MAX_ATTEMPTS) throw invalid('locked');
  if (row.previewHash !== o.previewHash || row.expectedVersion !== o.currentVersion) throw invalid('stale');
  if (!sameHash(row.codeHash, stepUpHash(key, row.id, o.code))) {
    await bumpFail(row.id);
    throw invalid('invalid');
  }
  const used = await ptx.workspaceStepUp.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: o.now } });
  if (used.count !== 1) throw invalid('expired');
}
