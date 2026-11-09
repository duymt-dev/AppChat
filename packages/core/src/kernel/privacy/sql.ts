// Tiện ích SQL cho adapter kiểm kê "Quên khách" (mirror kernel/contact-lifecycle/sql.ts) — mảng uuid tham số hoá + gom dòng thành
// InventoryArtifact. uuidv7 dựng id ổn định cho artifact (kind, recordId) không có id uuid gốc (vd dòng JSON trong participants).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { InventoryArtifact } from './types';

export const idsSql = (ids: readonly string[]) => Prisma.sql`${[...ids]}::uuid[]`;

export type InvRow = { kind: string; record_id: string; revision: number; ownership: InventoryArtifact['ownership']; retained_issued?: boolean };

export const toInventory = (rows: InvRow[]): InventoryArtifact[] =>
  rows.map((r) => ({ kind: r.kind, recordId: r.record_id, revision: r.revision, ownership: r.ownership, ...(r.retained_issued ? { retainedIssued: true } : {}) }));

/** Chưa làm phase erase thật (pha 3) — adapter pha 1 chỉ kiểm kê, erase trả NOT_IMPLEMENTED để không âm thầm no-op. */
export const eraseNotImplemented = async (): Promise<void> => {
  throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'privacy erase chưa cài ở pha này');
};
