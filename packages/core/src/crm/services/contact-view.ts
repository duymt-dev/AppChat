// Ánh xạ dòng `contact` → shape hàng danh sách FE (`contactRowSchema` — packages/shared/src/api/crm.ts). Nạp thẻ / số
// collaborator / quyền của người xem theo lô (indexing §9 — không N+1). Ô "AI gợi ý" từ insights/next-action (TIP-015b, bộ luật).
import { SOURCE_STYLE, createFmt, hueOf, initialsOf, interpolate, serverMessages, type AuthzContext, type ContactRowDto, type ContactSource, type CustomValues } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { NextAction } from '../insights/next-action';

export interface ContactRecord {
  id: string;
  code: string;
  name: string;
  kind: 'individual' | 'business' | 'household';
  title: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  city: string | null;
  district: string | null;
  source: string;
  group: 'vip' | 'loyal' | 'new' | 'potential' | null;
  status: 'active' | 'potential' | 'inactive';
  stage: ContactRowDto['stage'];
  ownerUserId: string | null;
  custom: unknown;
  createdAt: Date;
  lastInteractionAt: Date;
  /** Có khi đọc qua ROW_SELECT (TIP-026b) — writer khác có thể không chọn cột này. */
  version?: number;
}

/** Cột cần cho hàng danh sách (indexing §8 — không SELECT *). */
export const ROW_SELECT = {
  id: true, code: true, name: true, kind: true, title: true, phone: true, email: true, zalo: true, city: true, district: true,
  source: true, group: true, status: true, stage: true, ownerUserId: true, custom: true, createdAt: true, lastInteractionAt: true, version: true,
} as const;

export interface RowContext {
  authz: AuthzContext;
  locale: string;
  timeZone: string;
  names: Map<string, string>;
}

/** Thẻ (tên) + collaborator của các khách trong trang. */
export async function loadRowExtras(tx: Pick<TenantTx, 'contactTag' | 'tag' | 'contactCollaborator'>, ids: string[]) {
  if (!ids.length) return { tags: new Map<string, string[]>(), collabs: new Map<string, { userId: string; role: string }[]>() };
  const [links, cc] = await Promise.all([
    tx.contactTag.findMany({ where: { contactId: { in: ids } }, select: { contactId: true, tagId: true }, orderBy: { createdAt: 'asc' } }),
    tx.contactCollaborator.findMany({ where: { contactId: { in: ids } }, select: { contactId: true, userId: true, role: true } }),
  ]);
  const tagRows = links.length ? await tx.tag.findMany({ where: { id: { in: [...new Set(links.map((l) => l.tagId))] } }, select: { id: true, name: true } }) : [];
  const tagName = new Map(tagRows.map((t) => [t.id, t.name]));
  const tags = new Map<string, string[]>();
  for (const l of links) (tags.get(l.contactId) ?? tags.set(l.contactId, []).get(l.contactId)!).push(tagName.get(l.tagId) ?? '');
  const collabs = new Map<string, { userId: string; role: string }[]>();
  for (const c of cc) (collabs.get(c.contactId) ?? collabs.set(c.contactId, []).get(c.contactId)!).push({ userId: c.userId, role: c.role });
  return { tags, collabs };
}

const lastWord = (name: string) => name.trim().split(/\s+/).at(-1) ?? name;

/** Ô "AI gợi ý" từ gợi ý bước tiếp theo (bộ luật — insights/next-action); chưa có → chờ. */
function aiCell(n: NextAction | undefined, locale: string, timeZone: string): ContactRowDto['ai'] {
  const m = serverMessages(locale).crm.ai;
  if (!n) return { kind: 'wait', label: m.wait, hint: '' };
  const fmt = createFmt({ locale, timeZone });
  const params = n.key === 'collect' ? { amount: fmt.money(String(n.params.amount)) } : n.params;
  return { kind: n.kind, label: n.kind === 'wait' ? m.wait : m.done, hint: interpolate(m.next[n.key], params) };
}

export function toRow(c: ContactRecord, rc: RowContext, extras: Awaited<ReturnType<typeof loadRowExtras>> & { next?: Map<string, NextAction> }): ContactRowDto {
  const fmt = createFmt({ locale: rc.locale, timeZone: rc.timeZone });
  const src = SOURCE_STYLE[c.source as ContactSource] ?? SOURCE_STYLE.manual;
  const collabs = extras.collabs.get(c.id) ?? [];
  const mine = collabs.find((x) => x.userId === rc.authz.userId)?.role as 'collaborator' | 'watcher' | undefined;
  const hue = hueOf(c.id);
  return {
    id: c.id,
    code: c.code,
    full_name: c.name,
    first_name: lastWord(c.name),
    title: c.title || '—',
    initials: initialsOf(c.name),
    avatar_hue: hue,
    reg_date: fmt.date(c.createdAt),
    reg_time: fmt.time(c.createdAt),
    type: c.kind,
    group: c.group ?? 'new',
    source: c.source,
    source_label: src.label,
    source_color: src.color,
    email: c.email ?? '',
    phone: c.phone ?? '',
    zalo: c.zalo ?? '',
    city: c.city ?? '',
    district: c.district ?? '',
    status: c.status,
    stage: c.stage,
    owner_user_id: c.ownerUserId ?? '',
    owner_name: c.ownerUserId ? (rc.names.get(c.ownerUserId) ?? '') : '',
    owner_hue: c.ownerUserId ? hueOf(c.ownerUserId) : 0,
    ai: aiCell(extras.next?.get(c.id), rc.locale, rc.timeZone),
    tags: extras.tags.get(c.id) ?? [],
    web_bg: hue % 6,
    my_access: c.ownerUserId === rc.authz.userId ? 'owner' : (mine ?? 'scope'),
    collaborator_count: collabs.length,
    custom: (c.custom ?? {}) as CustomValues,
    ...(c.version !== undefined ? { version: c.version } : {}),
  };
}
