// role.create / role.update / role.delete (TIP-042, DC-298) — roles.manage (riêng Chủ sở hữu), transaction tenant, CAS `version`, tăng
// `authz_revision` cùng commit (resolver thấy quyền mới ở lần đọc kế tiếp). Vai trò hệ thống bất biến (422). Xoá = xoá mềm khi không còn
// thành viên active / lời mời còn hạn tham chiếu (409 kèm số đếm — không tự đổi người dùng sang vai trò khác). Hai DB không atomic: thành
// viên / lời mời ở DB nền tảng đếm trước, gán / nhận lời mời đua sau đó vẫn fail closed vì resolver không cấp quyền cho tombstone.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, roleCreate, roleDelete, roleUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview, removed, updated } from '../../kernel/actions/preview-kit';
import { needPlatform } from '../../kernel/tenant/platform-read';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { bumpTenantAuthzRevision } from '../services/authz-revision';
import { assertRoleDraft, assertRoleNameFree, cloneSource, lockCustomRole, newCustomKey, roleSnap } from '../services/role-lifecycle';
import { parseScope } from '../services/authz-resolver';

type Snap = ReturnType<typeof roleSnap>;
/** Người đang mang vai trò → `member.role_changed` từng người (làm mới quyền + socket của ĐÚNG người bị tác động, không phát cả workspace).
 * Rào bảo mật là `authz_revision` cùng commit; event chỉ tăng tốc làm mới UI. */
async function holders(p: PlatformDb | undefined, ws: string, key: string) {
  if (!p) return [];
  const rows = await p.membership.findMany({ where: { workspaceId: ws, roleKey: key, status: 'active' }, select: { userId: true }, take: 500 });
  return rows.map((r) => ({ topic: 'member.role_changed', payload: { user_id: r.userId, role_key: key } }));
}

/** Thành viên active + lời mời còn hạn đang dùng vai trò (DB nền tảng). */
async function usage(p: Pick<PlatformDb, 'membership' | 'invite'>, ws: string, key: string, now: Date) {
  const [members, invites] = await Promise.all([
    p.membership.count({ where: { workspaceId: ws, roleKey: key, status: 'active' } }),
    p.invite.count({ where: { workspaceId: ws, roleKey: key, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } } }),
  ]);
  return { members, invites };
}

async function draftOf(tx: TenantTx, i: ActionInput<typeof roleCreate>) {
  if (i.clone_from_key) {
    if (i.permissions || i.data_scope) throw new AppError('VALIDATION_FAILED', 422, { clone_from_key: 'exclusive' });
    const src = await cloneSource(tx, i.clone_from_key);
    return { ...assertRoleDraft(src.permissions, src.scope), dropped: src.dropped };
  }
  if (!i.permissions || !i.data_scope) throw new AppError('VALIDATION_FAILED', 422, { permissions: 'required', data_scope: 'required' });
  return { ...assertRoleDraft(i.permissions, i.data_scope), dropped: [] as string[] };
}

@Injectable()
@ActionHandler('role.create')
export class RoleCreateHandler implements Handler<ActionInput<typeof roleCreate>, { key: string; version: number; dropped?: string[] }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  async execute(_ctx: ActionContext, i: ActionInput<typeof roleCreate>, tx: TenantTx): Promise<HandlerOutcome<{ key: string; version: number; dropped?: string[] }>> {
    const name = i.name.trim();
    await assertRoleNameFree(tx, name);
    const d = await draftOf(tx, i);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    const key = newCustomKey(id);
    await tx.role.create({ data: { id, key, name, isSystem: false, permissions: d.permissions, dataScope: d.scope, version: 1, createdAt: now, updatedAt: now } });
    await bumpTenantAuthzRevision(tx, now);
    return {
      result: { key, version: 1, ...(d.dropped.length ? { dropped: d.dropped } : {}) },
      after: { key, name, permissions: d.permissions, data_scope: d.scope, version: 1 },
    };
  }

  /** Hoàn tác tạo = xoá mềm, chỉ khi chưa ai dùng (thành viên / lời mời) và chưa bị sửa sau đó. */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const a = log.after as Snap;
    const r = await lockCustomRole(tx, a.key, a.version);
    const u = await usage(needPlatform(this.platform, 'role.create'), ctx.workspaceId, r.key, this.clock.now());
    if (u.members || u.invites) throw new AppError('HAS_DEPENDENCIES', 409, { members: String(u.members), invites: String(u.invites) });
    await tx.role.update({ where: { key: r.key }, data: { deletedAt: this.clock.now(), version: { increment: 1 } } });
    await bumpTenantAuthzRevision(tx, this.clock.now());
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof roleCreate>, tx: TenantTx): Promise<ActionPreview> {
    const name = i.name.trim();
    await assertRoleNameFree(tx, name);
    const d = await draftOf(tx, i);
    return preview('config', name, {
      changes: [created('role', { name, permissions: d.permissions, data_scope: d.scope, ...(i.clone_from_key ? { clone_from_key: i.clone_from_key } : {}) })],
      ...(d.dropped.length ? { warnings: [`owner_only_dropped:${d.dropped.join(',')}`] } : {}),
    });
  }
}

