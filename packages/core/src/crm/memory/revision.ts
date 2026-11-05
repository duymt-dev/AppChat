// Bản sửa của khách (TIP-015b): `contact_revision.memory_rev` / `data_rev` tăng trong CÙNG transaction với thay đổi (fact, timeline,
// chứng từ) — khoá cache tóm tắt / gợi ý so với bản sửa này, không với `contact.updated_at`. Event `contact.memory_changed` chỉ là gợi ý
// làm mới; consumer chậm / lặp không làm cache sai vì đọc lại bản sửa trước khi dùng / ghi cache.
import type { TenantTx } from '../../kernel/actions/action-context';

export interface Revision {
  memoryRev: bigint;
  dataRev: bigint;
}

/** Tăng bản sửa (memory → cả hai; dữ liệu khác → chỉ data_rev). Trả bản sửa mới. */
export async function bump(tx: TenantTx, contactId: string, kind: 'memory' | 'data', now: Date): Promise<Revision> {
  const m = kind === 'memory' ? 1 : 0;
  const rows = await tx.$queryRaw<{ memory_rev: bigint; data_rev: bigint }[]>`
    INSERT INTO contact_revision (contact_id, memory_rev, data_rev, updated_at) VALUES (${contactId}::uuid, ${m}, 1, ${now})
    ON CONFLICT (contact_id) DO UPDATE SET memory_rev = contact_revision.memory_rev + ${m}, data_rev = contact_revision.data_rev + 1, updated_at = ${now}
    RETURNING memory_rev, data_rev`;
  return { memoryRev: rows[0]!.memory_rev, dataRev: rows[0]!.data_rev };
}

/** Bản sửa hiện tại (chưa có dòng → 0 / 0). */
export async function revisionOf(tx: Pick<TenantTx, 'contactRevision'>, contactId: string): Promise<Revision> {
  const r = await tx.contactRevision.findUnique({ where: { contactId }, select: { memoryRev: true, dataRev: true } });
  return { memoryRev: r?.memoryRev ?? 0n, dataRev: r?.dataRev ?? 0n };
}

/** Event gợi ý làm mới (outbox cùng transaction). */
export const memoryChanged = (contactId: string, r: Revision) => ({ topic: 'contact.memory_changed', payload: { contact_id: contactId, memory_rev: Number(r.memoryRev) } });
