// Biên nhận trigger bền (TIP-003c §3.1–3.3): admission trong CHÍNH transaction của action (trước hiệu ứng handler) — chèn theo khoá
// trigger duy nhất, khoá dòng; đã kết thúc + cùng digest → phát lại kết quả cũ (từ action_log), khác digest → 409. Settle cùng transaction
// với hiệu ứng + action_log + outbox (collector 003b flush cuối). Không lưu input khách — chỉ digest + tham chiếu.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../action-context';
import { uuidv7 } from '../../ids';
import type { SystemCapability } from './capability';

export type SystemDisposition = 'applied' | 'no_effect' | 'handed_off';

export interface AdmittedReceipt {
  id: string;
  /** Biên nhận đã kết thúc trước đó → kết quả cũ (không chạy handler). */
  replay?: { result: unknown; actionLogId: string };
}

type Row = { id: string; phase: string; input_digest: string; action_log_id: string | null };

export async function admitReceipt(tx: TenantTx, cap: Readonly<SystemCapability>, now: Date): Promise<AdmittedReceipt> {
  const id = uuidv7(now.getTime());
  await tx.$executeRaw`
    INSERT INTO system_action_receipt (id, source_kind, source_ref, action_id, target_id, target_generation, milestone, input_digest, phase, created_at, updated_at)
    VALUES (${id}::uuid, ${cap.sourceKind}::system_source_kind, ${cap.sourceRef}, ${cap.actionId}, ${cap.targetId}, ${cap.generation}, ${cap.milestone}, ${cap.inputDigest}, 'admitted', ${now}, ${now})
    ON CONFLICT (source_kind, source_ref, action_id, target_id, target_generation, milestone) DO NOTHING`;
  const [r] = await tx.$queryRaw<Row[]>`
    SELECT id, phase::text AS phase, input_digest, action_log_id FROM system_action_receipt
     WHERE source_kind = ${cap.sourceKind}::system_source_kind AND source_ref = ${cap.sourceRef} AND action_id = ${cap.actionId}
       AND target_id = ${cap.targetId} AND target_generation = ${cap.generation} AND milestone = ${cap.milestone}
     FOR UPDATE`;
  if (!r) throw new AppError('CONFLICT', 409, { receipt: 'missing' });
  if (r.input_digest !== cap.inputDigest) throw new AppError('CONFLICT', 409, { receipt: 'digest_mismatch' });
  if (r.phase === 'admitted') return { id: r.id };
  const log = r.action_log_id ? await tx.actionLog.findUnique({ where: { id: r.action_log_id }, select: { result: true } }) : null;
  return { id: r.id, replay: { result: log?.result ?? null, actionLogId: r.action_log_id ?? '' } };
}

/** Kết cục chuẩn từ output action riêng (`disposition` / `effect_ref` / `operation_id` / `reason_code`); action cũ không khai → applied. */
export function dispositionOf(output: unknown): { phase: SystemDisposition; effectRef: string | null; reason: string | null } {
  const o = (output && typeof output === 'object' ? output : {}) as Record<string, unknown>;
  const d = o.disposition;
  const phase: SystemDisposition = d === 'no_effect' || d === 'handed_off' ? d : 'applied';
  const ref = typeof o.effect_ref === 'string' ? o.effect_ref : typeof o.operation_id === 'string' ? o.operation_id : null;
  const reason = typeof o.reason_code === 'string' ? o.reason_code.slice(0, 64) : null;
  return { phase, effectRef: ref, reason };
}

export async function settleReceipt(tx: TenantTx, id: string, output: unknown, actionLogId: string, now: Date): Promise<void> {
  const { phase, effectRef, reason } = dispositionOf(output);
  const n = await tx.$executeRaw`
    UPDATE system_action_receipt SET phase = ${phase}::system_receipt_phase, action_log_id = ${actionLogId}::uuid, effect_ref = ${effectRef}, safe_reason = ${reason}, updated_at = ${now}
     WHERE id = ${id}::uuid AND phase = 'admitted'`;
  if (n !== 1) throw new AppError('CONFLICT', 409, { receipt: 'settled' });
}
