// Đặt chỗ gửi tin agent (TIP-045b annex D) — điểm tuyến tính hoá với người tiếp quản. Transaction ngắn, khoá CÙNG dòng hội thoại với
// `takeOverForHuman`: kiểm `ai_epoch` lúc ghi tin + `ai_mode = auto` + chưa có tin người mới hơn → `pending → dispatch_reserved`. Fence
// lượt đã kiểm khi GHI tin (assertTurnWritable, dưới cùng khoá) — không so lại ở đây: lượt mới cho tin khách sau không được làm rơi câu
// trả lời hợp lệ của lượt trước.
//  - Người commit trước: epoch đã tăng / chế độ copilot → từ chối, KHÔNG gọi kênh, nội dung giữ làm nháp (takeover đã huỷ tin).
//  - Đặt chỗ commit trước: tin coi như đang gửi (dù chưa gọi mạng); người tiếp quản thấy "đang gửi", không giả là đã chặn.
// Gọi kênh MỘT lần ngoài transaction; không giữ khoá qua I/O mạng. Tin người (không fence) đi thẳng như cũ.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export type ReserveOutcome = 'reserved' | 'not_agent' | 'rejected' | 'missing' | 'already';

type Db = Pick<TenantDb, '$transaction'>;

/** Đặt chỗ một outbox gửi (ref_id = outbox id). `not_agent` = tin người → gửi bình thường. */
export async function reserveDispatch(db: Db, outboxId: string, now: Date): Promise<ReserveOutcome> {
  return db.$transaction(async (tx) => {
    const ob = await tx.outboxMessage.findUnique({ where: { id: outboxId }, select: { id: true, status: true, messageId: true, turnFence: true, aiEpoch: true } });
    if (!ob) return 'missing';
    if (ob.turnFence === null) return 'not_agent';
    if (ob.status === 'dispatch_reserved' || ob.status === 'sending' || ob.status === 'sent') return 'already';
    if (ob.status !== 'pending') return 'rejected';
    const msg = await tx.message.findUnique({ where: { id: ob.messageId }, select: { conversationId: true, createdAt: true } });
    if (!msg) return 'missing';
    const rows = await tx.$queryRaw<{ ai_mode: string; ai_epoch: number }[]>`
      SELECT ai_mode::text AS ai_mode, ai_epoch FROM conversation WHERE id = ${msg.conversationId}::uuid FOR UPDATE`;
    const c = rows[0];
    // Tin người mới hơn tin agent (người đã trả lời) → agent không gửi đè.
    const human = await tx.message.findFirst({ where: { conversationId: msg.conversationId, direction: 'out', senderType: 'user', createdAt: { gt: msg.createdAt } }, select: { id: true } });
    const ok = !!c && c.ai_mode === 'auto' && c.ai_epoch === ob.aiEpoch && !human;
    if (!ok) {
      await tx.outboxMessage.update({ where: { id: ob.id }, data: { status: 'dead', lastError: 'fence_rejected' } });
      await tx.message.update({ where: { id: ob.messageId }, data: { status: 'failed', error: 'fence_rejected' } });
      return 'rejected';
    }
    await tx.outboxMessage.update({ where: { id: ob.id }, data: { status: 'dispatch_reserved', reservedAt: now } });
    return 'reserved';
  });
}

/**
 * Kiểm lượt khi GHI tin agent (trong transaction của `message.send`, khoá dòng hội thoại): đúng fence + epoch + `ai_mode = auto`.
 * Sai → 409 `turn: superseded` (người đã tiếp quản / lượt đã mất) — người gọi không chuyển sang handoff, không ghi đè nháp người.
 */
export async function assertTurnWritable(tx: Pick<TenantTx, '$queryRaw'>, conversationId: string, turn: { fence: number; epoch: number }): Promise<void> {
  const rows = await tx.$queryRaw<{ ai_mode: string; ai_epoch: number; ai_turn_fence: number }[]>`
    SELECT ai_mode::text AS ai_mode, ai_epoch, ai_turn_fence FROM conversation WHERE id = ${conversationId}::uuid FOR UPDATE`;
  const c = rows[0];
  if (!c || c.ai_mode !== 'auto' || c.ai_epoch !== turn.epoch || c.ai_turn_fence !== turn.fence) throw new AppError('INVALID_STATE', 409, { turn: 'superseded' });
}

export const isSuperseded = (e: unknown) => e instanceof AppError && e.fields?.turn === 'superseded';
