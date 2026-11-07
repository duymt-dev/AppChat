// profile_layout.create · update · duplicate · delete · assign_role (settings.manage — Cài đặt › Hồ sơ 360°, REQ-F12 / M05).
// Luật: ≥ 1 tab bật (422 `tabs: at_least_one_tab`); mẫu hệ thống không xoá (422 `layout_id: system_template`); xoá mẫu đang gán
// → vai trò về `pl_default`. TIP-026b §4.5: CAS — khoá dòng FOR UPDATE, if_version lệch → 409 STALE_VERSION; version do trigger tăng khi đổi
// tên / tab (gán vai trò không đổi version nội dung); xoá khoá đúng mẫu nên không đua với gán vai trò (không mồ côi).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, DEFAULT_LAYOUT_ID, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, profileLayoutAssignRole, profileLayoutCreate, profileLayoutDelete, profileLayoutDuplicate, profileLayoutUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId } from '../services/access';
import { ensureLayouts } from '../services/layouts.service';
import * as pv from './previews/profile-layout.handlers.preview';

type Tabs = { enabled: boolean }[];
const assertTabs = (tabs: Tabs | undefined) => {
  if (tabs && !tabs.some((t) => t.enabled)) throw new AppError('VALIDATION_FAILED', 422, { tabs: 'at_least_one_tab' });
};

async function layout(tx: TenantTx, id: string) {
  await ensureLayouts(tx);
  const l = await tx.profileLayout.findUnique({ where: { id } });
  if (!l) throw new AppError('NOT_FOUND', 404, { layout_id: 'not_found' });
  return l;
}

/** Khoá mẫu (FOR UPDATE) rồi đối chiếu version người dùng đã thấy. */
async function lockLayout(tx: TenantTx, id: string, ifVersion?: number) {
  await ensureLayouts(tx);
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM profile_layout WHERE id = ${id} FOR UPDATE`;
  if (!rows.length) throw new AppError('NOT_FOUND', 404, { layout_id: 'not_found' });
  const l = await layout(tx, id);
  if (ifVersion !== undefined && ifVersion !== l.version) throw new AppError('STALE_VERSION', 409, { version: String(l.version) });
  return l;
}

@Injectable()
@ActionHandler('profile_layout.create')
export class ProfileLayoutCreateHandler implements Handler<ActionInput<typeof profileLayoutCreate>, { layout_id: string; version?: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof profileLayoutCreate>) {
    return pv.createPreview(input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof profileLayoutCreate>, tx: TenantTx): Promise<HandlerOutcome<{ layout_id: string; version?: number }>> {
    assertTabs(input.tabs);
    await ensureLayouts(tx);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.profileLayout.create({ data: { id, name: input.name.trim(), tabs: input.tabs, createdByUserId: actorUserId(ctx), createdAt: now } });
    return { result: { layout_id: id, version: 1 }, after: { id } };
  }
}

@Injectable()
@ActionHandler('profile_layout.update')
export class ProfileLayoutUpdateHandler implements Handler<ActionInput<typeof profileLayoutUpdate>, { layout_id: string; version: number }> {
  async preview(ctx: ActionContext, input: ActionInput<typeof profileLayoutUpdate>, tx: TenantTx) {
    return pv.updatePreview(tx, input);
  }

  async execute(_ctx: ActionContext, input: ActionInput<typeof profileLayoutUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ layout_id: string; version: number }>> {
    const l = await lockLayout(tx, input.layout_id, input.if_version);
    assertTabs(input.patch.tabs);
    const after = await tx.profileLayout.update({ where: { id: l.id }, data: { ...(input.patch.name ? { name: input.patch.name.trim() } : {}), ...(input.patch.tabs ? { tabs: input.patch.tabs } : {}) }, select: { version: true } });
    return { result: { layout_id: l.id, version: after.version }, before: { id: l.id, name: l.name, tabs: l.tabs, version: l.version }, after: { id: l.id, version: after.version } };
  }
}

@Injectable()
@ActionHandler('profile_layout.duplicate')
export class ProfileLayoutDuplicateHandler implements Handler<ActionInput<typeof profileLayoutDuplicate>, { layout_id: string; version?: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof profileLayoutDuplicate>, tx: TenantTx) {
    return pv.duplicatePreview(tx, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof profileLayoutDuplicate>, tx: TenantTx): Promise<HandlerOutcome<{ layout_id: string; version?: number }>> {
    const src = await layout(tx, input.layout_id);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    // Tên bản sao theo ngôn ngữ nguồn (vi) — người dùng đổi tên ngay trong hộp sửa.
    const name = interpolate(serverMessages('vi').crm.copy, { name: src.name }).slice(0, 60);
    await tx.profileLayout.create({ data: { id, name, tabs: src.tabs as object, createdByUserId: actorUserId(ctx), createdAt: now } });
    return { result: { layout_id: id, version: 1 }, after: { id } };
  }
}

@Injectable()
@ActionHandler('profile_layout.delete')
export class ProfileLayoutDeleteHandler implements Handler<ActionInput<typeof profileLayoutDelete>, { ok: boolean }> {
  async preview(ctx: ActionContext, input: ActionInput<typeof profileLayoutDelete>, tx: TenantTx) {
    return pv.deletePreview(tx, input);
  }

  async execute(_ctx: ActionContext, input: ActionInput<typeof profileLayoutDelete>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const l = await lockLayout(tx, input.layout_id, input.if_version);
    if (l.isSystem) throw new AppError('VALIDATION_FAILED', 422, { layout_id: 'system_template' });
    const roles = await tx.profileLayoutRole.findMany({ where: { layoutId: l.id }, select: { roleKey: true } });
    await tx.profileLayoutRole.updateMany({ where: { layoutId: l.id }, data: { layoutId: DEFAULT_LAYOUT_ID } });
    await tx.profileLayout.delete({ where: { id: l.id } });
    return { result: { ok: true }, before: { id: l.id, name: l.name, tabs: l.tabs, roles: roles.map((r) => r.roleKey) } };
  }
}

@Injectable()
@ActionHandler('profile_layout.assign_role')
export class ProfileLayoutAssignRoleHandler implements Handler<ActionInput<typeof profileLayoutAssignRole>, { role: string; layout_id: string }> {
  async preview(ctx: ActionContext, input: ActionInput<typeof profileLayoutAssignRole>, tx: TenantTx) {
    return pv.assignRolePreview(tx, input);
  }

  async execute(_ctx: ActionContext, input: ActionInput<typeof profileLayoutAssignRole>, tx: TenantTx): Promise<HandlerOutcome<{ role: string; layout_id: string }>> {
    // Khoá mẫu đích: xoá đồng thời phải chờ → không gán vào mẫu vừa xoá (không link mồ côi).
    const l = await lockLayout(tx, input.layout_id);
    const prev = await tx.profileLayoutRole.findUnique({ where: { roleKey: input.role } });
    await tx.profileLayoutRole.upsert({ where: { roleKey: input.role }, create: { roleKey: input.role, layoutId: l.id }, update: { layoutId: l.id } });
    return { result: { role: input.role, layout_id: l.id }, before: { role: input.role, layout_id: prev?.layoutId ?? null } };
  }
}
