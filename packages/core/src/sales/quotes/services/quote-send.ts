// Gửi báo giá cho khách qua kênh hội thoại (COMMERCE §3 "PDF hoặc ảnh qua kênh hội thoại"): tìm hội thoại của khách trên đúng loại
// kênh (gần nhất, chưa lưu trữ, tài khoản còn gửi được). Zalo cá nhân không nhắn chủ động được (manifest proactive: disallowed) → khách
// chưa từng nhắn qua Zalo thì 409 `channel: no_conversation`. Email: chưa có hội thoại email mà khách có địa chỉ + workspace có tài
// khoản email → mở chuỗi thư mới (như contact.send_email — TIP-018). Tin = câu chào + link xem + tệp PDF đã đóng băng.
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { openEmailThread } from '../../../channels/public';
import type { CrmMembers } from '../../../crm/public';
import { scopeCols, senderOf, writeOutgoing, type Outgoing } from '../../../inbox/public';

/** Kênh gửi chứng từ (TIP-032b P2 thêm webchat — như Zalo: chỉ gửi vào hội thoại khách đã mở, cửa sổ 24 giờ theo manifest). */
export type QuoteChannel = 'zalo_personal' | 'email' | 'webchat';

/** `fileId`: tệp trong kho (chứng từ đóng băng) — `postToCustomer` gắn sha256 của tệp vào tin để worker kiểm đúng byte khi gửi (TIP-014b). */
export type Attachment = { url: string; mime: string; name?: string; fileId?: string };

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

async function sendable(tx: TenantTx, accountId: string) {
  const a = await tx.channelAccount.findUnique({ where: { id: accountId }, select: { status: true, pausedAt: true } });
  return !!a && a.status === 'connected' && !a.pausedAt;
}

type Reach = { conv: Conv; to?: undefined; account?: undefined } | { conv?: undefined; to: string; account: { id: string; externalId: string } };

/** Kênh nhận của khách (chỉ đọc): hội thoại gửi được, hoặc địa chỉ + tài khoản email để mở chuỗi mới. Không có → 409. */
export async function reachCustomer(tx: TenantTx, c: { id: string; email: string | null }, channel: QuoteChannel): Promise<Reach> {
  const convs = await tx.conversation.findMany({ where: { contactId: c.id, channelType: channel, archivedAt: null }, orderBy: { lastMessageAt: 'desc' }, take: 5 });
  for (const conv of convs) if (await sendable(tx, conv.channelAccountId)) return { conv };
  if (channel !== 'email') throw new AppError('INVALID_STATE', 409, { channel: 'no_conversation' });
  const to = c.email?.trim().toLowerCase();
  if (!to) throw new AppError('INVALID_STATE', 409, { channel: 'no_email' });
  const account = await tx.channelAccount.findFirst({ where: { type: 'email', status: 'connected', pausedAt: null }, orderBy: { createdAt: 'asc' } });
  if (!account?.externalId) throw new AppError('INVALID_STATE', 409, { connector: 'email' });
  return { to, account: { id: account.id, externalId: account.externalId } };
}

/** Hội thoại gửi được của khách trên loại kênh; email chưa có thì mở chuỗi mới. Không có → 409. */
export async function customerConversation(tx: TenantTx, c: { id: string; name: string; email: string | null; ownerUserId: string | null }, channel: QuoteChannel, subject: string, now: Date): Promise<{ conv: Conv; created: boolean }> {
  const r = await reachCustomer(tx, c, channel);
  if (r.conv) return { conv: r.conv, created: false };
  const { to, account } = r;
  const threadId = `<${uuidv7(now.getTime())}@${account.externalId.split('@')[1] ?? 'mail'}>`;
  const key = { channelAccountId_externalId: { channelAccountId: account.id, externalId: to } };
  if (!(await tx.contactIdentity.findUnique({ where: key, select: { id: true } })))
    await tx.contactIdentity.create({ data: { id: uuidv7(now.getTime()), contactId: c.id, channelType: 'email', channelAccountId: account.id, externalId: to, displayName: c.name, createdAt: now } });
  const conv = await tx.conversation.create({
    data: { id: uuidv7(now.getTime()), channelAccountId: account.id, channelType: 'email', contactId: c.id, kind: 'direct', externalThreadId: threadId, assigneeUserId: c.ownerUserId, lastMessageAt: now, createdAt: now },
  });
  await openEmailThread(tx, { channelAccountId: account.id, threadId, address: to, subject, now });
  return { conv, created: true };
}

/** Tệp có `fileId` → kèm sha256 đã lưu của tệp (ràng buộc bất biến); tệp không còn / chưa có hash → 409, không gửi link mồ côi. */
async function bindFiles(tx: TenantTx, atts: Attachment[]): Promise<(Attachment & { sha256?: string })[]> {
  const ids = atts.flatMap((a) => (a.fileId ? [a.fileId] : []));
  if (!ids.length) return atts;
  const rows = await tx.file.findMany({ where: { id: { in: ids } }, select: { id: true, sha256: true } });
  const sha = new Map(rows.map((r) => [r.id, r.sha256]));
  return atts.map((a) => {
    if (!a.fileId) return a;
    const h = sha.get(a.fileId);
    if (!h) throw new AppError('INVALID_STATE', 409, { file: 'missing' });
    return { ...a, sha256: h };
  });
}

/** Ghi tin ra (+ tệp) vào hội thoại → Outgoing để đẩy hàng đợi sau commit + event realtime. */
export async function postToCustomer(
  ctx: ActionContext,
  tx: TenantTx,
  members: CrmMembers,
  o: { conv: Conv; created: boolean; text: string; file?: { url: string; name: string; fileId?: string }; attachments?: Attachment[]; now: Date; sender?: { type: 'system'; id: null; name: string | null } },
): Promise<{ out: Outgoing; events: { topic: string; payload: Record<string, unknown> }[] }> {
  // `file` = một PDF (cách gọi cũ); `attachments` = PDF / ảnh trang / ảnh QR (TIP-032b P2). Chỉ ảnh → tin ảnh.
  const atts = await bindFiles(tx, o.attachments ?? (o.file ? [{ url: o.file.url, mime: 'application/pdf', name: o.file.name, ...(o.file.fileId ? { fileId: o.file.fileId } : {}) }] : []));
  const out = await writeOutgoing(tx, {
    conv: o.conv,
    kind: !atts.length ? 'text' : atts.every((a) => a.mime.startsWith('image/')) ? 'image' : 'file',
    body: o.text,
    ...(atts.length ? { attachments: atts } : {}),
    // Tin hệ thống (trang ký công khai — không có người gọi) truyền `sender` sẵn.
    sender: o.sender ?? (await senderOf(ctx, members, tx)),
    now: o.now,
  });
  if (o.created) out.job.proactive = true;
  const cols = await scopeCols(tx, o.conv);
  return {
    out,
    events: [
      ...(o.created ? [{ topic: 'conversation.updated', payload: { ...cols, change: 'created' } }] : []),
      { topic: 'message.updated', payload: { ...cols, message_id: out.messageId, change: 'status' } },
    ],
  };
}
