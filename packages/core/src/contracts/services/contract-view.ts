// Bản ghi hợp đồng → dòng API (`contractRowSchema` — packages/shared/src/api/contracts.ts). Tiền là string VND, ngày hiệu lực
// `YYYY-MM-DD`. Nhật ký (`events`) đọc từ `contract_signature_event`; link ký đang hiệu lực đọc lại từ bản ghi token (người nội bộ sao
// chép). Gợi ý cột AI là luật theo trạng thái / hạn (không gọi LLM — chữ theo locale người xem).
import { interpolate, serverMessages, type ContractRow } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { ContractRecord } from '../contract-access';
import type { ContractDeps } from './contract-deps';
import { signToken } from './sign-link';
import { suggestionsOf } from '../files/suggestions';

export interface ViewCtx {
  locale: string;
  timeZone: string;
  now: Date;
  names: Map<string, string>;
}

const DAY = 86_400_000;
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const daysTo = (d: Date | null, now: Date) => (d ? Math.ceil((d.getTime() - now.getTime()) / DAY) : 999);

function hintOf(c: ContractRecord, ctx: ViewCtx, hasLink: boolean): { hint: string; wait: boolean } {
  const h = serverMessages(ctx.locale).sales.contract.hint;
  switch (c.status) {
    case 'draft':
      return { hint: h.draft, wait: false };
    case 'pending_approval':
      return { hint: h.pending, wait: true };
    case 'pending_signature': {
      if (!hasLink) return { hint: h.notSent, wait: true };
      const n = daysTo(c.signLinkExpiresAt, ctx.now);
      return n <= 2 ? { hint: interpolate(h.linkSoon, { n: Math.max(0, n) }), wait: true } : { hint: h.waiting, wait: false };
    }
    case 'signed': {
      const n = daysTo(c.endDate, ctx.now);
      return n <= 30 ? { hint: interpolate(h.ending, { n: Math.max(0, n) }), wait: true } : { hint: h.signed, wait: false };
    }
    case 'declined':
      return { hint: h.declined, wait: true };
    case 'expired':
      return { hint: h.expired, wait: true };
    default:
      return { hint: h.terminated, wait: false };
  }
}

type Contact = { id: string; name: string; phone: string | null };

export async function contactsOf(tx: TenantTx, ids: string[]): Promise<Map<string, Contact>> {
  const rows = ids.length ? await tx.contact.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, phone: true } }) : [];
  return new Map(rows.map((r) => [r.id, r]));
}

/** Nhật ký ký + link đang hiệu lực + mã báo giá nguồn cho nhiều hợp đồng (một câu mỗi loại). */
export async function extrasOf(tx: TenantTx, rows: ContractRecord[], d: ContractDeps, now: Date) {
  const ids = rows.map((r) => r.id);
  const quoteIds = rows.map((r) => r.quoteId).filter((x): x is string => !!x);
  const [events, tokens, quotes] = await Promise.all([
    ids.length ? tx.contractSignatureEvent.findMany({ where: { contractId: { in: ids } }, orderBy: { createdAt: 'asc' } }) : [],
    ids.length ? tx.contractSignToken.findMany({ where: { contractId: { in: ids }, usedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } }) : [],
    quoteIds.length ? tx.quote.findMany({ where: { id: { in: quoteIds } }, select: { id: true, code: true, version: true } }) : [],
  ]);
  const ev = new Map<string, typeof events>();
  for (const e of events) ev.set(e.contractId, [...(ev.get(e.contractId) ?? []), e]);
  const tok = new Map<string, string>();
  for (const t of tokens) if (!tok.has(t.contractId) && d.env) tok.set(t.contractId, signToken(d.env.key, t.id));
  const qc = new Map(quotes.map((q) => [q.id, q.version > 1 ? `${q.code}-L${q.version}` : q.code]));
  return { ev, tok, qc };
}

export function toContractRow(c: ContractRecord, x: { contact?: Contact; events: { type: string; createdAt: Date; actorName: string; ip: string | null; docSha256: string | null }[]; token: string | null; quoteCode: string }, ctx: ViewCtx): ContractRow {
  return {
    id: c.id,
    code: c.code,
    number: c.number,
    kind: c.kind,
    contact_id: c.contactId,
    contact_name: x.contact?.name ?? '',
    phone: x.contact?.phone ?? '',
    quote_id: c.quoteId,
    quote_code: x.quoteCode,
    title: c.title,
    value: String(c.value),
    signed_date: iso(c.signedDate) ?? '',
    start_date: iso(c.startDate),
    end_date: iso(c.endDate),
    owner_user_id: c.ownerUserId ?? '',
    owner_name: (c.ownerUserId && ctx.names.get(c.ownerUserId)) || '',
    assigned_user_id: c.assignedUserId ?? '',
    assigned_name: (c.assignedUserId && ctx.names.get(c.assignedUserId)) || '',
    version: c.version,
    status: c.status,
    created_at: c.createdAt.toISOString(),
    sent_at: c.sentAt?.toISOString() ?? null,
    signed_by_customer_at: c.signedByCustomerAt?.toISOString() ?? null,
    sign_token: c.status === 'pending_signature' ? x.token : null,
    sign_link_expires_at: c.status === 'pending_signature' ? (c.signLinkExpiresAt?.toISOString() ?? null) : null,
    signed_sha256: c.signedSha256,
    renewal_of_id: c.renewalOfId,
    terminated_reason: c.terminatedReason,
    note: c.note,
    file_name: c.fileName,
    source: c.source,
    source_hash: c.sourceHash,
    source_version: c.sourceVersion,
    origin_message_id: c.originMessageId,
    draft_proposal_id: c.draftProposalId,
    ai_suggestions: suggestionsOf(c.aiSuggestions),
    events: x.events.map((e) => ({ type: e.type, at: e.createdAt.toISOString(), actor: e.actorName, ...(e.ip ? { ip: e.ip } : {}), ...(e.docSha256 ? { doc_sha256: e.docSha256 } : {}) })),
    ai: hintOf(c, ctx, !!x.token),
  };
}
