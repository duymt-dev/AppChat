// Đọc phụ trợ của Hộp thư (Blueprint §4.4 inbox + settings): bộ lọc tài khoản (`/inbox/accounts` — cùng nguồn `channel_account`,
// REQ-B09), meta kênh (`/inbox/channels`), thẻ "Kết nối kênh" (`/inbox/connect-channels` theo manifest), thông tin nhóm
// (`/groups/:id`), câu trả lời mẫu (`/canned-replies`, `/settings/replies`), thẻ (`/tags`, `/settings/tags`).
import type { ChannelRegistry } from '@appchat/channels';
import type { PlatformDb } from '@appchat/db';
import { TAG_PALETTE, foldText, initialsOf, interpolate, serverMessages } from '@appchat/shared';
import { visibleConversation } from './access';
import type { InboxReadService, Viewer } from './read.service';
import { hueOf } from './view';

const CONNECT_CAT: Record<string, 'social' | 'web'> = { chat: 'social', social: 'social', commerce: 'social', email: 'web', web: 'web', sms: 'social' };

export class InboxMetaService {
  constructor(
    private readonly read: InboxReadService,
    private readonly registry: ChannelRegistry,
    private readonly platform: Pick<PlatformDb, 'user'>,
  ) {}

  /** Tài khoản kênh đang dùng + số hội thoại đang hiện trong scope người xem. */
  async accounts(v: Viewer) {
    return this.read.tx(v, async (tx) => {
      const rows = await tx.channelAccount.findMany({ where: { status: { not: 'disconnected' } }, orderBy: { createdAt: 'asc' }, select: { id: true, type: true, name: true } });
      const counts = rows.length ? await tx.conversation.groupBy({ by: ['channelAccountId'], where: { archivedAt: null, hiddenAt: null }, _count: { _all: true } }) : [];
      const n = new Map(counts.map((c) => [c.channelAccountId, c._count._all]));
      return rows.map((a) => ({ id: a.id, channel: a.type, name: a.name, count: n.get(a.id) ?? 0 }));
    });
  }

  /** Meta hiển thị của kênh có adapter (nhãn / ký hiệu / màu — manifest.display) + `create_group` khi adapter thật tạo được nhóm (TIP-023b). */
  channels() {
    const can = (t: string) => !!this.registry.get(t)?.manifest.capabilities.createGroup && !!this.registry.get(t)?.adapter?.createGroup;
    return Object.fromEntries(this.registry.manifests().filter((m) => m.status !== 'coming_soon').map((m) => [m.type, { label: m.display.name, short: m.display.short, color: m.display.color, create_group: can(m.type) }]));
  }

  /** Thẻ modal "Kết nối kênh" của Hộp thư — theo manifest (kênh chưa có adapter = "Sắp có"). */
  connectChannels(locale = 'vi') {
    const t = serverMessages(locale).inbox.connect as Record<string, { tag: string; time: string }>;
    return this.registry
      .manifests()
      .filter((m) => m.display.group !== 'shop')
      .map((m) => {
        const txt = t[m.type] ?? t.soon!;
        return { type: m.type, name: m.display.name, tag: txt.tag, status: m.status, time: txt.time, short: m.display.short, color: m.display.color, cat: CONNECT_CAT[m.group] ?? 'social' };
      });
  }

