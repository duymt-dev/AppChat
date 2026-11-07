// Preview hoạt động CRM (TIP-026b §2): cùng điều kiện như execute (khách cha ghi được, tiền cần quote.create) — không ghi DB. Tóm tắt là dữ
// liệu (mã / tên khách, tiêu đề), không thân ghi chú dài; tiền chỉ hiện khi người gọi được thấy (045b).
import { AppError, type AuthzContext } from '@appchat/shared';
import type { ActionPreview } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../kernel/actions/preview-kit';
import { canReadAmount, canWriteAmount, writableParent } from './authority';
import { UUID } from '../services/access';

const short = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}…` : s);

export async function notePreview(tx: TenantTx, a: AuthzContext, i: { contact_id: string; body: string }, kind: 'note' | 'comment'): Promise<ActionPreview> {
  const { contact: c } = await writableParent(tx, a, i.contact_id);
  return preview('write', line(c.code, c.name), { changes: [created(kind === 'note' ? 'contact_note' : 'contact_comment', { body: short(i.body.trim()) })] });
}

export async function taskCreatePreview(tx: TenantTx, a: AuthzContext, i: { contact_id: string; title: string; due_at?: string | null; assignee_user_id?: string | null }): Promise<ActionPreview> {
  const { contact: c } = await writableParent(tx, a, i.contact_id);
  return preview('write', line(c.code, c.name, i.title), { changes: [created('contact_task', { title: i.title, due_at: i.due_at ?? undefined, assignee_user_id: i.assignee_user_id ?? undefined })] });
}

async function task(tx: TenantTx, a: AuthzContext, id: string) {
  const t = UUID.test(id) ? await tx.contactTask.findUnique({ where: { id } }) : null;
  if (!t) throw new AppError('NOT_FOUND', 404, { task_id: 'not_found' });
  const { contact: c } = await writableParent(tx, a, t.contactId);
  return { t, c };
}

export async function taskUpdatePreview(tx: TenantTx, a: AuthzContext, i: { task_id: string; patch: Record<string, unknown> }): Promise<ActionPreview> {
  const { t, c } = await task(tx, a, i.task_id);
  const cur = { title: t.title, description: t.description, due_at: t.dueAt?.toISOString() ?? null, assignee_user_id: t.assigneeUserId };
  return preview('write', line(c.code, c.name, t.title), { changes: updated('contact_task', t.id, cur, i.patch) });
}

export async function taskStatePreview(tx: TenantTx, a: AuthzContext, i: { task_id: string; state: string }): Promise<ActionPreview> {
  const { t, c } = await task(tx, a, i.task_id);
  return preview('write', line(c.code, c.name, t.title), { changes: updated('contact_task', t.id, { state: t.state }, { state: i.state }) });
}

/** Ẩn tiền khỏi preview khi người gọi không được thấy; ghi tiền thiếu quyền → 403 như execute. */
function moneySafe(a: AuthzContext, f: Record<string, unknown>) {
  if (f.amount_vnd !== undefined && !canWriteAmount(a)) throw new AppError('FORBIDDEN', 403, { amount_vnd: 'forbidden' });
  if (canReadAmount(a)) return f;
  const { amount_vnd: _hidden, ...rest } = f;
  void _hidden;
  return rest;
}

export async function oppCreatePreview(tx: TenantTx, a: AuthzContext, i: { contact_id: string; title: string } & Record<string, unknown>): Promise<ActionPreview> {
  const { contact: c } = await writableParent(tx, a, i.contact_id);
  const fields = Object.fromEntries(Object.entries(i).filter(([k]) => !['contact_id', 'source_conversation_id', 'source_message_id'].includes(k)));
  return preview('write', line(c.code, c.name, i.title), { changes: [created('contact_opportunity', moneySafe(a, fields))] });
}

async function opp(tx: TenantTx, a: AuthzContext, id: string) {
  const o = UUID.test(id) ? await tx.contactOpportunity.findUnique({ where: { id } }) : null;
  if (!o) throw new AppError('NOT_FOUND', 404, { opportunity_id: 'not_found' });
  const { contact: c } = await writableParent(tx, a, o.contactId);
  return { o, c };
}

export async function oppUpdatePreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string; patch: Record<string, unknown> }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  const cur = moneySafe(a, {
    title: o.title,
    need: o.need,
    ...(canReadAmount(a) ? { amount_vnd: o.amountVnd === null ? null : String(o.amountVnd) } : {}),
    stage: o.stage,
    probability: o.probability === null ? null : Number(String(o.probability)),
    expected_close_date: o.expectedCloseDate?.toISOString().slice(0, 10) ?? null,
    quote_id: o.quoteId,
  });
  return preview('write', line(c.code, c.name, o.title), { changes: updated('contact_opportunity', o.id, cur, moneySafe(a, i.patch)) });
}

export async function oppArchivePreview(tx: TenantTx, a: AuthzContext, i: { opportunity_id: string }): Promise<ActionPreview> {
  const { o, c } = await opp(tx, a, i.opportunity_id);
  return preview('write', line(c.code, c.name, o.title), { changes: updated('contact_opportunity', o.id, { archived: false }, { archived: true }) });
}
