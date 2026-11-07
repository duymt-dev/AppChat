// Liên kết khách theo kênh (REQ-C06): inbound pipeline (TIP-016) gọi trong transaction của mình. Thứ tự khớp:
// 1) identity (channel_account_id, external_id) đã có → khách đó; 2) SĐT chuẩn hoá (chắc chắn) → gắn identity vào khách có sẵn;
// 3) không khớp → khách nháp (lead, nguồn = kênh, chưa người phụ trách — tự gán ở inbox theo người nhận hội thoại).
// Khớp không chắc chắn (email / tên) không tự gộp — GET /v1/contacts/duplicates đề xuất.
import { normalizePhone, sourceOfChannel } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { writeTimeline } from './timeline.service';
import { liveContact, matchIdentity } from './identity-match';

export interface InboundIdentity {
  channelType: string;
  channelAccountId: string;
  externalId: string;
  displayName?: string | null;
  phone?: string | null;
  /** Email khách tự khai (pre-chat widget — TIP-017) — chỉ ghi vào khách nháp mới, không dùng để khớp (không chắc chắn). */
  email?: string | null;
}

export interface ResolvedContact {
  contactId: string;
  created: boolean;
  /** Sự kiện cần ghi outbox (pipeline ghi cùng transaction). */
  events: { topic: string; payload: Record<string, unknown> }[];
}

export class ContactIdentityService {
  /** `forward` (lịch sử — TIP-014b C): `last_interaction_at` chỉ tiến, không lùi về mốc tin cũ. */
  async resolve(tx: TenantTx, i: InboundIdentity, now: Date, o: { forward?: boolean } = {}): Promise<ResolvedContact> {
    const key = { channelAccountId_externalId: { channelAccountId: i.channelAccountId, externalId: i.externalId } };
    // Khớp chắc chắn dùng chung với chế độ chỉ-khớp (identity-match.ts). SĐT trùng nhiều khách → không tự chọn → khách nháp mới (gộp tay).
    const m = await matchIdentity(tx, i);
    if (m.kind === 'known') return { contactId: m.contactId, created: false, events: [] };
    const phone = normalizePhone(i.phone);
    const byPhone = m.kind === 'phone' ? { id: m.contactId } : null;
    let contactId = byPhone?.id;
    const events: ResolvedContact['events'] = [];
    if (!contactId) {
      contactId = uuidv7(now.getTime());
      const source = sourceOfChannel(i.channelType);
      await tx.contact.create({
        data: { id: contactId, code: await nextCode(tx, 'contact'), name: i.displayName?.trim() || i.externalId, phone: i.phone ?? null, phoneNorm: phone, email: i.email ?? null, source, lastInteractionAt: now, createdAt: now },
      });
      await writeTimeline(tx, { contactId, type: 'stage', key: 'created', params: { source }, actor: { type: 'system', id: null }, at: now });
      events.push({ topic: 'contact.created', payload: { contact_id: contactId, owner_user_id: null, source } });
    }
    await tx.contactIdentity.upsert({
      where: key,
      create: { id: uuidv7(now.getTime()), contactId, channelType: i.channelType, channelAccountId: i.channelAccountId, externalId: i.externalId, displayName: i.displayName ?? null, createdAt: now },
      update: { contactId, displayName: i.displayName ?? undefined },
    });
    if (o.forward) await tx.$executeRaw`UPDATE contact SET last_interaction_at = ${now} WHERE id = ${contactId}::uuid AND (last_interaction_at IS NULL OR last_interaction_at < ${now})`;
    else await tx.contact.update({ where: { id: contactId }, data: { lastInteractionAt: now } });
    return { contactId, created: !byPhone, events };
  }

  /** Chế độ chỉ-khớp (TIP-014b D — tài khoản tắt tự tạo khách): không tạo khách / identity. */
  match(tx: TenantTx, i: InboundIdentity) {
    return matchIdentity(tx, i);
  }

  /** Khách còn hiệu lực — bản đã gộp đi theo `merged_into_id`. */
  live(tx: TenantTx, id: string): Promise<string | null> {
    return liveContact(tx, id);
  }
}
