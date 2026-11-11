// TIP-020c (unit): nháp / gợi ý AI của Hộp thư phụ thuộc nguồn (§3.7–3.8) — nháp ghi kèm run + thế hệ (CAS), `ai_draft_ref` phải khớp
// đúng hội thoại / thế hệ + nguồn còn hợp lệ (409 an toàn khi lệch), nháp tay không bị chặn; chiếu DTO ẩn nháp hết hiệu lực; đặt chỗ gửi
// kiểm lại nguồn trước khi gọi kênh.
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@appchat/shared';
import { agentKnowledge } from '../src/ai/kb/scope/context';
import { dispatchKnowledgeOk, draftFields, draftRefOf, staleAiContent, suggestionRefOf, verifyDraftRef, writeAiDraft } from '../src/ai/kb/scope/draft-binding';
import { toConversation } from '../src/inbox/services/view';

/** Giá trị tham số của một lời gọi $queryRaw (template tag hoặc Prisma.sql) — gồm cả tham số lồng trong Sql con. */
const flat = (args: unknown[]): unknown[] =>
  args.flatMap((a) => (Array.isArray(a) ? ((a as unknown as { raw?: unknown }).raw ? [] : [a]) : a && typeof a === 'object' && Array.isArray((a as { values?: unknown }).values) ? flat((a as { values: unknown[] }).values) : [a]));

const AG = '0190f000-0000-7000-8000-0000000000a1';
const RUN = '0190f000-0000-7000-8000-0000000000c1';
const RUN2 = '0190f000-0000-7000-8000-0000000000c2';
const S1 = '0190f000-0000-7000-8000-0000000000d1';
const F1 = '0190f000-0000-7000-8000-0000000000f1';
const channel = agentKnowledge({ agentId: AG, version: 1, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { channel: true });

/** Tx giả: run RUN có nguồn S1 (thế hệ 1); `alive` = nguồn còn hợp lệ. */
const tx = (alive: boolean) => ({
  aiRun: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, knowledge: channel, knowledgeRefs: [{ s: S1, g: 1, b: RUN }] })) },
  aiAgent: { findUnique: vi.fn(async () => ({ id: AG, status: 'active', deletedAt: null, publishedVersion: 1 })) },
  aiAgentVersion: { findUnique: vi.fn(async () => ({ config: { kb_scope: { folder_ids: [F1], tags: [] } } })) },
  $queryRaw: vi.fn(async (...args: unknown[]) => (flat(args).some((v) => Array.isArray(v) && v.includes(RUN)) ? (alive ? [] : [{ id: RUN }]) : alive ? [{ id: S1, seq: 1 }] : [])),
});

const conv = { id: 'c1', aiDraft: 'Dạ chính sách đổi trả 7 ngày', aiDraftRunId: RUN, aiDraftGen: 3, aiSuggestion: null };

describe('ghi nháp AI (CAS + thế hệ)', () => {
  it('chỉ ghi khi người chưa có nháp, kèm run + tăng thế hệ cùng câu lệnh', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    await writeAiDraft({ conversation: { updateMany } } as never, 'c1', 'x'.repeat(5000), RUN);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'c1', aiDraft: null }, data: { aiDraft: 'x'.repeat(4000), aiDraftRunId: RUN, aiDraftGen: { increment: 1 } } });
    expect(draftFields('a', null)).toEqual({ aiDraft: 'a', aiDraftRunId: null, aiDraftGen: { increment: 1 } });
  });

  it('tham chiếu cho client chỉ khi nháp do run sinh; gợi ý copilot = thế hệ 0', () => {
    expect(draftRefOf(conv)).toEqual({ id: RUN, generation: 3 });
    expect(draftRefOf({ ...conv, aiDraftRunId: null })).toBeNull();
    expect(suggestionRefOf({ text: 'x', confidence: 80, run_id: RUN2 })).toEqual({ id: RUN2, generation: 0 });
  });
});

