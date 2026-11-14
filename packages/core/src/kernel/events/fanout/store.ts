// Kho fanout (TIP-006b §1.1, §2.4): mở (idempotent theo khoá) → thuê chọn có token + thế hệ thuê → niêm phong CAS (đúng token + đúng
// thế hệ chọn + đang building) hoặc bỏ (thế hệ chọn mới; mục của thế hệ cũ không bao giờ có hiệu ứng). Người chọn cũ đã mất thuê không
// niêm phong được → đúng một thế hệ niêm phong.
import { randomUUID } from 'node:crypto';
import type { TenantTx } from '../../actions/action-context';
import { uuidv7 } from '../../ids';
import { FANOUT_LEASE_SEC, type FanoutKey, type FanoutRow } from './types';

/** Mở hoặc nạp lại fanout của khoá (khoá dòng FOR UPDATE). Event trùng → cùng dòng. */
export async function openFanout(tx: TenantTx, key: FanoutKey): Promise<FanoutRow> {
  await tx.$executeRaw`
    INSERT INTO event_fanout (id, event_id, consumer_name, contract_version) VALUES (${uuidv7()}::uuid, ${key.eventId}::uuid, ${key.consumer}, ${key.contractVersion})
    ON CONFLICT (event_id, consumer_name, contract_version) DO NOTHING`;
  const [r] = await tx.$queryRaw<FanoutRow[]>`
    SELECT id::text AS id, selection_generation AS generation, selection_phase::text AS phase, selected_count AS selected, processed_count AS processed
      FROM event_fanout WHERE event_id = ${key.eventId}::uuid AND consumer_name = ${key.consumer} AND contract_version = ${key.contractVersion} FOR UPDATE`;
  return r!;
}

export interface SelectionLease {
  token: string;
  leaseGeneration: number;
  generation: number;
}

/** Thuê lượt chọn: chỉ khi đang building và (chưa ai thuê / thuê đã hết hạn). null = đang có người chọn. */
export async function leaseSelection(tx: TenantTx, fanoutId: string): Promise<SelectionLease | null> {
  const token = randomUUID();
  const [r] = await tx.$queryRaw<{ lg: number; g: number }[]>`
    UPDATE event_fanout SET lease_token = ${token}::uuid, lease_generation = lease_generation + 1, lease_until = now() + make_interval(secs => ${FANOUT_LEASE_SEC}), updated_at = now()
     WHERE id = ${fanoutId}::uuid AND selection_phase = 'building' AND (lease_until IS NULL OR lease_until < now())
    RETURNING lease_generation AS lg, selection_generation AS g`;
  return r ? { token, leaseGeneration: r.lg, generation: r.g } : null;
}

/** Niêm phong CAS — sai token / thế hệ thuê / đã niêm phong → false (người chọn cũ không ghi đè). */
export async function sealSelection(tx: TenantTx, fanoutId: string, l: SelectionLease): Promise<boolean> {
  const n = await tx.$executeRaw`
    UPDATE event_fanout SET selection_phase = 'sealed', lease_token = NULL, lease_until = NULL, updated_at = now(),
           selected_count = (SELECT count(*) FROM event_fanout_item WHERE fanout_id = ${fanoutId}::uuid AND generation = ${l.generation})
     WHERE id = ${fanoutId}::uuid AND selection_phase = 'building' AND lease_token = ${l.token}::uuid AND lease_generation = ${l.leaseGeneration}
       AND selection_generation = ${l.generation}`;
  return n === 1;
}

/** Lỗi trước niêm phong / cấu hình quyền đổi giữa chừng → bỏ thế hệ, lần sau chọn cohort mới (mục cũ ở lại, không hiệu ứng). */
export async function abandonSelection(tx: TenantTx, fanoutId: string, l: SelectionLease): Promise<boolean> {
  const n = await tx.$executeRaw`
    UPDATE event_fanout SET selection_generation = selection_generation + 1, lease_token = NULL, lease_until = NULL, cursor = NULL, updated_at = now()
     WHERE id = ${fanoutId}::uuid AND selection_phase = 'building' AND lease_token = ${l.token}::uuid AND lease_generation = ${l.leaseGeneration}`;
  return n === 1;
}
