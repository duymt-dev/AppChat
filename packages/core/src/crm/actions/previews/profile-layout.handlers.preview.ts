// Preview mẫu Hồ sơ 360° (TIP-023b R2.8): create / duplicate → tên + số tab bật; update → tên / tab bật trước / sau; delete → tên + vai trò
// đang dùng (về mẫu mặc định); assign_role → mẫu trước / sau của vai trò. Đọc không seed: mẫu hệ thống chưa bù seed lấy từ hằng số.
import type { ActionInput, ActionPreview, profileLayoutAssignRole, profileLayoutCreate, profileLayoutDelete, profileLayoutDuplicate, profileLayoutUpdate } from '@appchat/actions';
import { AppError, DEFAULT_LAYOUT_ID, DEFAULT_LAYOUT_ROLES, SYSTEM_LAYOUTS, interpolate, serverMessages, type SystemRole } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';

type Tab = { label: string; enabled: boolean };
const enabled = (tabs: unknown) => (Array.isArray(tabs) ? (tabs as Tab[]).filter((t) => t.enabled).map((t) => t.label) : []);

async function layout(tx: TenantTx, id: string) {
  const row = await tx.profileLayout.findUnique({ where: { id } });
  if (row) return row;
  const sys = SYSTEM_LAYOUTS.find((l) => l.id === id);
  if (!sys) throw new AppError('NOT_FOUND', 404, { layout_id: 'not_found' });
  return { id: sys.id, name: sys.name, isSystem: true, tabs: sys.tabs() as unknown };
}

export function createPreview(i: ActionInput<typeof profileLayoutCreate>): ActionPreview {
  return preview('config', i.name, { changes: [created('profile_layout', { name: i.name, tabs: enabled(i.tabs) })] });
}

export async function updatePreview(tx: TenantTx, i: ActionInput<typeof profileLayoutUpdate>): Promise<ActionPreview> {
  const l = await layout(tx, i.layout_id);
  const patch = { name: i.patch.name, tabs: i.patch.tabs ? enabled(i.patch.tabs) : undefined };
  return preview('config', l.name, { changes: updated('profile_layout', l.id, { name: l.name, tabs: enabled(l.tabs) }, patch) });
}

export async function duplicatePreview(tx: TenantTx, i: ActionInput<typeof profileLayoutDuplicate>): Promise<ActionPreview> {
  const l = await layout(tx, i.layout_id);
  const name = interpolate(serverMessages('vi').crm.copy, { name: l.name }).slice(0, 60);
  return preview('config', line(l.name, name), { changes: [created('profile_layout', { name, tabs: enabled(l.tabs) })] });
}

export async function deletePreview(tx: TenantTx, i: ActionInput<typeof profileLayoutDelete>): Promise<ActionPreview> {
  const l = await layout(tx, i.layout_id);
  const roles = (await tx.profileLayoutRole.findMany({ where: { layoutId: l.id }, select: { roleKey: true } })).map((r) => r.roleKey);
  return preview('delete', l.name, { count: roles.length, changes: [removed('profile_layout', l.id, { name: l.name, roles })], ...(l.isSystem ? { warnings: ['system_template'] } : {}) });
}

export async function assignRolePreview(tx: TenantTx, i: ActionInput<typeof profileLayoutAssignRole>): Promise<ActionPreview> {
  const l = await layout(tx, i.layout_id);
  const prevId = (await tx.profileLayoutRole.findUnique({ where: { roleKey: i.role } }))?.layoutId ?? DEFAULT_LAYOUT_ROLES[i.role as SystemRole] ?? DEFAULT_LAYOUT_ID;
  const prev = prevId === l.id ? l : await layout(tx, prevId).catch(() => null);
  return preview('config', line(i.role, l.name), { changes: updated('profile_layout_role', i.role, { layout: prev?.name ?? null }, { layout: l.name }) });
}
