// Dùng chung cho handler inbox: ảnh chụp cột hội thoại (before / undo), event `conversation.updated` (realtime theo scope),
// thẻ theo tên (nguồn thẻ dùng chung với khách — Blueprint §2.2 tag; FE gửi nhãn có thể kèm emoji "⭐ VIP").
import { AppError, foldText } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId, scopeCols } from '../services/access';

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

/** Cột hội thoại action có thể đổi — ảnh chụp cho undo (Date → ISO). */
const SNAP = ['status', 'snoozedUntil', 'assigneeUserId', 'assigneeAgentId', 'aiMode', 'aiState', 'pinned', 'archivedAt', 'hiddenAt', 'pinnedMessageId', 'clearedAt', 'unreadCount'] as const;
type SnapKey = (typeof SNAP)[number];
export type ConvSnap = { id: string } & Partial<Record<SnapKey, unknown>>;

export function snap(c: Conv, keys: readonly SnapKey[] = SNAP): ConvSnap {
  const out: ConvSnap = { id: c.id };
  for (const k of keys) {
    const v = c[k];
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

const DATE_KEYS = new Set<SnapKey>(['snoozedUntil', 'archivedAt', 'hiddenAt', 'clearedAt']);

export async function restore(tx: TenantTx, s: ConvSnap): Promise<void> {
  const { id, ...rest } = s;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) data[k] = DATE_KEYS.has(k as SnapKey) && typeof v === 'string' ? new Date(v) : v;
  await tx.conversation.updateMany({ where: { id }, data });
}

/** Event realtime "hội thoại đổi" (danh sách / khung chat làm mới) — mang cột scope để lọc người nhận. */
export async function updatedEvent(tx: TenantTx, c: Conv, change: string) {
  return { topic: 'conversation.updated', payload: { ...(await scopeCols(tx, c)), change } };
}

export const me = (ctx: ActionContext) => actorUserId(ctx);

/** Tìm thẻ theo nhãn (bỏ emoji đầu nếu trùng emoji của thẻ, so không dấu); `create` → tạo thẻ mới khi chưa có. */
export async function tagByLabel(tx: TenantTx, label: string, by: string | null, now: Date, create: boolean): Promise<{ id: string; name: string } | null> {
  const raw = label.trim();
  const all = await tx.tag.findMany({ select: { id: true, name: true, emoji: true } });
  const want = foldText(raw);
  const hit = all.find((t) => foldText(t.name) === want || (t.emoji && foldText(`${t.emoji} ${t.name}`) === want));
  if (hit) return { id: hit.id, name: hit.name };
  if (!create) return null;
  if (!raw) throw new AppError('VALIDATION_FAILED', 422, { tag: 'too_small' });
  const id = uuidv7(now.getTime());
  await tx.tag.create({ data: { id, name: raw, scope: 'all', createdByUserId: by, createdAt: now } });
  return { id, name: raw };
}

export async function tagNamesOf(tx: TenantTx, conversationId: string): Promise<string[]> {
  const links = await tx.conversationTag.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, select: { tagId: true } });
  if (!links.length) return [];
  const tags = await tx.tag.findMany({ where: { id: { in: links.map((l) => l.tagId) } }, select: { id: true, name: true } });
  const name = new Map(tags.map((t) => [t.id, t.name]));
  return links.map((l) => name.get(l.tagId)).filter((x): x is string => !!x);
}
