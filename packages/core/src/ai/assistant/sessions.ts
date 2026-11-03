// Phiên + tin của Trợ lý (Blueprint §2.2 ai-assistant, §4.4): mỗi người dùng chỉ thấy phiên của mình. Tin lưu `content.parts[]`
// (text / card + trạng thái / ui_command). Lịch sử đưa vào model = ≤ 30 tin gần nhất (chữ + tóm tắt thẻ) — không gửi lại JSON thô.
// Tìm phiên không dấu theo tiêu đề: `f_unaccent(lower(title)) LIKE` (index trigram `assistant_session_title_trgm_idx`).
import type { RunMessage } from '@appchat/ai';
import { TenantSql, type TenantDb } from '@appchat/db';
import { AppError, foldText, type AssistantMessageDto, type AssistantSessionDto, type ConfirmEventDto, type UiCommandDto } from '@appchat/shared';
import { uuidv7 } from '../../kernel/ids';
import type { AssistantMode } from './catalog';
import type { StoredUiPart } from './genui/history';

export const HISTORY_LIMIT = 30;
const SESSIONS_LIMIT = 50;
const TITLE_MAX = 80;

/** Trạng thái thẻ: `approval` = đã xác nhận nhưng governance chuyển sang duyệt — chưa thực hiện. */
export type CardStatus = 'pending' | 'done' | 'cancelled' | 'approval';
export type Part = { type: 'text'; text: string } | { type: 'card'; card: ConfirmEventDto; status: CardStatus } | { type: 'ui_command'; command: UiCommandDto } | StoredUiPart;
type Db = Pick<TenantDb, 'assistantSession' | 'assistantMessage' | '$queryRaw'>;
type Row = Awaited<ReturnType<TenantDb['assistantMessage']['findMany']>>[number];

const partsOf = (content: unknown): Part[] => ((content ?? {}) as { parts?: Part[] }).parts ?? [];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Phiên của chính người gọi (khác người / không có → 404 — không lộ phiên người khác). */
export async function ownSession(db: Db, userId: string, id: string) {
  const s = UUID.test(id) ? await db.assistantSession.findUnique({ where: { id } }) : null;
  if (!s || s.userId !== userId) throw new AppError('NOT_FOUND', 404, { session_id: 'not_found' });
  return s;
}

/** Nối phiên có sẵn hoặc tạo phiên mới (tiêu đề = câu đầu, cắt 80 ký tự). */
export async function openSession(db: Db, userId: string, mode: AssistantMode, firstText: string, id: string | undefined, now: Date) {
  if (id) {
    const s = await ownSession(db, userId, id);
    return s.mode === mode ? s : db.assistantSession.update({ where: { id: s.id }, data: { mode } });
  }
  const title = firstText.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);
  return db.assistantSession.create({ data: { id: uuidv7(now.getTime()), userId, title, mode, lastMessageAt: now, createdAt: now } });
}

export async function appendMessage(db: Db, sessionId: string, role: 'user' | 'assistant', parts: Part[], runId: string | null, at: Date) {
  // Thứ tự tin trong phiên theo `created_at`: luôn tăng (hai tin cùng mili-giây vẫn đúng thứ tự ghi).
  const last = await db.assistantMessage.findFirst({ where: { sessionId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  const now = last && last.createdAt >= at ? new Date(last.createdAt.getTime() + 1) : at;
  const id = uuidv7(now.getTime());
  await db.assistantMessage.create({ data: { id, sessionId, role, content: { parts } as object, runId, createdAt: now } });
  await db.assistantSession.update({ where: { id: sessionId }, data: { lastMessageAt: now } });
  return id;
}

/** Đổi trạng thái thẻ (pending → done / cancelled) trong tin đã lưu theo confirm_token. */
export async function markCard(db: Db, runId: string, token: string, status: Exclude<CardStatus, 'pending'>): Promise<void> {
  const rows = await db.assistantMessage.findMany({ where: { runId, role: 'assistant' }, select: { id: true, content: true } });
  for (const r of rows) {
    const parts = partsOf(r.content);
    if (!parts.some((p) => p.type === 'card' && p.card.confirm_token === token)) continue;
    const next = parts.map((p) => (p.type === 'card' && p.card.confirm_token === token ? { ...p, status } : p));
    await db.assistantMessage.update({ where: { id: r.id }, data: { content: { parts: next } as object } });
  }
}

/** Thẻ đã Sửa: thay thẻ của token cũ bằng thẻ mới (token mới) trong tin đã lưu — vẫn `pending`. */
export async function replaceCard(db: Db, runId: string, token: string, card: ConfirmEventDto): Promise<void> {
  const rows = await db.assistantMessage.findMany({ where: { runId, role: 'assistant' }, select: { id: true, content: true } });
  for (const r of rows) {
    const parts = partsOf(r.content);
    if (!parts.some((p) => p.type === 'card' && p.card.confirm_token === token)) continue;
    const next = parts.map((p) => (p.type === 'card' && p.card.confirm_token === token ? { ...p, card } : p));
    await db.assistantMessage.update({ where: { id: r.id }, data: { content: { parts: next } as object } });
  }
}

const recent = (db: Db, sessionId: string, take: number) =>
  db.assistantMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'desc' }, take }).then((r) => r.reverse());

