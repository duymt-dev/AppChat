// Người tiếp quản hội thoại (concurrency §5, TIP-045b annex D). Khoá dòng hội thoại (`FOR UPDATE`) là khoá DUY NHẤT dùng chung
// giữa người gửi và đặt chỗ gửi của agent (send-fence) → hai bên tuyến tính hoá. Người (hoặc Trợ lý làm thay người) gửi / chuyển tiếp
// / gửi email khi `ai_mode = auto` → `copilot` trong CÙNG transaction với tin đi, tăng `ai_epoch` (lượt agent đang chạy thấy lệch →
// không gửi). Ghi chú nội bộ không gửi, không đổi chế độ. Agent / hệ thống gửi không mạo danh người (không đổi chế độ).
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

/** Khoá dòng hội thoại tới hết transaction; trả bản ghi mới nhất (đọc sau khoá). */
export async function lockConversation(tx: TenantTx, id: string): Promise<Conv | null> {
  await tx.$queryRaw`SELECT id FROM conversation WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.conversation.findUnique({ where: { id } });
}

/** Người thật ra lệnh (UI / API của người, Trợ lý làm thay người) — không phải agent trực kênh / tác vụ / hệ thống. */
export const isHumanOperator = (ctx: Pick<ActionContext, 'actor' | 'source'>) =>
  ctx.actor.type === 'user' || (ctx.actor.type === 'assistant' && ctx.source === 'assistant');

export interface TakeoverResult {
  conv: Conv;
  /** Đã chuyển auto → copilot ở lần gửi này. */
  switched: boolean;
  /** Tin agent đã đặt chỗ gửi trước người (đang gửi / chưa rõ kết quả) — hiển thị trung thực, không giả là đã chặn. */
  agentInFlight: boolean;
}

/**
 * Gọi ĐẦU transaction gửi của người: khoá hội thoại → auto → copilot + `ai_epoch + 1` + huỷ lượt agent đang giữ (fence giữ nguyên, hạn
 * về 0 — lượt cũ mất quyền ghi). Tin agent còn `pending` (chưa đặt chỗ) bị huỷ: không gọi kênh, giữ nội dung làm nháp.
 */
export async function takeOverForHuman(tx: TenantTx, ctx: Pick<ActionContext, 'actor' | 'source'>, c: Conv): Promise<TakeoverResult> {
  if (!isHumanOperator(ctx)) return { conv: c, switched: false, agentInFlight: false };
  const cur = (await lockConversation(tx, c.id)) ?? c;
  // Tin agent (có fence) của hội thoại chưa xong — index message (conversation_id, created_at) + outbox message_id unique.
  const agentOut = await tx.$queryRaw<{ id: string; status: string; message_id: string; payload: unknown }[]>`
    SELECT o.id, o.status::text AS status, o.message_id, o.payload FROM outbox_message o JOIN message m ON m.id = o.message_id
    WHERE m.conversation_id = ${cur.id}::uuid AND o.turn_fence IS NOT NULL AND o.status IN ('pending', 'dispatch_reserved', 'sending')`;
  const pending = agentOut.filter((o) => o.status === 'pending');
  const inFlight = agentOut.some((o) => o.status !== 'pending');
  for (const o of pending) {
    await tx.outboxMessage.update({ where: { id: o.id }, data: { status: 'dead', lastError: 'human_takeover' } });
    await tx.message.update({ where: { id: o.message_id }, data: { status: 'failed', error: 'human_takeover' } });
  }
  const draft = pending.map((o) => (o.payload as { text?: string }).text ?? '').filter(Boolean).join('\n');
  const switched = cur.aiMode === 'auto';
  const conv = await tx.conversation.update({
    where: { id: cur.id },
    data: {
      aiEpoch: { increment: 1 },
      aiTurnUntil: null,
      aiTurnOwner: null,
      ...(switched ? { aiMode: 'copilot' } : {}),
      ...(cur.aiState === 'running' ? { aiState: 'idle' } : {}),
      // Bản nháp agent chưa gửi giữ lại cho người (không ghi đè nháp người đã có).
      ...(draft && !cur.aiDraft ? { aiDraft: draft.slice(0, 4000) } : {}),
    },
  });
  return { conv, switched, agentInFlight: inFlight };
}

/** Đổi chế độ / chuyển người / đóng / lưu trữ thủ công: lượt agent đang chạy mất hiệu lực (cùng khoá với đặt chỗ gửi). */
export async function bumpAiEpoch(tx: TenantTx, id: string): Promise<void> {
  await lockConversation(tx, id);
  await tx.conversation.update({ where: { id }, data: { aiEpoch: { increment: 1 }, aiTurnUntil: null, aiTurnOwner: null } });
}
