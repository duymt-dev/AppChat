// Khôi phục ký hợp đồng cha (TIP-030c §3.7, §4.6): quét ROLE=jobs mỗi lượt hợp đồng — lần thử chưa kết thúc đã hết hạn mã → `expired`;
// lượt render chết (rendering quá lease) không được hoàn tất hộ (không có OTP / chữ ký gốc) → `expired`; tệp ứng viên CHƯA xác nhận của lần
// thử stale / expired → xoá dòng tệp (không đụng tệp đã xác nhận / đã gắn chứng từ). Ý định gửi OTP Owner: claim quá hạn → unknown (không gửi
// lại), tới hạn → gửi (người nhận hiện tại). Không bao giờ chốt hộ một lần ký. Trang ≤ 200, theo index `(phase, expires_at, id)`.
import type { TenantDb } from '@appchat/db';
import { recoverOwnerOtp, type SignMailDeps } from './delivery';

const PAGE = 200;

export interface SigningSweep {
  expired: number;
  cleaned: number;
  sent: number;
  unknown: number;
}

export async function recoverSigning(db: TenantDb, ws: string, mail: SignMailDeps | null, now: Date): Promise<SigningSweep> {
  const expired = await db.$executeRaw`
    UPDATE contract_signing_attempt SET phase = 'expired', rejection_code = 'abandoned', render_token = NULL, lease_until = NULL, updated_at = ${now}
     WHERE id IN (SELECT id FROM contract_signing_attempt WHERE phase IN ('verified', 'rendering', 'staged') AND expires_at < ${now} ORDER BY expires_at, id LIMIT ${PAGE})
       AND (phase <> 'rendering' OR lease_until IS NULL OR lease_until < ${now})`;
  // Tệp ứng viên mồ côi: chỉ tệp chưa xác nhận do chính lần thử này tạo (id ghi trong biên nhận).
  const cleaned = await db.$executeRaw`
    DELETE FROM file f USING (
      SELECT unnest(ARRAY[candidate_file_id, signature_file_id]) AS fid FROM contract_signing_attempt
       WHERE phase IN ('stale', 'expired') AND candidate_file_id IS NOT NULL AND updated_at < ${now} ORDER BY id LIMIT ${PAGE}
    ) o WHERE f.id = o.fid AND f.confirmed = false`;
  await db.$executeRaw`
    UPDATE contract_signing_attempt SET candidate_file_id = NULL, signature_file_id = NULL
     WHERE phase IN ('stale', 'expired') AND candidate_file_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM file f WHERE f.id = candidate_file_id AND f.confirmed)`;
  const d = mail ? await recoverOwnerOtp(mail, db, ws) : { sent: 0, unknown: 0 };
  return { expired, cleaned, ...d };
}
