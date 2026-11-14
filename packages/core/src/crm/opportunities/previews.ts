// Preview cơ hội (TIP-026c §2, action-registry): cùng điều kiện như execute (khách cha ghi được, tiền cần quote.create, won cần chứng từ,
// Thua chặn khi còn chứng từ sống) — không ghi DB. Tóm tắt là dữ liệu (mã / tên khách, tên cơ hội); tiền chỉ hiện khi người gọi được thấy
// (045b). Preview `mark_lost` liệt kê báo giá đã gửi sẽ bị từ chối + cảnh báo hoàn tác không mở lại báo giá.
import { AppError, OPPORTUNITY_PROBABILITY, type AuthzContext } from '@appchat/shared';
import type { ActionPreview } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../kernel/actions/preview-kit';
import { canReadAmount, canWriteAmount, writableParent } from '../activities/authority';
import { UUID } from '../services/access';
import { liveDocuments } from './links';

const HIDDEN = ['amount_vnd'];

/** Ẩn tiền khỏi preview khi người gọi không được thấy; ghi tiền thiếu quyền → 403 như execute. */
function moneySafe(a: AuthzContext, f: Record<string, unknown>) {
  if (f.amount_vnd !== undefined && !canWriteAmount(a)) throw new AppError('FORBIDDEN', 403, { amount_vnd: 'forbidden' });
  return canReadAmount(a) ? f : Object.fromEntries(Object.entries(f).filter(([k]) => !HIDDEN.includes(k)));
}

async function opp(tx: TenantTx, a: AuthzContext, id: string) {
  const o = UUID.test(id) ? await tx.contactOpportunity.findUnique({ where: { id } }) : null;
  if (!o) throw new AppError('NOT_FOUND', 404, { opportunity_id: 'not_found' });
  const { contact: c } = await writableParent(tx, a, o.contactId);
  return { o, c };
}

export async function oppCreatePreview(tx: TenantTx, a: AuthzContext, i: { contact_id: string; title: string; stage?: string } & Record<string, unknown>): Promise<ActionPreview> {
  const { contact: c } = await writableParent(tx, a, i.contact_id);
  const stage = i.stage ?? 'lead';
  if (stage === 'won' || stage === 'lost') throw new AppError('VALIDATION_FAILED', 422, { stage: 'terminal_on_create' });
  const fields = Object.fromEntries(Object.entries(i).filter(([k]) => !['contact_id', 'source_conversation_id', 'source_message_id'].includes(k)));
  return preview('write', line(c.code, c.name, i.title), { changes: [created('contact_opportunity', moneySafe(a, { ...fields, stage, probability: OPPORTUNITY_PROBABILITY[stage as 'lead'] }))] });
}

export async function oppUpdatePreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string; patch: Record<string, unknown> }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  const cur = moneySafe(a, {
    title: o.title,
    need: o.need,
    ...(canReadAmount(a) ? { amount_vnd: o.amountVnd === null ? null : String(o.amountVnd) } : {}),
    expected_close_date: o.expectedCloseDate?.toISOString().slice(0, 10) ?? null,
    source_kind: o.sourceKind,
    campaign_id: o.campaignId,
  });
  return preview('write', line(c.code, c.name, o.title), { changes: updated('contact_opportunity', o.id, cur, moneySafe(a, i.patch)) });
}

export async function oppArchivePreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  const live = await liveDocuments(tx, o.id);
  if (live.order || live.signed) throw new AppError('CONFLICT', 409, { opportunity_id: 'has_live_document' });
  return preview('delete', line(c.code, c.name, o.title), { changes: updated('contact_opportunity', o.id, { archived: false }, { archived: true }) });
}

export async function stagePreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string; stage: string }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  if (o.stage === 'lost') throw new AppError('INVALID_TRANSITION', 409, { stage: 'reopen_first' });
  if (i.stage === 'won') {
    const live = await liveDocuments(tx, o.id);
    if (!live.order && !live.signed) throw new AppError('VALIDATION_FAILED', 422, { stage: 'won_needs_document' });
  }
  const p = (s: string) => OPPORTUNITY_PROBABILITY[s as 'lead'];
  return preview('write', line(c.code, c.name, o.title), { changes: updated('contact_opportunity', o.id, { stage: o.stage, probability: p(o.stage) }, { stage: i.stage, probability: p(i.stage) }) });
}

export async function lostPreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string; lost_reason: string }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  const live = await liveDocuments(tx, o.id);
  if (live.order || live.signed) throw new AppError('CONFLICT', 409, { opportunity_id: 'has_live_document' });
  const sent = await tx.quote.findMany({ where: { opportunityId: o.id, deletedAt: null, status: { in: ['sent', 'viewed'] } }, orderBy: { id: 'asc' }, select: { id: true, code: true, status: true } });
  return preview('write', line(c.code, c.name, o.title), {
    changes: [...updated('contact_opportunity', o.id, { stage: o.stage, lost_reason: null }, { stage: 'lost', lost_reason: i.lost_reason }), ...sent.flatMap((q) => updated('quote', q.id, { code: q.code, status: q.status }, { code: q.code, status: 'rejected' }))],
    // Mã cảnh báo (thẻ dịch): báo giá bị từ chối không mở lại khi hoàn tác.
    ...(sent.length ? { warnings: ['lost_rejects_quotes'] } : {}),
  });
}

export async function reopenPreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  if (o.stage !== 'lost') throw new AppError('INVALID_TRANSITION', 409, { stage: o.stage });
  return preview('write', line(c.code, c.name, o.title), { changes: updated('contact_opportunity', o.id, { stage: 'lost', lost_reason: o.lostReason }, { stage: 'qualified', lost_reason: null }) });
}

export async function ownerPreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string; owner_user_id: string }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  return preview('write', line(c.code, c.name, o.title), { changes: updated('contact_opportunity', o.id, { owner_user_id: o.ownerUserId }, { owner_user_id: i.owner_user_id }) });
}