@Injectable()
@ActionHandler('role.update')
export class RoleUpdateHandler implements Handler<ActionInput<typeof roleUpdate>, { key: string; version: number }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  private async patch(tx: TenantTx, cur: { key: string; permissions: string[]; dataScope: unknown }, i: ActionInput<typeof roleUpdate>) {
    const name = i.name?.trim();
    if (name !== undefined) await assertRoleNameFree(tx, name, cur.key);
    const d = i.permissions !== undefined || i.data_scope !== undefined ? assertRoleDraft(i.permissions ?? cur.permissions, i.data_scope ?? parseScope(cur.dataScope)) : null;
    return {
      ...(name !== undefined ? { name } : {}),
      ...(i.permissions !== undefined && d ? { permissions: d.permissions } : {}),
      ...(i.data_scope !== undefined && d ? { data_scope: d.scope } : {}),
    };
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof roleUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ key: string; version: number }>> {
    const r = await lockCustomRole(tx, i.role_key, i.if_version);
    const p = await this.patch(tx, r, i);
    const now = this.clock.now();
    const row = await tx.role.update({
      where: { key: r.key },
      data: { ...(p.name !== undefined ? { name: p.name } : {}), ...(p.permissions ? { permissions: p.permissions } : {}), ...(p.data_scope ? { dataScope: p.data_scope } : {}), version: { increment: 1 }, updatedAt: now },
    });
    await bumpTenantAuthzRevision(tx, now);
    return { result: { key: r.key, version: row.version }, before: roleSnap(r), after: { ...roleSnap(row) }, events: await holders(this.platform, ctx.workspaceId, r.key) };
  }

  /** Hoàn tác = trả định nghĩa trước, chỉ khi không ai sửa tiếp (CAS version sau) và vai trò còn sống; version tăng tiếp. */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Snap;
    const a = log.after as Snap;
    const r = await lockCustomRole(tx, b.key, a.version);
    await assertRoleNameFree(tx, b.name, r.key);
    const now = this.clock.now();
    await tx.role.update({ where: { key: r.key }, data: { name: b.name, permissions: b.permissions, dataScope: b.data_scope, version: { increment: 1 }, updatedAt: now } });
    await bumpTenantAuthzRevision(tx, now);
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof roleUpdate>, tx: TenantTx): Promise<ActionPreview> {
    const r = await lockCustomRole(tx, i.role_key, i.if_version);
    const p = await this.patch(tx, r, i);
    const cur = roleSnap(r);
    const added = p.permissions?.filter((x) => !cur.permissions.includes(x)) ?? [];
    const dropped = p.permissions ? cur.permissions.filter((x) => !(p.permissions as string[]).includes(x)) : [];
    return preview('config', r.name, {
      changes: updated('role', r.key, { name: cur.name, permissions: cur.permissions, data_scope: cur.data_scope }, p),
      ...(added.length || dropped.length ? { warnings: [...(added.length ? [`grant:${added.join(',')}`] : []), ...(dropped.length ? [`revoke:${dropped.join(',')}`] : [])] } : {}),
    });
  }
}

@Injectable()
@ActionHandler('role.delete')
export class RoleDeleteHandler implements Handler<ActionInput<typeof roleDelete>, { ok: boolean }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  private async blockIfUsed(ws: string, key: string) {
    const u = await usage(needPlatform(this.platform, 'role.delete'), ws, key, this.clock.now());
    if (u.members || u.invites) throw new AppError('HAS_DEPENDENCIES', 409, { members: String(u.members), invites: String(u.invites) });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof roleDelete>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const r = await lockCustomRole(tx, i.role_key, i.if_version);
    await this.blockIfUsed(ctx.workspaceId, r.key);
    const now = this.clock.now();
    await tx.role.update({ where: { key: r.key }, data: { deletedAt: now, version: { increment: 1 }, updatedAt: now } });
    await bumpTenantAuthzRevision(tx, now);
    return { result: { ok: true }, before: roleSnap(r) };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof roleDelete>, tx: TenantTx): Promise<ActionPreview> {
    const r = await lockCustomRole(tx, i.role_key, i.if_version);
    await this.blockIfUsed(ctx.workspaceId, r.key);
    const s = roleSnap(r);
    return preview('delete', r.name, { changes: [removed('role', r.key, { name: s.name, permissions: s.permissions, data_scope: s.data_scope })], warnings: ['not_undoable'] });
  }
}

export const ROLE_HANDLERS = [RoleCreateHandler, RoleUpdateHandler, RoleDeleteHandler];
