// Quyền duyệt theo domain (TIP-015d §1.3): ngoài `approvals.decide` + permission duyệt của action gốc, domain đăng ký hook cho action
// cần quyền trên BẢN GHI (chuyển phụ trách: người duyệt phải còn scope ghi khách + crm.reassign). Hook trung lập — AI không import CRM:
//   visible(authz)   vị từ SQL trên alias `ar` (approval_request) — dòng không thấy được thì vắng khỏi list / count / Hộp thư, đọc trực tiếp 404.
//                    Áp TRƯỚC ORDER BY / LIMIT; input cũ hỏng phải trả FALSE (đóng khi lỗi).
//   decidable(authz) vị từ SQL: được quyết (duyệt / sửa & duyệt) — tính `can_decide`, kiểm lại lúc quyết.
//   checkInput       kiểm input SỬA trước khi lưu (đổi khách / người nhận → người duyệt phải có quyền trên bản mới).
import { TenantSql as Prisma } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export interface ApprovalDomainHook {
  /** Domain sở hữu (vd. `crm`) — cùng domain đăng ký lại (nhiều app Nest trong một tiến trình) thì thay; domain khác giành → lỗi boot. */
  owner: string;
  visible(authz: AuthzContext): Prisma.Sql;
  decidable(authz: AuthzContext): Prisma.Sql;
  checkInput(tx: TenantTx, who: { workspaceId: string; authz: AuthzContext }, input: Record<string, unknown>): Promise<void>;
}

const HOOKS = new Map<string, ApprovalDomainHook>();

export function registerApprovalDomain(actionId: string, hook: ApprovalDomainHook): void {
  const cur = HOOKS.get(actionId);
  if (cur && cur.owner !== hook.owner) throw new Error(`ApprovalDomainHook '${actionId}' đã đăng ký bởi ${cur.owner}`);
  HOOKS.set(actionId, hook);
}

export const approvalDomainOf = (actionId: string) => HOOKS.get(actionId);

/** Vị từ thấy được cho mọi action: action không có hook giữ luật cũ (TRUE); có hook → đúng hook của action đó. */
export function visibleApprovalSql(authz: AuthzContext): Prisma.Sql {
  if (!HOOKS.size) return Prisma.sql`TRUE`;
  const ids = [...HOOKS.keys()];
  const each = [...HOOKS.entries()].map(([id, h]) => Prisma.sql`(ar.action_id = ${id} AND ${h.visible(authz)})`);
  return Prisma.sql`(ar.action_id <> ALL(${ids}::text[]) OR ${Prisma.join(each, ' OR ')})`;
}

/** Id quyết được theo domain trong một tập dòng (action không có hook → luôn có trong tập). */
export async function decidableIds(tx: Pick<TenantTx, '$queryRaw'>, authz: AuthzContext, rows: { id: string; actionId: string }[]): Promise<Set<string>> {
  const out = new Set(rows.filter((r) => !HOOKS.has(r.actionId)).map((r) => r.id));
  const hooked = rows.filter((r) => HOOKS.has(r.actionId));
  if (!hooked.length) return out;
  const each = [...HOOKS.entries()].map(([id, h]) => Prisma.sql`(ar.action_id = ${id} AND ${h.decidable(authz)})`);
  const ok = await tx.$queryRaw<{ id: string }[]>`SELECT ar.id FROM approval_request ar WHERE ar.id = ANY(${hooked.map((r) => r.id)}::uuid[]) AND (${Prisma.join(each, ' OR ')})`;
  for (const r of ok) out.add(r.id);
  return out;
}

/** Một dòng: thấy được + quyết được theo domain (dùng ở handler quyết định + chạy sau duyệt). */
export async function approvalAccess(tx: Pick<TenantTx, '$queryRaw'>, authz: AuthzContext, id: string, actionId: string): Promise<{ visible: boolean; decidable: boolean }> {
  const h = HOOKS.get(actionId);
  if (!h) return { visible: true, decidable: true };
  const r = await tx.$queryRaw<{ v: boolean; d: boolean }[]>`
    SELECT ${h.visible(authz)} AS v, ${h.decidable(authz)} AS d FROM approval_request ar WHERE ar.id = ${id}::uuid`;
  return { visible: !!r[0]?.v, decidable: !!r[0]?.v && !!r[0]?.d };
}

/** Chỉ test. */
export const unregisterApprovalDomain = (actionId: string) => HOOKS.delete(actionId);
