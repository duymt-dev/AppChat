// Biên nhận chuyển phụ trách (TIP-015d §2.5): một dòng `contact_transfer` mỗi lần đổi phụ trách thật + dòng `contact_transfer_item` mỗi
// bản ghi chuyển kèm (ghi set-based). Không chép payload thực thể — chỉ id + trước / sau + revision.
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OwnershipDomain, OwnershipReceipt } from '../../kernel/ownership/ports';

export type Moved = { conversations: number; quotes: number; appointments: number };
export type MoveFlags = { conversations: boolean; quotes: boolean; appointments: boolean };
export const ZERO: Moved = { conversations: 0, quotes: 0, appointments: 0 };
export const COUNT_KEY: Record<OwnershipDomain, keyof Moved> = { conversation: 'conversations', quote: 'quotes', appointment: 'appointments' };

export interface TransferRow {
  id: string;
  contactId: string;
  fromUserId: string | null;
  toUserId: string;
  fromTeamId: string | null;
  toTeamId: string | null;
  generation: number;
  move: MoveFlags;
  counts: Moved;
  collab: { role: 'collaborator' | 'watcher'; added_by: string | null } | null;
  idempotencyKey: string | null;
  source: string;
  actorId: string | null;
  createdAt: Date;
}

export async function insertTransfer(tx: TenantTx, t: TransferRow, items: { domain: OwnershipDomain; r: OwnershipReceipt }[]): Promise<void> {
  await tx.contactTransfer.create({
    data: {
      id: t.id,
      contactId: t.contactId,
      fromUserId: t.fromUserId,
      toUserId: t.toUserId,
      fromTeamId: t.fromTeamId,
      toTeamId: t.toTeamId,
      generation: t.generation,
      move: t.move,
      counts: t.counts,
      collab: t.collab ?? Prisma.DbNull,
      idempotencyKey: t.idempotencyKey,
      source: t.source,
      actorId: t.actorId,
      createdAt: t.createdAt,
    },
  });
  if (!items.length) return;
  await tx.contactTransferItem.createMany({
    data: items.map(({ domain, r }) => ({
      transferId: t.id,
      domain,
      entityId: r.entityId,
      beforeUserId: r.beforeUserId,
      beforeAgentId: r.beforeAgentId ?? null,
      beforeTeamId: r.beforeTeamId ?? null,
      afterTeamId: r.afterTeamId ?? null,
      afterAssignmentRevision: r.afterRevision,
    })),
  });
}

/** Biên nhận theo domain của một lần chuyển (cho hoàn tác) — thứ tự id tăng. */
export async function itemsOf(tx: TenantTx, transferId: string): Promise<Record<OwnershipDomain, OwnershipReceipt[]>> {
  const rows = await tx.contactTransferItem.findMany({ where: { transferId }, orderBy: [{ domain: 'asc' }, { entityId: 'asc' }] });
  const out: Record<OwnershipDomain, OwnershipReceipt[]> = { conversation: [], quote: [], appointment: [] };
  for (const r of rows) {
    out[r.domain as OwnershipDomain].push({ entityId: r.entityId, beforeUserId: r.beforeUserId, beforeAgentId: r.beforeAgentId, beforeTeamId: r.beforeTeamId, afterTeamId: r.afterTeamId, afterRevision: r.afterAssignmentRevision });
  }
  return out;
}