  /** Thông tin nhóm (panel phải khi mở hội thoại nhóm). Tệp / ảnh / link từ tin của nhóm. */
  async group(v: Viewer, id: string) {
    const p = await this.read.place(v);
    const m = serverMessages(p.locale).inbox.group;
    return this.read.tx(v, async (tx) => {
      const c = await visibleConversation(tx, v.authz, id);
      if (c.kind !== 'group') return null;
      const people = await tx.conversationParticipant.findMany({ where: { conversationId: c.id }, orderBy: { lastSeenAt: 'desc' }, take: 50 });
      const files = await tx.message.findMany({ where: { conversationId: c.id, kind: { in: ['file', 'image'] }, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 12, select: { kind: true, body: true, attachments: true, senderName: true } });
      // Tin khách sau lần trả lời cuối của shop.
      const lastOut = await tx.message.findFirst({ where: { conversationId: c.id, direction: 'out' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
      const unanswered = await tx.message.count({ where: { conversationId: c.id, direction: 'in', deletedAt: null, ...(lastOut ? { createdAt: { gt: lastOut.createdAt } } : {}) } });
      const pinned = c.pinnedMessageId ? 1 : 0;
      const linked = people.filter((x) => x.contactId).length;
      const att = (a: unknown) => (Array.isArray(a) ? (a[0] as { name?: string; url?: string } | undefined) : undefined);
      return {
        members_total: people.length,
        members_hint: interpolate(m.hint, { members: people.length, contacts: linked }),
        members: people.map((x) => [x.displayName || x.externalId, initialsOf(x.displayName || '?'), hueOf(x.externalId), x.contactId ? m.member : m.unknown] as [string, string, string, string]),
        pinned_sub: interpolate(m.pinned, { count: pinned }),
        media: files.filter((f) => f.kind === 'image').map((f, i) => [f.body || (att(f.attachments)?.name ?? ''), (i * 47) % 360, 'IMG'] as [string, number, string]),
        files: files
          .filter((f) => f.kind === 'file')
          .map((f) => {
            const name = att(f.attachments)?.name ?? f.body;
            return [(name.split('.').pop() ?? '').toUpperCase().slice(0, 4), name, f.senderName ?? ''] as [string, string, string];
          }),
        links: [],
        join_link: '',
        unanswered,
        ai_policy: c.groupAiPolicy ?? 'mention',
      };
    });
  }

  /** Câu trả lời mẫu theo nhóm danh mục (popover "/" của khung nhập). */
  async canned(v: Viewer) {
    return this.read.tx(v, async (tx) => {
      const rows = await tx.cannedReply.findMany({ orderBy: [{ category: 'asc' }, { shortcut: 'asc' }] });
      const groups = new Map<string, [string, string, string][]>();
      for (const r of rows) (groups.get(r.category) ?? groups.set(r.category, []).get(r.category)!).push([r.shortcut, r.title, r.body]);
      return [...groups].map(([group, items]) => ({ group, items }));
    });
  }

  async replies(v: Viewer, q?: string) {
    const needle = foldText(q ?? '');
    return this.read.tx(v, async (tx) => {
      const rows = await tx.cannedReply.findMany({ orderBy: { createdAt: 'asc' } });
      return rows
        .filter((r) => !needle || foldText(r.shortcut).includes(needle) || foldText(r.title).includes(needle))
        .map((r) => ({ id: r.id, category: r.category, shortcut: r.shortcut, title: r.title, body: r.body }));
    });
  }

  /** Ô chọn thẻ (nguồn dùng chung khách + hội thoại). */
  async tagOptions(v: Viewer) {
    return this.read.tx(v, async (tx) => (await tx.tag.findMany({ orderBy: { name: 'asc' } })).map((t) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji })));
  }

  /** Cài đặt › Thẻ: số lần dùng = khách + hội thoại gắn thẻ; người tạo / sửa theo tên. */
  async settingsTags(v: Viewer, q?: string) {
    const needle = foldText(q ?? '');
    const data = await this.read.tx(v, async (tx) => {
      const tags = await tx.tag.findMany({ orderBy: { createdAt: 'asc' } });
      const [ct, cv] = await Promise.all([
        tx.contactTag.groupBy({ by: ['tagId'], _count: { _all: true } }),
        tx.conversationTag.groupBy({ by: ['tagId'], _count: { _all: true } }),
      ]);
      const n = new Map<string, number>();
      for (const g of [...ct, ...cv]) n.set(g.tagId, (n.get(g.tagId) ?? 0) + g._count._all);
      return tags.filter((t) => !needle || foldText(t.name).includes(needle)).map((t) => ({ t, count: n.get(t.id) ?? 0 }));
    });
    const ids = [...new Set(data.flatMap(({ t }) => [t.createdByUserId, t.updatedByUserId]).filter((x): x is string => !!x))];
    const users = ids.length ? await this.platform.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
    const name = new Map(users.map((u) => [u.id, u.name || u.email]));
    return {
      data: data.map(({ t, count }) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        emoji: t.emoji,
        description: t.description,
        count,
        created_by: (t.createdByUserId && name.get(t.createdByUserId)) || '',
        source: t.createdByUserId ? 'user' : 'system',
        created_at: t.createdAt.toISOString(),
        updated_by: t.updatedByUserId ? (name.get(t.updatedByUserId) ?? null) : null,
        updated_at: t.updatedAt.toISOString(),
      })),
      palette: [...TAG_PALETTE],
    };
  }
}
