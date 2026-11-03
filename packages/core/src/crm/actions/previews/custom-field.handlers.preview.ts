// Preview trường tuỳ biến (TIP-023b R2.8): define → định nghĩa mới; update → trước / sau từng trường sửa (theo khoá) + thứ tự; delete → nhãn +
// số khách đang có giá trị (giá trị giữ nguyên, chỉ ẩn). Trường hệ thống bị khoá vẫn do execute chặn (422).
import type { ActionInput, ActionPreview, customFieldDefine, customFieldDelete, customFieldUpdate } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, defined, line, preview, removed, type Change } from '../../../kernel/actions/preview-kit';

export function definePreview(i: ActionInput<typeof customFieldDefine>): ActionPreview {
  return preview('config', line(i.entity, i.label), { changes: [created('custom_field', i as Record<string, unknown>)] });
}

export async function updatePreview(tx: TenantTx, i: ActionInput<typeof customFieldUpdate>): Promise<ActionPreview> {
  const defs = await tx.customFieldDef.findMany({ where: { entity: i.entity, deletedAt: null } });
  const by = new Map(defs.map((d) => [d.key, d]));
  const changes: Change[] = [];
  for (const f of i.fields ?? []) {
    const cur = by.get(f.key);
    if (!cur) throw new AppError('NOT_FOUND', 404, { key: f.key });
    const { key, ...patch } = f;
    const after = defined(patch);
    const before = Object.fromEntries(Object.keys(after).map((k) => [k, (cur as Record<string, unknown>)[k] ?? null]));
    changes.push({ entity: 'custom_field', id: key, before, after });
  }
  if (i.order?.length) changes.push({ entity: 'custom_field', after: { order: i.order } });
  return preview('config', line(i.entity, changes.length), { count: (i.fields ?? []).length, changes });
}

export async function deletePreview(tx: TenantTx, i: ActionInput<typeof customFieldDelete>): Promise<ActionPreview> {
  const cur = await tx.customFieldDef.findUnique({ where: { entity_key: { entity: i.entity, key: i.key } } });
  if (!cur || cur.deletedAt) throw new AppError('NOT_FOUND', 404, { key: i.key });
  const used = i.entity === 'contact' ? (await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM contact WHERE deleted_at IS NULL AND custom ? ${i.key}`)[0]?.n ?? 0n : 0n;
  return preview('delete', line(i.entity, cur.label), { count: Number(used), changes: [removed('custom_field', i.key, { label: cur.label, type: cur.type, records: Number(used) })] });
}
