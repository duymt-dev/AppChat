// Một lượt agent mỗi hội thoại (concurrency §5, TIP-045b annex D). Lease BỀN trong DB tenant (khoá Redis một mình không đủ: job
// trùng / restart / worker hết hạn): giành = tăng `ai_turn_fence` + chủ + hạn dưới khoá dòng hội thoại; chỉ một chủ còn hạn tại một
// thời điểm. Gia hạn giới hạn theo timeout lượt; nhả kiểm đúng chủ + fence. Mỗi lần ghi (gợi ý / trạng thái / đặt chỗ gửi) kiểm lại
// `stillOwns` — mất lease thì không ghi gì ngoài nháp không gửi có lý do.
import type { TenantDb } from '@appchat/db';

/** Hạn một lượt (≥ thời gian chạy tối đa của run trả lời) — gia hạn không vượt quá TURN_MAX_MS kể từ lúc giành. */
export const TURN_LEASE_MS = 120_000;
export const TURN_MAX_MS = 10 * 60_000;

export interface TurnLease {
  conversationId: string;
  owner: string;
  fence: number;
  /** Epoch hội thoại lúc giành — người tiếp quản / đổi chế độ tăng epoch → lượt này hết quyền gửi. */
  epoch: number;
  acquiredAt: Date;
}

type Db = Pick<TenantDb, '$transaction'>;

/** Giành lượt: không có chủ / chủ hết hạn → fence + 1. Đang có chủ khác còn hạn → null (job trùng không tạo run thứ hai). */
export async function acquireTurn(db: Db, conversationId: string, owner: string, now: Date): Promise<TurnLease | null> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ ai_turn_owner: string | null; ai_turn_until: Date | null; ai_turn_fence: number; ai_epoch: number }[]>`
      SELECT ai_turn_owner, ai_turn_until, ai_turn_fence, ai_epoch FROM conversation WHERE id = ${conversationId}::uuid FOR UPDATE`;
    const c = rows[0];
    if (!c) return null;
    if (c.ai_turn_owner && c.ai_turn_owner !== owner && c.ai_turn_until && c.ai_turn_until > now) return null;
    const fence = c.ai_turn_fence + 1;
    await tx.conversation.update({ where: { id: conversationId }, data: { aiTurnFence: fence, aiTurnOwner: owner, aiTurnUntil: new Date(now.getTime() + TURN_LEASE_MS) } });
    return { conversationId, owner, fence, epoch: c.ai_epoch, acquiredAt: now };
  });
}

/** Gia hạn khi còn đúng chủ + fence + epoch, không quá TURN_MAX_MS từ lúc giành. false = đã mất lượt. */
export async function renewTurn(db: Pick<TenantDb, 'conversation'>, l: TurnLease, now: Date): Promise<boolean> {
  if (now.getTime() - l.acquiredAt.getTime() > TURN_MAX_MS) return false;
  const r = await db.conversation.updateMany({
    where: { id: l.conversationId, aiTurnOwner: l.owner, aiTurnFence: l.fence, aiEpoch: l.epoch },
    data: { aiTurnUntil: new Date(now.getTime() + TURN_LEASE_MS) },
  });
  return r.count === 1;
}

/** Còn giữ lượt (đúng chủ + fence + epoch, chưa hết hạn) — đọc trong transaction của người gọi (sau khoá nếu cần tuyến tính). */
export async function stillOwns(db: Pick<TenantDb, 'conversation'>, l: TurnLease, now: Date): Promise<boolean> {
  const c = await db.conversation.findUnique({ where: { id: l.conversationId }, select: { aiTurnOwner: true, aiTurnFence: true, aiTurnUntil: true, aiEpoch: true } });
  return !!c && c.aiTurnOwner === l.owner && c.aiTurnFence === l.fence && c.aiEpoch === l.epoch && !!c.aiTurnUntil && c.aiTurnUntil > now;
}

/** Nhả lượt: chỉ đúng chủ + fence (lượt mới đã giành sau khi hết hạn không bị xoá nhầm). */
export async function releaseTurn(db: Pick<TenantDb, 'conversation'>, l: TurnLease): Promise<void> {
  await db.conversation.updateMany({ where: { id: l.conversationId, aiTurnOwner: l.owner, aiTurnFence: l.fence }, data: { aiTurnOwner: null, aiTurnUntil: null } });
}
