// Nguồn tin cậy của quyết định báo giá (TIP-022c §1.1): chụp từ run trả lời kênh (tin khách nguồn lưu ở `ai_run.input` TRƯỚC khi tool
// chạy — 022b) + hội thoại đang giữ lượt — KHÔNG từ input model / nhãn vai trò. Hội thoại nhóm (không rõ ai nói), khách đã gộp vòng / xoá /
// đang bị quên, chế độ không phải auto, tin lịch sử nhập, tin chỉ có tệp không đọc được → không có căn cứ tự động.
import { PiiMasker, type PiiMap } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { sourceDigest } from '../../kernel/actions/customer-intent';
import { isPrivacyFenced } from '../../kernel/privacy/guard';
import { contactState } from '../../crm/lifecycle/identity-state';
import { MAX_SOURCE_MESSAGES, type Deny, type TrustedSource } from './types';

type Db = Pick<TenantDb, 'aiRun' | 'conversation' | 'message' | 'contact' | '$queryRaw'>;

const sourceIdOf = (input: unknown): string | null => {
  const v = (input ?? {}) as { source_message_id?: unknown };
  return typeof v.source_message_id === 'string' ? v.source_message_id : null;
};

export async function captureSource(db: Db, runId: string, conversationId: string, pii: PiiMap): Promise<TrustedSource | Deny> {
  const run = await db.aiRun.findUnique({ where: { id: runId }, select: { input: true, rootRunId: true, conversationId: true } });
  if (!run || run.conversationId !== conversationId) return { deny: 'no_source' };
  const root = run.rootRunId !== runId ? await db.aiRun.findUnique({ where: { id: run.rootRunId }, select: { input: true } }) : null;
  const anchorId = sourceIdOf(run.input) ?? sourceIdOf(root?.input);
  if (!anchorId) return { deny: 'no_source' };

  const c = await db.conversation.findUnique({ where: { id: conversationId }, select: { kind: true, contactId: true, aiMode: true, aiTurnFence: true, aiTurnOwner: true, clearedAt: true } });
  if (!c) return { deny: 'no_source' };
  if (c.kind !== 'direct') return { deny: 'group_source' };
  if (!c.contactId) return { deny: 'no_contact' };
  if (c.aiMode !== 'auto' || !c.aiTurnOwner) return { deny: 'not_auto' };
  const state = await contactState(db, c.contactId);
  if (state.kind !== 'active') return { deny: 'contact_unavailable' };
  if (await isPrivacyFenced(db, c.contactId)) return { deny: 'privacy' };

  const anchor = await db.message.findUnique({ where: { id: anchorId }, select: { conversationId: true, direction: true, origin: true, deletedAt: true, recalledAt: true, createdAt: true } });
  if (!anchor || anchor.conversationId !== conversationId || anchor.direction !== 'in' || anchor.origin !== 'live' || anchor.deletedAt || anchor.recalledAt) return { deny: 'no_source' };
  // Tin trước mốc "xoá lịch sử" không còn là nguồn (P4) — kể cả khi mốc được hoàn tác sau đó, biên nhận cũ đã vô hiệu không hồi sinh.
  if (c.clearedAt && anchor.createdAt <= c.clearedAt) return { deny: 'no_source' };
  // Tập nguồn = tin khách sống kể từ câu trả lời thường gần nhất trước tin neo (lời chào không tính), tối đa 10 tin, kết thúc ở tin neo.
  const lastOut = await db.message.findFirst({
    where: { conversationId, direction: 'out', deletedAt: null, purpose: null, createdAt: { lt: anchor.createdAt } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { createdAt: true },
  });
  const rows = await db.message.findMany({
    where: { conversationId, direction: 'in', origin: 'live', deletedAt: null, recalledAt: null, kind: { notIn: ['note', 'system'] }, createdAt: { lte: anchor.createdAt, ...(lastOut || c.clearedAt ? { gt: [lastOut?.createdAt, c.clearedAt].filter((x): x is Date => !!x).sort((a, b) => b.getTime() - a.getTime())[0] } : {}) } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MAX_SOURCE_MESSAGES,
    select: { id: true, body: true },
  });
  const list = rows.reverse();
  if (!list.some((m) => m.id === anchorId)) return { deny: 'no_source' };
  if (!list.some((m) => m.body.trim())) return { deny: 'attachment_only' };
  const masker = new PiiMasker(pii);
  const messages = list.map((m, i) => ({ id: m.id, ref: `m${i + 1}`, body: m.body, masked: masker.mask(m.body) }));
  return {
    conversationId,
    contactId: c.contactId,
    rootContactId: state.contactId,
    anchorId,
    messages,
    digest: sourceDigest(list),
    turnFence: c.aiTurnFence,
    rootRunId: run.rootRunId,
  };
}
