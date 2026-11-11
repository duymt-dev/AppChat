// 041 restore gate (TIP-015c §2.5.6, §2.6 — pha 5 "native verification"): sau khi DB tenant khôi phục xong (restoreDatabase +
// verifyRestored, TIP-041), TRƯỚC khi workspace chuyển `active`, đối chiếu MỌI revision journal nền tảng ĐÃ acknowledged
// (privacy_journal_entry, services/journal.ts pha 3) của workspace với DB tenant vừa khôi phục. Bản lưu trữ cũ hơn revision journal
// mới nhất (chưa phản ánh một lượt "Quên khách" đã acknowledged — operationId không có trong privacy_operation vừa khôi phục) thì
// workspace GIỮ unavailable, không bao giờ mở như workspace mới (fail closed) — không có bản lưu trữ nào "gần đúng là đủ".
// Không tái tạo lại token/artifact ở mức field: capsule journal (JournalCapsule) chỉ giữ canonical_contact_id/family_generation/
// family_ids/requester_id — không giá trị định danh thô (SĐT/email) nên không đủ để tính lại digest token mà không có dữ liệu gốc
// (đúng chủ đích privacy — capsule không PII). Gate vì vậy xác nhận TÍNH ĐẦY ĐỦ (mọi revision đã biết phải có operation tương ứng
// trong DB vừa khôi phục), không tái dựng field cấp thấp; thiếu một revision bất kỳ → chặn mở, không mở nửa vời.
// Giải mã capsule cục bộ bằng kernel/crypto (không import từ privacy/services/journal.ts — kernel không phụ thuộc ngược vào domain).
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { decryptSecret } from '../crypto';

/** Hàm đọc thô DB tenant vừa khôi phục — có thể là `pgQuery` (kết nối trực tiếp, workspace còn `restoring`, resolver chưa mở được)
 * hoặc một adapter khác tương thích tham số hoá ($1, $2, …). */
export type RestoreGateQuery = <T extends Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;

interface JournalEntryCipher {
  operationId: string;
  sequence: bigint;
  revision: number;
  capsuleCipher: string;
  capsuleIv: string;
  keyVersion: number;
}

/** Nội dung capsule (mirror JournalCapsule, services/journal.ts) — chỉ ID/đếm, không PII. */
interface RestoreJournalCapsule {
  canonicalContactId: string;
  familyGeneration: number;
  familyIds: string[];
  requesterId: string;
}

function decodeJournalCapsule(entry: JournalEntryCipher, encKey: Buffer): RestoreJournalCapsule {
  const blob = Buffer.concat([Buffer.from([entry.keyVersion]), Buffer.from(entry.capsuleIv, 'base64'), Buffer.from(entry.capsuleCipher, 'base64')]);
  return JSON.parse(decryptSecret(blob, encKey)) as RestoreJournalCapsule;
}

export interface RestoreGateStaleEntry {
  operationId: string;
  sequence: string;
  revision: number;
  capsule: RestoreJournalCapsule;
}

export interface RestoreGateResult {
  checkedEntries: number;
  stale: RestoreGateStaleEntry[];
}

/**
 * Đối chiếu journal nền tảng (đã acknowledged) của `workspaceId` với DB tenant vừa khôi phục — trả danh sách revision KHÔNG thấy
 * trong DB vừa khôi phục (rỗng = DB đã phản ánh đủ mọi revision đã biết). Thiếu APP_ENC_KEY khi CÓ revision cần kiểm → 503 fail
 * closed (không coi "không giải mã được" là an toàn); không có revision nào thì bỏ qua kiểm khoá (workspace chưa từng "Quên khách").
 */
export async function verifyRestoreAgainstJournal(
  platform: Pick<PlatformDb, 'privacyJournalEntry'>,
  encKey: Buffer | null,
  query: RestoreGateQuery,
  workspaceId: string,
): Promise<RestoreGateResult> {
  const entries = (await platform.privacyJournalEntry.findMany({
    where: { workspaceId, acknowledgedAt: { not: null } },
    orderBy: { sequence: 'asc' },
    select: { operationId: true, sequence: true, revision: true, capsuleCipher: true, capsuleIv: true, keyVersion: true },
  })) as JournalEntryCipher[];
  if (!entries.length) return { checkedEntries: 0, stale: [] };
  if (!encKey) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { privacy_journal: 'missing_key' });

  const ids = [...new Set(entries.map((e) => e.operationId))];
  const rows = await query<{ id: string }>(`SELECT "id" FROM "privacy_operation" WHERE "id" = ANY($1::uuid[])`, [ids]);
  const present = new Set(rows.map((r) => r.id));

  const stale: RestoreGateStaleEntry[] = [];
  for (const e of entries) {
    if (present.has(e.operationId)) continue;
    stale.push({ operationId: e.operationId, sequence: e.sequence.toString(), revision: e.revision, capsule: decodeJournalCapsule(e, encKey) });
  }
  return { checkedEntries: entries.length, stale };
}

/** Gọi NGAY SAU `verifyRestored()` (TIP-041), TRƯỚC khi workspace chuyển `active` — chặn mở nếu còn revision chưa phản ánh. */
export async function assertRestoreCurrent(platform: Pick<PlatformDb, 'privacyJournalEntry'>, encKey: Buffer | null, query: RestoreGateQuery, workspaceId: string): Promise<RestoreGateResult> {
  const r = await verifyRestoreAgainstJournal(platform, encKey, query, workspaceId);
  if (r.stale.length) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { privacy_journal: 'stale_restore', missing_operations: String(r.stale.length) });
  return r;
}
