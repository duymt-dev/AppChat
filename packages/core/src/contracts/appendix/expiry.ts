// Link ký phụ lục quá hạn (TIP-030b F3 spec 13): `pending_signature` + hạn link đã qua + không còn token sống → `declined` (như hợp đồng
// cha — chạy trong `contracts.sweep`). Đổi có điều kiện (status + version) — gia hạn / ký cùng lúc thắng thì bỏ qua.
import type { TenantDb } from '@appchat/db';
import { APPENDIX_FLOW, nextState, serverMessages } from '@appchat/shared';
import { logAppendixEvent } from './events';

const BATCH = 200;

export async function expireAppendixLinks(db: TenantDb, now: Date, locale: string): Promise<number> {
  const due = await db.contractAppendix.findMany({ where: { status: 'pending_signature', signLinkExpiresAt: { lt: now } }, select: { id: true }, take: BATCH });
  let n = 0;
  for (const { id } of due) {
    const done = await db.$transaction(async (tx) => {
      const a = await tx.contractAppendix.findUnique({ where: { id } });
      if (!a || !a.signLinkExpiresAt || a.signLinkExpiresAt >= now) return false;
      if (await tx.appendixSignToken.findFirst({ where: { appendixId: id, usedAt: null, expiresAt: { gte: now } }, select: { id: true } })) return false;
      const to = nextState(APPENDIX_FLOW, a.status, 'appendix.link_expire');
      if (!to) return false;
      const r = await tx.contractAppendix.updateMany({ where: { id, status: a.status, version: a.version }, data: { status: to, declinedReason: serverMessages(locale).sales.contract.linkExpired, decidedAt: now, updatedAt: now } });
      if (!r.count) return false;
      await logAppendixEvent(tx, { appendixId: id, version: a.version, type: 'declined', actorName: 'system', meta: { reason: 'link_expired' }, at: now });
      return true;
    });
    if (done) n++;
  }
  return n;
}
