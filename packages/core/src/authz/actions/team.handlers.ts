// team.create / team.update / team.set_members (TIP-042) — members.manage, nhóm phẳng (không cây phòng ban), CAS `version`, tăng
// `authz_revision` cùng commit (phạm vi `team` của người bị tác động đổi ngay ở lần đọc quyền kế tiếp). Thành viên = membership active của
// workspace (DB nền tảng); trưởng nhóm phải thuộc nhóm (gỡ trưởng nhóm khỏi nhóm phải đổi / bỏ trưởng nhóm trước). Không có team.delete.
// Event `member.role_changed` cho đúng người bị tác động (cũ ∪ mới) — làm mới quyền / socket, không phát cả workspace.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, teamCreate, teamSetMembers, teamUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview, updated } from '../../kernel/actions/preview-kit';
import { needPlatform } from '../../kernel/tenant/platform-read';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { bumpTenantAuthzRevision } from '../services/authz-revision';
import { assertActiveMembers, assertLead, assertTeamNameFree, lockTeam, memberIdsOf, replaceMembers, teamSnap, type TeamSnap } from '../services/team-members';

type Out = { team_id: string; version: number };
const refresh = (users: readonly string[]) => users.slice(0, 500).map((user_id) => ({ topic: 'member.role_changed', payload: { user_id } }));

@Injectable()
@ActionHandler('team.create')
export class TeamCreateHandler implements Handler<ActionInput<typeof teamCreate>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  private async check(ctx: ActionContext, i: ActionInput<typeof teamCreate>, tx: TenantTx) {
    const name = i.name.trim();
    await assertTeamNameFree(tx, name);
    const users = await assertActiveMembers(needPlatform(this.platform, 'team.create'), ctx.workspaceId, i.user_ids ?? []);
    assertLead(i.lead_user_id, users);
    return { name, users };
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof teamCreate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { name, users } = await this.check(ctx, i, tx);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.team.create({ data: { id, name, leadUserId: i.lead_user_id ?? null, version: 1, createdAt: now } });
    if (users.length) await tx.teamMember.createMany({ data: users.map((userId) => ({ teamId: id, userId, createdAt: now })) });
    await bumpTenantAuthzRevision(tx, now);
    return { result: { team_id: id, version: 1 }, after: { id, name, lead_user_id: i.lead_user_id ?? null, user_ids: users }, events: refresh(users) };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof teamCreate>, tx: TenantTx): Promise<ActionPreview> {
    const { name, users } = await this.check(ctx, i, tx);
    return preview('config', name, { changes: [created('team', { name, lead_user_id: i.lead_user_id, user_ids: users })], count: users.length });
  }
}

@Injectable()
@ActionHandler('team.update')
export class TeamUpdateHandler implements Handler<ActionInput<typeof teamUpdate>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  private async check(i: ActionInput<typeof teamUpdate>, tx: TenantTx) {
    const t = await lockTeam(tx, i.team_id, i.if_version);
    const users = await memberIdsOf(tx, t.id);
    const name = i.name?.trim();
    if (name !== undefined) await assertTeamNameFree(tx, name, t.id);
    if (i.lead_user_id !== undefined) assertLead(i.lead_user_id, users);
    return { t, users, patch: { ...(name !== undefined ? { name } : {}), ...(i.lead_user_id !== undefined ? { lead_user_id: i.lead_user_id } : {}) } };
  }

  async execute(_ctx: ActionContext, i: ActionInput<typeof teamUpdate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { t, users, patch } = await this.check(i, tx);
    const now = this.clock.now();
    const row = await tx.team.update({
      where: { id: t.id },
      data: { ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.lead_user_id !== undefined ? { leadUserId: patch.lead_user_id } : {}), version: { increment: 1 } },
    });
    await bumpTenantAuthzRevision(tx, now);
    return { result: { team_id: t.id, version: row.version }, before: teamSnap(t, users), after: teamSnap(row, users) };
  }

  /** Hoàn tác = tên / trưởng nhóm trước, chỉ khi không ai sửa tiếp; trưởng nhóm cũ phải còn trong nhóm. */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as TeamSnap;
    const a = log.after as TeamSnap;
    const t = await lockTeam(tx, b.id, a.version);
    await assertTeamNameFree(tx, b.name, t.id);
    assertLead(b.lead_user_id, await memberIdsOf(tx, t.id));
    await tx.team.update({ where: { id: t.id }, data: { name: b.name, leadUserId: b.lead_user_id, version: { increment: 1 } } });
    await bumpTenantAuthzRevision(tx, this.clock.now());
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof teamUpdate>, tx: TenantTx): Promise<ActionPreview> {
    const { t, patch } = await this.check(i, tx);
    return preview('config', t.name, { changes: updated('team', t.id, { name: t.name, lead_user_id: t.leadUserId }, patch) });
  }
}

@Injectable()
@ActionHandler('team.set_members')
export class TeamSetMembersHandler implements Handler<ActionInput<typeof teamSetMembers>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  private async check(ctx: ActionContext, i: ActionInput<typeof teamSetMembers>, tx: TenantTx) {
    const t = await lockTeam(tx, i.team_id, i.if_version);
    const next = await assertActiveMembers(needPlatform(this.platform, 'team.set_members'), ctx.workspaceId, i.user_ids);
    if (t.leadUserId && !next.includes(t.leadUserId)) throw new AppError('VALIDATION_FAILED', 422, { lead_user_id: 'lead_removed' });
    return { t, cur: await memberIdsOf(tx, t.id), next };
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof teamSetMembers>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { t, cur, next } = await this.check(ctx, i, tx);
    const now = this.clock.now();
    const touched = await replaceMembers(tx, t.id, next, now);
    const row = await tx.team.update({ where: { id: t.id }, data: { version: { increment: 1 } } });
    await bumpTenantAuthzRevision(tx, now);
    return { result: { team_id: t.id, version: row.version }, before: teamSnap(t, cur), after: teamSnap(row, next), events: refresh(touched) };
  }

  /** Hoàn tác = tập cũ, chỉ khi không ai sửa tiếp (CAS) và người trong tập cũ còn active (kiểm lại hiện tại — người đã rời không quay lại). */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as TeamSnap;
    const a = log.after as TeamSnap;
    const t = await lockTeam(tx, b.id, a.version);
    const prev = await assertActiveMembers(needPlatform(this.platform, 'team.set_members'), ctx.workspaceId, b.user_ids);
    assertLead(t.leadUserId, prev);
    await replaceMembers(tx, t.id, prev, this.clock.now());
    await tx.team.update({ where: { id: t.id }, data: { version: { increment: 1 } } });
    await bumpTenantAuthzRevision(tx, this.clock.now());
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof teamSetMembers>, tx: TenantTx): Promise<ActionPreview> {
    const { t, cur, next } = await this.check(ctx, i, tx);
    const added = next.filter((u) => !cur.includes(u));
    const removedIds = cur.filter((u) => !next.includes(u));
    return preview('config', t.name, {
      changes: updated('team', t.id, { user_ids: [...cur].sort() }, { user_ids: [...next].sort() }),
      count: added.length + removedIds.length,
    });
  }
}

export const TEAM_HANDLERS = [TeamCreateHandler, TeamUpdateHandler, TeamSetMembersHandler];
