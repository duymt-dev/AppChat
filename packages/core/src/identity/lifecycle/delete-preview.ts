// Bản xem trước xoá workspace (TIP-041 §4, DC-376) — chỉ đọc DB nền tảng (chạy được khi DB tenant đã lưu trữ). Liệt kê hệ quả cho Owner:
// tên phải gõ lại, số thành viên mất truy cập, gói trả phí còn bao nhiêu ngày + Credit mua thêm sẽ MẤT (không hoàn tiền tự động — DC-376),
// sao lưu mã hoá giữ 30 ngày rồi purge, dữ liệu tài chính / audit giữ lại. `hash` gắn vào thử thách OTP: đổi gì trong đây → mã chết.
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { hashInput } from '../../kernel/actions/confirm-token';

export const DELETION_RETENTION_DAYS = 30;
const DAY = 86_400_000;
type Db = Pick<PlatformTx | PlatformDb, 'workspace' | 'membership' | 'subscription' | 'plan' | 'creditWallet'>;

export interface DeletePreview {
  workspace_id: string;
  name: string;
  db_status: string;
  status_version: number;
  members: number;
  /** Gói trả phí còn hiệu lực — số ngày còn lại sẽ mất (không hoàn tự động). null = trial / Miễn phí / hết hạn. */
  paid_days_left: number | null;
  plan_name: string | null;
  /** Credit mua thêm (không hết hạn) sẽ mất cùng workspace. */
  topup_credits: number;
  backup_retention_days: number;
  /** Dữ liệu giữ lại theo luật: hoá đơn nền tảng, sổ ví, nhật ký quản trị. */
  retained: readonly ['billing_invoices', 'wallet_ledger', 'audit_log'];
}

export async function deletePreview(db: Db, workspaceId: string, now: Date): Promise<{ preview: DeletePreview; hash: string }> {
  const w = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, dbStatus: true, statusVersion: true, deletedAt: true } });
  if (!w || w.deletedAt) throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
  if (!['active', 'suspended', 'archived'].includes(w.dbStatus)) throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus });
  const [members, sub, wallet] = await Promise.all([
    db.membership.count({ where: { workspaceId, status: 'active' } }),
    db.subscription.findUnique({ where: { workspaceId }, select: { status: true, planId: true, currentPeriodEnd: true, termPrice: true } }),
    db.creditWallet.findUnique({ where: { workspaceId }, select: { topupBalance: true } }),
  ]);
  const paid = sub?.status === 'active' && sub.termPrice !== null && sub.currentPeriodEnd && sub.currentPeriodEnd > now;
  const plan = paid ? await db.plan.findUnique({ where: { id: sub!.planId }, select: { name: true } }) : null;
  const preview: DeletePreview = {
    workspace_id: w.id,
    name: w.name,
    db_status: w.dbStatus,
    status_version: w.statusVersion,
    members,
    paid_days_left: paid ? Math.ceil((sub!.currentPeriodEnd!.getTime() - now.getTime()) / DAY) : null,
    plan_name: plan?.name ?? null,
    topup_credits: Number(wallet?.topupBalance ?? 0n),
    backup_retention_days: DELETION_RETENTION_DAYS,
    retained: ['billing_invoices', 'wallet_ledger', 'audit_log'],
  };
  // Băm phần quyết định (không gồm số ngày — trôi theo giờ); số ngày đổi qua mốc kỳ thì termPrice / kỳ đổi theo.
  const hash = hashInput({ ...preview, paid_days_left: preview.paid_days_left === null ? null : sub!.currentPeriodEnd!.toISOString() });
  return { preview, hash };
}

/** Tên gõ lại phải khớp tên workspace (bỏ khoảng trắng hai đầu, không phân biệt hoa thường). */
export const sameName = (typed: string, name: string) => typed.trim().toLocaleLowerCase('vi') === name.trim().toLocaleLowerCase('vi');
