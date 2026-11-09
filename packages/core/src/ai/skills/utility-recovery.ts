// Khôi phục kỹ năng tiện ích sau sự cố (TIP-019c §3.7): quét mỗi workspace `utility_operation` còn `generating` / `validating` quá hạn
// (index khôi phục). Đã có chữ thô của model (`generated_payload`) → chỉ kiểm lại (không gọi model lần hai); chưa có chữ (tiến trình chết
// trước khi model trả) → `unknown` (không gọi lại — usage có thể đã phát sinh, 019b xử riêng). `revalidate` tái dùng đúng validator +
// nguồn của action đó (đăng ký ở ai.module qua `utility.handlers`) — nguồn đổi / mất quyền → `invalidated`, không bịa kết quả.
// Chạy trên lịch `consistency-scheduler` của 045b (ROLE=jobs).
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { failOperation } from './utility-operations';

export type RevalidateOutcome = 'validated' | 'invalidated' | 'failed';
/** Kiểm lại một operation đã có chữ thô của action `actionId` — đăng ký theo action vì mỗi kỹ năng có nguồn + validator riêng. */
export type Revalidate = (tx: TenantTx, actionId: string, operationId: string, payload: string) => Promise<RevalidateOutcome>;

export const UTILITY_RECOVERY_GRACE_MS = 60_000;
const BATCH = 50;

export interface UtilityRecoveryReport {
  workspaces: number;
  validated: number;
  invalidated: number;
  failed: number;
  unknown: number;
}

export async function recoverUtilities(d: {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  revalidate: Revalidate;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}): Promise<UtilityRecoveryReport> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const out: UtilityRecoveryReport = { workspaces: wss.length, validated: 0, invalidated: 0, failed: 0, unknown: 0 };
  const before = new Date(d.now().getTime() - UTILITY_RECOVERY_GRACE_MS);
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, 'ai.utility-recovery'));
      const due = await db.utilityOperation.findMany({
        where: { phase: { in: ['generating', 'validating'] }, updatedAt: { lt: before } },
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        take: BATCH,
        select: { id: true, actionId: true, generatedPayload: true },
      });
      for (const op of due) {
        if (!op.generatedPayload) {
          // Chết trước khi model trả — không có gì để kiểm lại, không gọi lại (usage chưa rõ thuộc phạm vi 019b).
          await db.$transaction((tx) => failOperation(tx as unknown as TenantTx, op.id, 'unknown', false));
          out.unknown++;
          continue;
        }
        const res = await db.$transaction((tx) => d.revalidate(tx as unknown as TenantTx, op.actionId, op.id, op.generatedPayload!));
        out[res]++;
      }
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return out;
}