/** Lịch sử cho model: chữ của từng tin; thẻ → một dòng tóm tắt (đã xác nhận / huỷ / chờ). */
export async function historyMessages(db: Db, sessionId: string): Promise<RunMessage[]> {
  const out: RunMessage[] = [];
  for (const r of await recent(db, sessionId, HISTORY_LIMIT)) {
    const text = partsOf(r.content)
      .map((p) => (p.type === 'text' ? p.text : p.type === 'card' ? `[${p.card.action_id}: ${p.card.title} — ${p.status}]` : p.type === 'ui' ? '[ui]' : ''))
      .filter(Boolean)
      .join('\n');
    if (text) out.push({ role: r.role === 'user' ? 'user' : 'assistant', content: text });
  }
  return out;
}

const dto = (r: Row): AssistantMessageDto[] =>
  partsOf(r.content)
    .filter((p) => p.type !== 'ui_command' && p.type !== 'ui')
    .map((p, i) => ({
      id: `${r.id}:${i}`,
      role: r.role === 'user' ? ('user' as const) : ('ai' as const),
      text: p.type === 'text' ? p.text : '',
      ...(p.type === 'card' ? { card: p.card, status: p.status } : {}),
      run_id: r.runId,
    }));

/** Dựng phần `ui` đã lưu cho người xem (refs + intent theo quyền hiện hành — genui/history.ts). */
export type UiPresenter = (p: StoredUiPart) => Promise<NonNullable<AssistantMessageDto['ui']>>;

/** `GET /assistant/sessions/:id/messages` — tin của phiên (cũ → mới), mỗi phần thành một bong bóng như FE hiển thị. */
export async function sessionMessages(db: Db, userId: string, id: string, limit = 100, ui?: UiPresenter): Promise<AssistantMessageDto[]> {
  await ownSession(db, userId, id);
  const out: AssistantMessageDto[] = [];
  for (const r of await recent(db, id, Math.min(limit, 200))) {
    const parts = partsOf(r.content);
    const plain = dto(r);
    let k = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]!;
      if (p.type === 'ui_command') continue;
      if (p.type === 'ui') {
        // Mở lại phiên: không gọi model, không chạy action — chỉ đọc lại ref + ký lại intent theo quyền hiện hành.
        if (ui) out.push({ id: `${r.id}:ui${i}`, role: 'ai', text: '', ui: await ui(p), run_id: r.runId });
        continue;
      }
      out.push(plain[k++]!);
    }
  }
  return out;
}

/** `GET /assistant/sessions?q=` — phiên chưa lưu trữ của người gọi, mới nhất trước; `q` tìm không dấu theo tiêu đề. */
export async function listSessions(db: Db, userId: string, q = ''): Promise<AssistantSessionDto[]> {
  const term = foldText(q).slice(0, 100);
  const rows = term
    ? await db.$queryRaw<{ id: string; title: string; mode: 'chat' | 'cowork'; last_message_at: Date }[]>(TenantSql.sql`
        SELECT id, title, mode, last_message_at FROM assistant_session
        WHERE user_id = ${userId}::uuid AND archived_at IS NULL AND f_unaccent(lower(title)) LIKE ${`%${term.replace(/[%_\\]/g, '\\$&')}%`}
        ORDER BY last_message_at DESC LIMIT ${SESSIONS_LIMIT}`)
    : (
        await db.assistantSession.findMany({ where: { userId, archivedAt: null }, orderBy: { lastMessageAt: 'desc' }, take: SESSIONS_LIMIT, select: { id: true, title: true, mode: true, lastMessageAt: true } })
      ).map((s) => ({ id: s.id, title: s.title, mode: s.mode, last_message_at: s.lastMessageAt }));
  return rows.map((s) => ({ id: s.id, title: s.title, mode: s.mode, last_message_at: s.last_message_at.toISOString() }));
}
