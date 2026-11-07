// Ghi / đọc bền thao tác kênh (TIP-014b A): tham chiếu tin phía kênh (từng phần), self-event chờ ghép, lệnh thao tác, cảm xúc của tài
// khoản. Mọi hàm nhận transaction tenant của người gọi — không mở transaction riêng, không gọi kênh. Id kênh luôn là chuỗi (không number).
import type { ProviderMessageRef } from '@appchat/channels';
import type { TenantTx } from '../../kernel/actions/action-context';
import { PENDING_REF_TTL_MS } from './types';

/**
 * Khoá giao dịch theo (tài khoản, msgId): biên nhận gửi và self-event của cùng một tin chạy hai transaction song song — không khoá thì mỗi
 * bên không thấy dòng chưa commit của bên kia và cliMsgId không bao giờ được ghép.
 */
const lockRef = (tx: Pick<TenantTx, '$executeRaw'>, accountId: string, msgId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pref:${accountId}:${msgId}`}, 0))`;

type Ref = { threadId: string; isGroup: boolean; msgId: string; cliMsgId: string | null; senderId?: string | null };

/** Ghi tham chiếu các phần của một tin (idempotent theo (message, part)); cliMsgId chờ sẵn (self-event tới trước) được ghép luôn. */
export async function saveMessageRefs(tx: TenantTx, accountId: string, messageId: string, parts: readonly Ref[], now: Date): Promise<void> {
  for (const [partNo, p] of parts.entries()) {
    await lockRef(tx, accountId, p.msgId);
    const pending = p.cliMsgId ? null : await tx.providerPendingRef.findUnique({ where: { channelAccountId_msgId: { channelAccountId: accountId, msgId: p.msgId } } });
    const cli = p.cliMsgId ?? (pending && pending.expiresAt > now && pending.threadId === p.threadId ? pending.cliMsgId : null);
    // Cùng msgId đã thuộc tin khác của tài khoản (kênh trả lại id cũ) → bỏ qua, không gán nhầm.
    const taken = await tx.messageProviderRef.findUnique({ where: { channelAccountId_msgId: { channelAccountId: accountId, msgId: p.msgId } }, select: { messageId: true } });
    if (taken && taken.messageId !== messageId) continue;
    await tx.messageProviderRef.upsert({
      where: { messageId_partNo: { messageId, partNo } },
      create: { messageId, partNo, channelAccountId: accountId, threadId: p.threadId, isGroup: p.isGroup, msgId: p.msgId, cliMsgId: cli, senderId: p.senderId ?? null, createdAt: now },
      update: cli ? { cliMsgId: cli } : {},
    });
    if (pending) await tx.providerPendingRef.delete({ where: { channelAccountId_msgId: { channelAccountId: accountId, msgId: p.msgId } } });
  }
}

/**
 * Self-event (tin tự gửi mang cliMsgId): khớp ĐÚNG (tài khoản, msgId) đã ghi → bổ sung cliMsgId. Chưa có (biên nhận gửi chưa tới) →
 * giữ chờ có hạn. Không bao giờ tạo tin / khớp theo chữ hay thời gian. Trả 'joined' | 'pending' | 'noop'.
 */
export async function applySelfRef(tx: TenantTx, accountId: string, ref: ProviderMessageRef, now: Date): Promise<'joined' | 'pending' | 'noop'> {
  if (!ref.cliMsgId) return 'noop';
  await lockRef(tx, accountId, ref.msgId);
  const row = await tx.messageProviderRef.findUnique({ where: { channelAccountId_msgId: { channelAccountId: accountId, msgId: ref.msgId } } });
  if (row) {
    if (row.threadId !== ref.threadId || row.cliMsgId) return 'noop';
    await tx.messageProviderRef.update({ where: { messageId_partNo: { messageId: row.messageId, partNo: row.partNo } }, data: { cliMsgId: ref.cliMsgId } });
    return 'joined';
  }
  const expiresAt = new Date(now.getTime() + PENDING_REF_TTL_MS);
  await tx.providerPendingRef.upsert({
    where: { channelAccountId_msgId: { channelAccountId: accountId, msgId: ref.msgId } },
    create: { channelAccountId: accountId, msgId: ref.msgId, cliMsgId: ref.cliMsgId, threadId: ref.threadId, isGroup: ref.isGroup, expiresAt },
    update: { cliMsgId: ref.cliMsgId, expiresAt },
  });
  return 'pending';
}

/** Tham chiếu các phần của tin (theo thứ tự) — rỗng = tin chưa có tham chiếu phía kênh (tin cũ / chưa gửi xong). */
export async function messageRefs(tx: Pick<TenantTx, 'messageProviderRef'>, messageId: string) {
  return tx.messageProviderRef.findMany({ where: { messageId }, orderBy: { partNo: 'asc' } });
}

/** Tin của tài khoản theo msgId phía kênh (sự kiện kênh) — chỉ trong đúng tài khoản. */
export async function messageByProviderId(tx: Pick<TenantTx, 'messageProviderRef'>, accountId: string, msgId: string) {
  return tx.messageProviderRef.findUnique({ where: { channelAccountId_msgId: { channelAccountId: accountId, msgId } } });
}

/** Dọn self-event chờ đã hết hạn (bị chặn số dòng mỗi lần). */
export async function purgePendingRefs(tx: Pick<TenantTx, '$executeRaw'>, now: Date, limit = 500): Promise<number> {
  return tx.$executeRaw`
    DELETE FROM provider_pending_ref WHERE (channel_account_id, msg_id) IN (
      SELECT channel_account_id, msg_id FROM provider_pending_ref WHERE expires_at <= ${now} ORDER BY expires_at LIMIT ${limit})`;
}
