// Đọc Hộp thư cho apps/api (Blueprint §4.4 inbox — shape packages/shared/src/api/inbox.ts): danh sách (keyset), đếm thư mục,
// một hội thoại, tin theo trang (mới nhất trước) / cửa sổ quanh tin / tìm có trang (thread-window — TIP-025b), tìm trong hội thoại (REQ-C12). Mỗi lệnh một transaction chỉ-đọc trên
// DB tenant (TenantDbResolver) + scope inbox của người xem (rbac §5).
import { TenantSql as Prisma, TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { foldRanges, foldText, type AuthzContext, type ConversationDto, type FolderCountsDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { folderCounts, listConversationIds, type ConvFilter } from '../repos/conversations.repo';
import { visibleConversation, type Conv } from './access';
import { toConversation, type ConvExtras, type Place } from './view';
import { threadAround, threadPage, threadSearchPage, type ThreadCtx } from './thread-window';
import { avatarKey, avatarLinks } from '../../channels/operations/avatar-read';
import type { FileLinks } from '../../kernel/files/file-links';

export interface Viewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const MAX_LIMIT = 100;
const THREAD_PAGE = 50;
const SENDERS = new Set(['contact', 'user', 'agent']);

/** Gợi ý copilot của agent (TIP-022) lưu ở hội thoại `{ text, confidence (%) }` → thẻ gợi ý ở luồng tin. */
function suggestionOf(v: unknown): { text: string; confidence: number } | null {
  const s = v as { text?: unknown; confidence?: unknown } | null;
  return s && typeof s.text === 'string' && s.text ? { text: s.text, confidence: Number(s.confidence) || 0 } : null;
}

export class InboxReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly platform: Pick<PlatformDb, 'user' | 'workspace'>,
    private readonly now: () => Date,
    /** Link ký ảnh đại diện (TIP-014b D); null → không trả ảnh. */
    private readonly links: FileLinks | null = null,
  ) {}

  async tx<T>(v: Viewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const db = await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(fn);
  }

  /** Locale người xem + múi giờ workspace + "bây giờ" (giờ hiển thị). */
  async place(v: Viewer): Promise<Place> {
    const [u, ws] = await Promise.all([
      this.platform.user.findUnique({ where: { id: v.userId }, select: { locale: true } }),
      this.platform.workspace.findUnique({ where: { id: v.workspaceId }, select: { timezone: true } }),
    ]);
    return { locale: u?.locale ?? 'vi', timeZone: ws?.timezone ?? 'Asia/Ho_Chi_Minh', now: this.now() };
  }

  async list(v: Viewer, f: ConvFilter, cursor?: string, limit?: number) {
    const p = await this.place(v);
    return this.tx(v, async (tx) => {
      const { ids, next } = await listConversationIds(tx, v.authz, f, p.now, cursor, Math.min(MAX_LIMIT, Math.max(1, limit ?? 50)));
      return { data: await this.rows(tx, ids, p, v.workspaceId), next_cursor: next };
    });
  }

  async get(v: Viewer, id: string): Promise<ConversationDto> {
    const p = await this.place(v);
    return this.tx(v, async (tx) => {
      const c = await visibleConversation(tx, v.authz, id);
      return (await this.rows(tx, [c.id], p, v.workspaceId))[0]!;
    });
  }

  /** Đếm thư mục theo scope + bộ lọc hiện tại (kênh / tài khoản / thẻ / tìm kiếm — không nhận `folder`: mỗi thư mục tự là điều kiện). */
  async counts(v: Viewer, f: Omit<ConvFilter, 'folder' | 'sort'> = {}): Promise<FolderCountsDto> {
    const now = this.now();
    return this.tx(v, async (tx) => {
      const n = await folderCounts(tx, v.authz, now, f);
      const synced = await tx.channelAccount.count({ where: { status: 'connected' } });
      const total = await tx.conversation.count();
      return {
        tabs: [['all', n.all, null], ['mine', n.mine, 'brand'], ['mention', n.mention, 'amber'], ['unread', n.unread, null], ['ai_pending_approval', n.ai_pending_approval, 'violet'], ['vip', n.vip, null], ['complaint', n.complaint, null]],
        // "Gắn sao" / "Spam" chưa có dữ liệu (DC-140) → không trả về, rail không hiện.
        mailbox: [['all', 'ic-inbox', n.all], ['unread', 'ic-mail', n.unread], ['mention', '@', n.mention], ['mine', 'ic-users', n.mine], ['team', 'ic-users', n.team]],
        ai: [['ai_running', 'ic-bot', n.ai_running], ['ai_pending_approval', 'ic-spark', n.ai_pending_approval], ['needs_human', 'ic-bell', n.needs_human]],
        channels: Object.entries(n.byChannel),
        saved: [],
        synced,
        ...(total === 0 ? { empty: true } : {}),
      };
    });
  }

  /** Tin theo trang: trang đầu = 50 tin mới nhất; `cursor` = tin cũ hơn; `after` = tin mới hơn (sau khi nhảy tới kết quả tìm — TIP-025b). */
  async messages(v: Viewer, id: string, cursor?: string, after?: string) {
    const p = await this.place(v);
    return this.tx(v, async (tx) => {
      const c = await visibleConversation(tx, v.authz, id);
      const r = await threadPage(this.ctx(tx, c, v, p), THREAD_PAGE, cursor, after);
      return { ...r, suggestion: suggestionOf(c.aiSuggestion) };
    });
  }

  /** Cửa sổ ≤ 51 tin quanh một tin (TIP-025b §B.2). */
  async around(v: Viewer, id: string, messageId: string) {
    const p = await this.place(v);
    return this.tx(v, async (tx) => threadAround(this.ctx(tx, await visibleConversation(tx, v.authz, id), v, p), messageId));
  }

  /** Tìm có trang trong ảnh chụp (TIP-025b §B.1). */
  async searchPage(v: Viewer, id: string, q: string, sender: string, cursor?: string, limit?: number) {
    const p = await this.place(v);
    return this.tx(v, async (tx) => threadSearchPage(this.ctx(tx, await visibleConversation(tx, v.authz, id), v, p), q, sender, cursor, limit));
  }

  private ctx(tx: TenantTx, c: Conv, v: Viewer, p: Place): ThreadCtx {
    return { tx, c, userId: v.userId, ws: v.workspaceId, p, links: this.links };
  }

  /** Tìm trong hội thoại (REQ-C12): không dấu, lọc người gửi; `ranges` = vị trí khớp trong `body` để tô. */
  async search(v: Viewer, id: string, q: string, sender: string) {
    const p = await this.place(v);
    const needle = foldText(q).slice(0, 100);
    if (!needle) return [];
    const like = `%${needle.replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    return this.tx(v, async (tx) => {
      const c = await visibleConversation(tx, v.authz, id);
      const who = SENDERS.has(sender) ? Prisma.sql`AND m.sender_type = ${sender}::sender_type` : Prisma.empty;
      const after = c.clearedAt ? Prisma.sql`AND m.created_at > ${c.clearedAt}` : Prisma.empty;
      // Cùng biểu thức với index `message_body_trgm_idx`.
      const rows = await tx.$queryRaw<{ id: string; body: string; sender_type: 'contact' | 'user' | 'agent' | 'system'; created_at: Date }[]>`
        SELECT m.id, m.body, m.sender_type::text AS sender_type, m.created_at FROM message m
        WHERE m.conversation_id = ${c.id}::uuid AND m.deleted_at IS NULL AND m.recalled_at IS NULL AND m.kind <> 'note'
          AND f_unaccent(lower(m.body)) LIKE ${like} ${who} ${after}
        ORDER BY m.created_at ASC, m.id ASC LIMIT 200`;
      const time = new Intl.DateTimeFormat(p.locale === 'en' ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: p.timeZone, hour12: false });
      return rows.map((r) => ({ message_id: r.id, body: r.body, sender: r.sender_type, time: time.format(r.created_at), ranges: foldRanges(r.body, q) }));
    });
  }

  /** Bước 2 deferred join: đủ cột cho các id của trang (giữ thứ tự bước 1) + tên khách / tài khoản / thẻ / số thành viên. */
  private async rows(tx: TenantTx, ids: string[], p: Place, ws: string): Promise<ConversationDto[]> {
    if (!ids.length) return [];
    const convs = await tx.conversation.findMany({ where: { id: { in: ids } } });
    const order = new Map(ids.map((id, i) => [id, i]));
    convs.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    const contactIds = [...new Set(convs.map((c) => c.contactId).filter((x): x is string => !!x))];
    const accountIds = [...new Set(convs.map((c) => c.channelAccountId))];
    const groupIds = convs.filter((c) => c.kind === 'group').map((c) => c.id);
    const [contacts, accounts, links, members] = await Promise.all([
      contactIds.length ? tx.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, name: true, avatarUrl: true } }) : [],
      tx.channelAccount.findMany({ where: { id: { in: accountIds } }, select: { id: true, name: true } }),
      tx.conversationTag.findMany({ where: { conversationId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
      groupIds.length ? tx.conversationParticipant.groupBy({ by: ['conversationId'], where: { conversationId: { in: groupIds } }, _count: { _all: true } }) : [],
    ]);
    const tagRows = links.length ? await tx.tag.findMany({ where: { id: { in: [...new Set(links.map((l) => l.tagId))] } } }) : [];
    const tagById = new Map(tagRows.map((t) => [t.id, t]));
    const tags = new Map<string, { name: string; color: string; emoji: string }[]>();
    for (const l of links) {
      const t = tagById.get(l.tagId);
      if (t) (tags.get(l.conversationId) ?? tags.set(l.conversationId, []).get(l.conversationId)!).push({ name: t.name, color: t.color, emoji: t.emoji });
    }
    const x: ConvExtras = {
      contactName: new Map(contacts.map((c) => [c.id, c.name])),
      accountName: new Map(accounts.map((a) => [a.id, a.name])),
      tags,
      members: new Map(members.map((m) => [m.conversationId, m._count._all])),
      avatars: await this.convAvatars(tx, convs, contacts, ws),
    };
    return convs.map((c) => toConversation(c, x, p));
  }

  /** Ảnh hội thoại 1-1: ảnh nhân viên đặt cho khách thắng; không có → ảnh đồng bộ của định danh thread (TIP-014b D). Nhóm: chữ cái đầu. */
  private async convAvatars(tx: TenantTx, convs: { id: string; kind: string; contactId: string | null; channelAccountId: string; externalThreadId: string }[], contacts: { id: string; avatarUrl: string | null }[], ws: string) {
    const manual = new Map(contacts.filter((c) => c.avatarUrl).map((c) => [c.id, c.avatarUrl!]));
    const direct = convs.filter((c) => c.kind === 'direct');
    const synced = await avatarLinks(tx, this.links, ws, direct.filter((c) => !(c.contactId && manual.has(c.contactId))).map((c) => ({ accountId: c.channelAccountId, externalId: c.externalThreadId })));
    const out = new Map<string, string>();
    for (const c of direct) {
      const url = (c.contactId && manual.get(c.contactId)) || synced.get(avatarKey(c.channelAccountId, c.externalThreadId));
      if (url) out.set(c.id, url);
    }
    return out;
  }
}
