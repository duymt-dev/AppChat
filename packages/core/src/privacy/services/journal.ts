// Nhật ký nền tảng (TIP-015c §2.5, pha 3 — hoàn thiện schema pha 1 chưa dùng): reserve Ý ĐỊNH ở platform TRƯỚC khi tenant fence
// commit (gọi ở `handler.prepare()` — chạy ngoài transaction tenant, mirror 045b annex A1 "id tenant phải tất định, sinh ở pha nền
// tảng"), acknowledge SAU khi tenant đã commit (`afterCommit`). Nhiều revision bất biến mỗi operation (không ghi đè); capsule mã hoá
// AES-256-GCM (APP_ENC_KEY) — chỉ tombstone/digest/disposition/checkpoint, KHÔNG PII thô.
import { createHash } from 'node:crypto';
import type { PlatformDb } from '@appchat/db';
import { encryptSecret, decryptSecret } from '../../kernel/crypto';

/** Nội dung capsule (TIP-015c §2.5.2) — chỉ ID, không tên/SĐT/email/chat thô. Capsule là bản ghi KHÔI PHỤC (advisory), KHÔNG phải
 * nguồn sự thật — nguồn sự thật là `privacy_operation`/`privacy_family_member` ở tenant; family_generation/family_ids ở đây là ảnh
 * chụp lúc reserve (có thể chưa khớp nếu tenant tx sau đó 409 và không commit — revision đó không bao giờ acknowledged, không gây sai
 * dữ liệu vì khôi phục chỉ phát theo đúng revision đã acknowledged). */
export interface JournalCapsule {
  canonicalContactId: string;
  familyGeneration: number;
  familyIds: string[];
  requesterId: string;
}

const checksumOf = (capsuleCipher: string, priorChecksum: string | null) => createHash('sha256').update(`${priorChecksum ?? ''}:${capsuleCipher}`).digest('hex');

/** Revision kế tiếp CỦA MỘT operation (1 nếu chưa có) — khác `sequence` (đơn điệu theo workspace, gán lúc insert). */
async function nextRevision(platform: Pick<PlatformDb, 'privacyJournalEntry'>, operationId: string): Promise<{ revision: number; priorChecksum: string | null }> {
  const last = await platform.privacyJournalEntry.findFirst({ where: { operationId }, orderBy: { revision: 'desc' }, select: { revision: true, checksum: true } });
  return { revision: (last?.revision ?? 0) + 1, priorChecksum: last?.checksum ?? null };
}

export interface ReservedJournal {
  id: string;
  operationId: string;
  revision: number;
}

/**
 * Reserve MỘT revision journal (TIP-015c §2.5.5–6) — gọi TRƯỚC khi fence tenant commit (`prepare()`), hoặc trước mỗi mutation ảnh
 * hưởng khôi phục (quarantine mới, xoay khoá, cấp/tiêu permit, tuyến mới). `sequence` workspace tăng đơn điệu qua khoá advisory +
 * MAX+1 trong MỘT transaction nền tảng (không đụng độ hai operation cùng workspace reserve đồng thời).
 */
export async function reserveJournal(
  platform: PlatformDb,
  encKey: Buffer,
  a: { id: string; workspaceId: string; operationId: string; phase: string; capsule: JournalCapsule; now: Date },
): Promise<ReservedJournal> {
  return platform.$transaction(async (ptx) => {
    await ptx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`privacy-journal:${a.workspaceId}`}, 0))`;
    const [row] = await ptx.$queryRaw<{ next: bigint }[]>`SELECT COALESCE(MAX("sequence"), 0) + 1 AS next FROM "privacy_journal_entry" WHERE "workspace_id" = ${a.workspaceId}::uuid`;
    const { revision, priorChecksum } = await nextRevision(ptx, a.operationId);
    const blob = encryptSecret(JSON.stringify(a.capsule), encKey);
    const keyVersion = blob[0]!;
    const capsuleIv = blob.subarray(1, 13).toString('base64');
    const capsuleCipher = blob.subarray(13).toString('base64');
    const checksum = checksumOf(capsuleCipher, priorChecksum);
    await ptx.privacyJournalEntry.create({
      data: {
        id: a.id, workspaceId: a.workspaceId, sequence: row!.next, operationId: a.operationId, revision: revision, phase: a.phase,
        capsuleCipher, capsuleIv, keyVersion, checksum, priorChecksum,
      },
    });
    return { id: a.id, operationId: a.operationId, revision };
  });
}

/** Xác nhận bền (TIP-015c §2.5.5) — SAU khi tenant đã commit (`afterCommit`), KHÔNG cùng transaction nền tảng với reserve. */
export async function acknowledgeJournal(platform: PlatformDb, operationId: string, revision: number, now: Date): Promise<void> {
  await platform.privacyJournalEntry.updateMany({ where: { operationId, revision, acknowledgedAt: null }, data: { acknowledgedAt: now } });
}

/** Giải mã capsule (chỉ dùng ở khôi phục/restore-gate, pha 5) — sai khoá / dữ liệu sửa → ném (GCM auth tag). */
export function decodeCapsule(entry: { capsuleCipher: string; capsuleIv: string; keyVersion: number }, encKey: Buffer): JournalCapsule {
  const blob = Buffer.concat([Buffer.from([entry.keyVersion]), Buffer.from(entry.capsuleIv, 'base64'), Buffer.from(entry.capsuleCipher, 'base64')]);
  return JSON.parse(decryptSecret(blob, encKey)) as JournalCapsule;
}
