// Điều phối nguồn cho kỹ năng tiện ích (TIP-019c §2.1–2.2, §5): đúng MỘT nguồn — chữ người gọi (đánh dấu caller_supplied, không xác minh,
// không tự tra CRM từ mã trong chữ), tin chọn của hội thoại, hoặc khách. score_lead: khách + (tuỳ chọn) tin của hội thoại thuộc HỌ khách
// đó (gốc + nguồn đã gộp). Quyền đọc domain gốc kiểm ở đây, trước model: thiếu inbox.view / crm.view → 403 dù có assistant.use. Tổng
// nguồn ≤ 16 000 ký tự / 64 KiB UTF-8, vượt → 422 trước model (không cắt lặng). Chunk id do server cấp; binding dùng để kiểm lại sau.
import { createHash } from 'node:crypto';
import { AppError, UTILITY_LIMITS, type AuthzContext, type PermissionKey, type UtilitySource } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { inSameFamily } from '../../crm/public';
import { conversationSource } from './sources/conversation';
import { contactSource } from './sources/contact';
import type { SourceChunk } from './sources/types';

export type { SourceChunk };
export interface ResolvedSources {
  origin: 'caller_supplied' | 'server';
  chunks: SourceChunk[];
  /** Băm nội dung + binding — đổi nguồn trong lúc model chạy thì kết quả không còn hợp lệ (409 source_changed ở pha công bố). */
  digest: string;
  refs: { conversation_id?: string; contact_id?: string; message_ids?: string[] };
}

const need = (authz: AuthzContext, p: PermissionKey) => {
  if (!authz.isOwner && !authz.permissions.has(p)) throw new AppError('FORBIDDEN', 403, { source: 'forbidden' });
};

export function sizeCheck(chunks: SourceChunk[]): void {
  const chars = chunks.reduce((n, c) => n + Array.from(c.text).length, 0);
  const bytes = chunks.reduce((n, c) => n + Buffer.byteLength(c.text, 'utf8'), 0);
  if (chars > UTILITY_LIMITS.sourceChars || bytes > UTILITY_LIMITS.sourceBytes) throw new AppError('VALIDATION_FAILED', 422, { source: 'too_large' });
}

export function digestOf(chunks: SourceChunk[]): string {
  const h = createHash('sha256');
  for (const c of chunks) h.update(`${c.id}\u0000${c.text}\u0000${JSON.stringify(c.binding)}\u0001`);
  return h.digest('hex');
}

const done = (origin: ResolvedSources['origin'], chunks: SourceChunk[], refs: ResolvedSources['refs']): ResolvedSources => {
  sizeCheck(chunks);
  return { origin, chunks, digest: digestOf(chunks), refs };
};

/** Nguồn chung của summarize / detect_intent / extract_info. */
export async function resolveSource(tx: TenantTx, authz: AuthzContext, src: UtilitySource, served?: string): Promise<ResolvedSources> {
  switch (src.kind) {
    case 'text':
      // Nhãn rõ chữ người gọi: kể cả khi chữ nhắc tới mã khách / đơn, server không tra và không coi là dữ kiện đã xác minh.
      return done('caller_supplied', [{ id: 't:0', text: src.text, label: 'caller-supplied text (unverified)', binding: {} }], {});
    case 'conversation': {
      need(authz, 'inbox.view');
      const s = await conversationSource(tx, authz, src, served);
      return done('server', s.chunks, { conversation_id: s.conversationId, message_ids: src.message_ids });
    }
    case 'contact': {
      need(authz, 'crm.view');
      if (served) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
      const s = await contactSource(tx, authz, src.contact_id);
      return done('server', s.chunks, { contact_id: s.contactId });
    }
  }
}

/** Nguồn của score_lead: dữ kiện khách + tin chọn (nếu có) của hội thoại thuộc họ khách — không có chữ tự do. */
export async function resolveLeadSource(
  tx: TenantTx,
  authz: AuthzContext,
  input: { contact_id: string; conversation_id?: string; message_ids?: string[] },
  served?: string,
): Promise<ResolvedSources> {
  need(authz, 'crm.view');
  const k = await contactSource(tx, authz, input.contact_id);
  const chunks = [...k.chunks];
  if (input.conversation_id && input.message_ids?.length) {
    need(authz, 'inbox.view');
    const s = await conversationSource(tx, authz, { conversation_id: input.conversation_id, message_ids: input.message_ids }, served);
    if (!s.contactId || !(await inSameFamily(tx, s.contactId, k.contactId))) throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_found' });
    chunks.push(...s.chunks);
  } else if (served) throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_found' });
  return done('server', chunks, { contact_id: k.contactId, ...(input.conversation_id ? { conversation_id: input.conversation_id, message_ids: input.message_ids } : {}) });
}
