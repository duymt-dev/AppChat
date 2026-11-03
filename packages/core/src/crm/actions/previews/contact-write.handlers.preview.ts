// Preview hồ sơ khách (TIP-023b R2.8): create → dữ liệu mới (không lộ ghi chú dài); update → trước / sau chỉ trường đổi (trường tuỳ biến theo
// khoá); set_stage → giai đoạn trước / sau; tag → danh sách thẻ trước / sau (thẻ chưa có → cảnh báo tạo mới); delete → mã + tên. Khách ngoài
// scope → 404 / 403 như execute (editableContact). Trùng SĐT / email vẫn do execute chặn.
import type { ActionInput, ActionPreview, contactCreate, contactDelete, contactSetStage, contactTag, contactUpdate } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { editableContact } from '../../services/access';
import { columnsOf } from '../../services/contacts.service';

/** Cột DB → tên trường input (khớp form khách). */
const FIELD: Record<string, string> = { name: 'full_name', kind: 'type', phoneNorm: '' };
const asInput = (cols: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(cols)
      .filter(([k]) => FIELD[k] !== '')
      .map(([k, v]) => [FIELD[k] ?? k, v instanceof Date ? v.toISOString().slice(0, 10) : v]),
  );

export function createPreview(i: ActionInput<typeof contactCreate>): ActionPreview {
  const { note, custom, ...rest } = i;
  return preview('write', line(i.full_name, i.phone || i.email), { changes: [created('contact', { ...rest, ...(custom ? { custom } : {}), ...(note?.trim() ? { note: note.trim() } : {}) })] });
}

export async function updatePreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof contactUpdate>): Promise<ActionPreview> {
  const { contact: c } = await editableContact(tx, a, i.contact_id);
  const { custom, ...all } = i.patch;
  const rest = Object.fromEntries(Object.entries(all).filter(([k]) => k !== 'owner_user_id' && k !== 'note')) as typeof all;
  const next = asInput(columnsOf(rest));
  const cur = asInput(Object.fromEntries(Object.keys(columnsOf(rest)).map((k) => [k, (c as Record<string, unknown>)[k] ?? null])));
  const curCustom = (c.custom ?? {}) as Record<string, unknown>;
  const changes = updated('contact', c.id, { ...cur, ...(custom ? { custom: Object.fromEntries(Object.keys(custom).map((k) => [k, curCustom[k] ?? null])) } : {}) }, { ...next, ...(custom ? { custom } : {}) });
  return preview('write', line(c.code, c.name), { changes });
}

export async function setStagePreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof contactSetStage>): Promise<ActionPreview> {
  const { contact: c } = await editableContact(tx, a, i.contact_id);
  return preview('write', line(c.code, c.name), { changes: updated('contact', c.id, { stage: c.stage }, { stage: i.stage }) });
}

export async function tagPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof contactTag>): Promise<ActionPreview> {
  const { contact: c } = await editableContact(tx, a, i.contact_id);
  const links = await tx.contactTag.findMany({ where: { contactId: c.id }, orderBy: { createdAt: 'asc' }, select: { tagId: true } });
  const tags = await tx.tag.findMany({ where: { id: { in: links.map((l) => l.tagId) } }, select: { id: true, name: true } });
  const cur = links.map((l) => tags.find((t) => t.id === l.tagId)?.name ?? '').filter(Boolean);
  const hit = (await tx.$queryRaw<{ name: string }[]>`SELECT name FROM tag WHERE lower(name) = lower(${i.tag.trim()}) LIMIT 1`)[0];
  const name = hit?.name ?? i.tag.trim();
  const next = i.op === 'add' ? (cur.includes(name) ? cur : [...cur, name]) : cur.filter((t) => t !== name);
  return preview('write', line(c.code, c.name, name), {
    changes: updated('contact', c.id, { tags: cur }, { tags: next }),
    ...(!hit && i.op === 'add' ? { warnings: [`new_tag:${name}`] } : {}),
  });
}

export async function deletePreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof contactDelete>): Promise<ActionPreview> {
  const { contact: c } = await editableContact(tx, a, i.contact_id);
  return preview('delete', line(c.code, c.name), { changes: [removed('contact', c.id, { code: c.code, name: c.name, phone: c.phone })] });
}
