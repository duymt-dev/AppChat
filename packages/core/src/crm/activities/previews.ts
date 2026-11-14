// Preview hoạt động CRM (TIP-026b §2): cùng điều kiện như execute (khách cha ghi được) — không ghi DB. Tóm tắt là dữ liệu (mã / tên khách,
// tiêu đề), không thân ghi chú dài. Preview cơ hội ở crm/opportunities/previews.ts (TIP-026c).
import { AppError, type AuthzContext } from '@appchat/shared';
import type { ActionPreview } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../kernel/actions/preview-kit';
import { writableParent } from './authority';
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