describe('message.send.ai_draft_ref (AC4 / AC6)', () => {
  const code = async (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.fields);

  it('không ref → tin tay (null, không chặn); khớp + nguồn còn → trả run để ghi outbox', async () => {
    expect(await verifyDraftRef(tx(true) as never, conv, undefined)).toBeNull();
    expect(await verifyDraftRef(tx(true) as never, conv, { id: RUN, generation: 3 })).toBe(RUN);
  });

  it('thế hệ cũ / run khác / hội thoại khác → 409 ai_draft: stale (không lộ nguồn)', async () => {
    expect(await code(verifyDraftRef(tx(true) as never, conv, { id: RUN, generation: 2 }))).toEqual({ ai_draft: 'stale' });
    expect(await code(verifyDraftRef(tx(true) as never, conv, { id: RUN2, generation: 3 }))).toEqual({ ai_draft: 'stale' });
    expect(await code(verifyDraftRef(tx(true) as never, { ...conv, aiDraftRunId: null }, { id: RUN, generation: 3 }))).toEqual({ ai_draft: 'stale' });
  });

  it('nguồn hết hiệu lực sau khi hiển thị → 409 knowledge_revoked (đã từng hiện không đủ để gửi)', async () => {
    expect(await code(verifyDraftRef(tx(false) as never, conv, { id: RUN, generation: 3 }))).toEqual({ ai_draft: 'knowledge_revoked' });
  });

  it('gợi ý copilot đang hiện (thế hệ 0, đúng run) dùng được như nháp', async () => {
    expect(await verifyDraftRef(tx(true) as never, { ...conv, aiSuggestion: { text: 'x', run_id: RUN } }, { id: RUN, generation: 0 })).toBe(RUN);
  });
});

describe('chiếu + đặt chỗ gửi', () => {
  it('danh sách: nháp / gợi ý của run hết hiệu lực → id vào tập ẩn; nháp tay không bị đụng', async () => {
    const s = await staleAiContent(tx(false) as never, [conv, { ...conv, id: 'c2', aiDraftRunId: null }, { ...conv, id: 'c3', aiDraft: null, aiSuggestion: { run_id: RUN } }]);
    expect([...s.drafts]).toEqual(['c1']);
    expect([...s.suggestions]).toEqual(['c3']);
  });

  it('DTO: nháp hết hiệu lực không chiếu; còn hiệu lực chiếu kèm ai_draft_ref', () => {
    const row = { ...conv, kind: 'direct', contactId: null, title: 'Lan', channelType: 'zalo_personal', channelAccountId: 'a', lastMessageAt: new Date(), lastMessagePreview: '', lastSenderName: null, unreadCount: 0, pinned: false, aiState: 'idle', aiMode: 'copilot', handoffReason: null, intent: null, handoffSummary: null, status: 'open', pinnedMessageId: null, hiddenAt: null, assigneeUserId: null, assigneeAgentId: null, archivedAt: null };
    const x = { contactName: new Map(), accountName: new Map(), tags: new Map(), members: new Map() };
    const p = { locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh', now: new Date() };
    expect(toConversation(row as never, x, p as never)).toMatchObject({ ai_draft: conv.aiDraft, ai_draft_ref: { id: RUN, generation: 3 } });
    const hidden = toConversation(row as never, { ...x, staleDrafts: new Set(['c1']) }, p as never);
    expect(hidden.ai_draft).toBeUndefined();
    expect(hidden.ai_draft_ref).toBeUndefined();
  });

  it('đặt chỗ gửi: tin không phụ thuộc nguồn đi như cũ; nguồn hết hiệu lực → không gửi', async () => {
    expect(await dispatchKnowledgeOk(tx(false) as never, null)).toBe(true);
    expect(await dispatchKnowledgeOk(tx(true) as never, RUN)).toBe(true);
    expect(await dispatchKnowledgeOk(tx(false) as never, RUN)).toBe(false);
  });
});
