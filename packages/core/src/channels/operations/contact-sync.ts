// Đồng bộ danh bạ tài khoản kênh (TIP-014b D3) — lần chạy bền `channel_contact_sync` + ảnh chụp `channel_contact_snapshot`. Action ghi
// `queued` + outbox `channel.contacts_requested` cùng commit (202); lần mới thay lần còn `queued`. Worker giữ phiên lấy danh bạ theo trang có
// trần (trang ≤ 200, ≤ 25 trang = 5.000 người) và ghi ảnh chụp theo trang. Ảnh chụp RIÊNG tài khoản, hạn 24 giờ (đọc quá hạn → 404; lần
// đồng bộ mới của tài khoản xoá ảnh chụp đã hết hạn; ngắt tài khoản → xoá theo FK); không tạo khách, không gửi lời mời. Đọc: trạng thái khớp từng dòng — chỉ lộ khách mà người xem thấy được (scope crm), SĐT trùng khách người khác → `conflict`.
import { normalizePhone, type ChannelContactSyncDto } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';

export const CONTACT_SYNC_LIMITS = { pageSize: 200, maxPages: 25, ttlMs: 24 * 3_600_000, readPage: 100 } as const;

export const contactSyncStatusUrl = (accountId: string, syncId: string) => `/v1/settings/channels/${accountId}/contact-syncs/${syncId}`;

/** Trong transaction action: dọn ảnh chụp hết hạn của tài khoản, thay lần còn queued, ghi lần mới + event yêu cầu. */
export async function requestContactSync(tx: TenantTx, i: { accountId: string; actorId: string | null; now: Date }) {
  await tx.channelContactSync.deleteMany({ where: { channelAccountId: i.accountId, expiresAt: { lte: i.now } } });
  await tx.channelContactSync.updateMany({ where: { channelAccountId: i.accountId, status: 'queued' }, data: { status: 'superseded', finishedAt: i.now } });
  const id = uuidv7(i.now.getTime());
  await tx.channelContactSync.create({ data: { id, channelAccountId: i.accountId, actorId: i.actorId, expiresAt: new Date(i.now.getTime() + CONTACT_SYNC_LIMITS.ttlMs), createdAt: i.now } });
  return { id, event: { topic: 'channel.contacts_requested', payload: { sync_id: id, channel_account_id: i.accountId } } as OutboxEventInput };
}

/** Worker giành lần chạy (queued → running + thế hệ). Lần đang `running` từ chủ cũ → partial interrupted, không chạy chồng. */
export async function claimContactSync(db: TenantDb, syncId: string, accountId: string, generation: number | undefined, now: Date) {
  const run = await db.channelContactSync.findUnique({ where: { id: syncId } });
  if (!run || run.channelAccountId !== accountId) return null;
  if (run.status === 'running') {
    await db.channelContactSync.updateMany({ where: { id: run.id, status: 'running' }, data: { status: 'partial', error: 'interrupted', finishedAt: now } });
    return null;
  }
  const n = await db.channelContactSync.updateMany({ where: { id: run.id, status: 'queued' }, data: { status: 'running', generation: generation ?? null, startedAt: now } });
  return n.count ? run : null;
}

/** Ghi một trang ảnh chụp (một transaction): trùng id trong lần chạy → bỏ; tăng số trang / người. */
export async function storeContactPage(db: TenantDb, syncId: string, rows: { id: string; displayName: string; phone?: string }[], startSeq: number): Promise<number> {
  return db.$transaction(async (tx) => {
    const r = await tx.channelContactSnapshot.createMany({
      data: rows.map((f, i) => ({ syncId, externalId: f.id, displayName: f.displayName.slice(0, 200), phone: f.phone?.slice(0, 30) ?? null, seq: startSeq + i })),
      skipDuplicates: true,
    });
    await tx.channelContactSync.update({ where: { id: syncId }, data: { pages: { increment: 1 }, received: { increment: r.count } } });
    return r.count;
  });
}

export async function finishContactSync(db: TenantDb, syncId: string, r: { status: 'complete' | 'partial' } | { error: string }, now: Date): Promise<void> {
  const data = 'error' in r ? { status: 'failed', error: r.error.slice(0, 200) } : { status: r.status };
  await db.channelContactSync.updateMany({ where: { id: syncId, status: 'running' }, data: { ...data, finishedAt: now } });
}

type Viewer = { userId: string | null; visible: (ids: string[]) => Promise<Set<string>> };

/** Một trang ảnh chụp (keyset theo seq) + trạng thái khớp. Hết hạn / khác tài khoản → null (404). */
export async function readContactSync(tx: TenantTx, accountId: string, syncId: string, now: Date, cursor: number, v: Viewer): Promise<ChannelContactSyncDto | null> {
  const run = await tx.channelContactSync.findUnique({ where: { id: syncId } });
  if (!run || run.channelAccountId !== accountId || run.expiresAt <= now) return null;
  const page = await tx.channelContactSnapshot.findMany({ where: { syncId, seq: { gt: cursor } }, orderBy: { seq: 'asc' }, take: CONTACT_SYNC_LIMITS.readPage + 1 });
  const rows = page.slice(0, CONTACT_SYNC_LIMITS.readPage);
  const ids = rows.map((r) => r.externalId);
  const linked = ids.length ? await tx.contactIdentity.findMany({ where: { channelAccountId: accountId, externalId: { in: ids } }, select: { externalId: true, contactId: true } }) : [];
  const phones = [...new Set(rows.map((r) => normalizePhone(r.phone)).filter((p): p is string => !!p))];
  const byPhone = phones.length ? await tx.contact.findMany({ where: { phoneNorm: { in: phones }, deletedAt: null }, select: { id: true, phoneNorm: true, ownerUserId: true } }) : [];
  const seen = await v.visible([...linked.map((l) => l.contactId), ...byPhone.map((c) => c.id)]);
  const link = new Map(linked.filter((l) => seen.has(l.contactId)).map((l) => [l.externalId, l.contactId]));
  const out = rows.map((r) => {
    const phone = normalizePhone(r.phone) || null;
    const known = link.get(r.externalId);
    if (known) return { external_id: r.externalId, name: r.displayName, phone, state: 'known' as const, contact_id: known };
    if (!phone) return { external_id: r.externalId, name: r.displayName, phone: null, state: 'no_phone' as const, contact_id: null };
    const hit = byPhone.find((c) => c.phoneNorm === phone);
    if (!hit) return { external_id: r.externalId, name: r.displayName, phone, state: 'importable' as const, contact_id: null };
    // SĐT đã có khách: thấy được → known; khách người khác (ngoài scope) → conflict, không lộ id.
    return seen.has(hit.id) ? { external_id: r.externalId, name: r.displayName, phone, state: 'known' as const, contact_id: hit.id } : { external_id: r.externalId, name: r.displayName, phone, state: 'conflict' as const, contact_id: null };
  });
  const iso = (d: Date | null) => d?.toISOString() ?? null;
  return {
    id: run.id,
    channel_account_id: run.channelAccountId,
    state: run.status as ChannelContactSyncDto['state'],
    pages: run.pages,
    received: run.received,
    error: run.error,
    created_at: run.createdAt.toISOString(),
    finished_at: iso(run.finishedAt),
    expires_at: run.expiresAt.toISOString(),
    rows: out,
    next_cursor: page.length > CONTACT_SYNC_LIMITS.readPage ? String(rows.at(-1)!.seq) : null,
  };
}
