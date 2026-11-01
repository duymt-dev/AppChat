// Bố cục Hồ sơ 360° (REQ-F12, M05): 3 mẫu hệ thống seed theo id cố định + gán 5 vai trò mặc định (profile_layout_role).
// Đọc tự bù seed (workspace tạo trước TIP-015). Mẫu hệ thống không xoá; vai trò không gán → `pl_default`.
import { DEFAULT_LAYOUT_ID, DEFAULT_LAYOUT_ROLES, SYSTEM_LAYOUTS, SYSTEM_ROLES, serverMessages, type LayoutTabDto, type SystemRole } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

type Db = Pick<TenantTx, 'profileLayout' | 'profileLayoutRole'>;

export async function seedLayouts(db: Db): Promise<void> {
  for (const l of SYSTEM_LAYOUTS) {
    await db.profileLayout.upsert({ where: { id: l.id }, create: { id: l.id, name: l.name, isSystem: true, tabs: l.tabs() as object[] }, update: {} });
  }
  for (const role of SYSTEM_ROLES) {
    await db.profileLayoutRole.upsert({ where: { roleKey: role }, create: { roleKey: role, layoutId: DEFAULT_LAYOUT_ROLES[role] }, update: {} });
  }
}

async function ensure(db: Db) {
  if (!(await db.profileLayout.findUnique({ where: { id: DEFAULT_LAYOUT_ID }, select: { id: true } }))) await seedLayouts(db);
}

const tabsOf = (v: unknown) => (Array.isArray(v) ? (v as LayoutTabDto[]) : []).slice().sort((a, b) => a.sort - b.sort);

/** `GET /v1/settings/profile-layouts` — `{ layouts[{ …, roles }], role_assignments }`; `created_by` = tên người tạo / "Hệ thống". */
export async function layoutsData(db: Db, names: (ids: string[]) => Promise<Map<string, string>>, locale: string) {
  await ensure(db);
  const [rows, roles] = await Promise.all([db.profileLayout.findMany({ orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }] }), db.profileLayoutRole.findMany()]);
  const assign = Object.fromEntries(SYSTEM_ROLES.map((r) => [r, roles.find((x) => x.roleKey === r)?.layoutId ?? DEFAULT_LAYOUT_ID])) as Record<SystemRole, string>;
  const who = await names(rows.map((r) => r.createdByUserId).filter((x): x is string => !!x));
  const sys = serverMessages(locale).crm.system;
  return {
    layouts: rows.map((l) => ({
      id: l.id,
      name: l.name,
      is_system: l.isSystem,
      tabs: tabsOf(l.tabs),
      roles: SYSTEM_ROLES.filter((r) => assign[r] === l.id),
      created_by: l.isSystem ? sys : (l.createdByUserId ? (who.get(l.createdByUserId) ?? '') : ''),
    })),
    role_assignments: assign,
  };
}

/** Bố cục của vai trò người xem (Hồ sơ 360° — `layout`). Vai trò tuỳ biến → mặc định. */
export async function layoutForRole(db: Db, role: string) {
  await ensure(db);
  const a = await db.profileLayoutRole.findUnique({ where: { roleKey: role } });
  const l = (a && (await db.profileLayout.findUnique({ where: { id: a.layoutId } }))) || (await db.profileLayout.findUnique({ where: { id: DEFAULT_LAYOUT_ID } }));
  return l ? { id: l.id, name: l.name, tabs: tabsOf(l.tabs) } : undefined;
}

export { ensure as ensureLayouts };
