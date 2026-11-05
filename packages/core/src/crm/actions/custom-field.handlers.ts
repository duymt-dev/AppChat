// custom_field.define · update · delete (crm.fields_manage, D56). Trường hệ thống: không đổi nhãn / kiểu, không xoá (422).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CUSTOM_FIELD_PLACES, type CustomFieldPlace } from '@appchat/shared';
import type { ActionInput, customFieldDefine, customFieldDelete, customFieldUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { defineField, seedSystemFields } from '../services/fields.service';
import * as pv from './previews/custom-field.handlers.preview';

const systemLocked = () => new AppError('VALIDATION_FAILED', 422, { key: 'system' });
const SEP = /\s*\/\s*/;
/** Định nghĩa đổi → realtime `fields.changed` (FE làm mới; không có giá trị trường). */
const changed = (entity: string, key?: string) => ({ topic: 'custom_field.changed', payload: { entity, ...(key ? { key } : {}) } });

@Injectable()
@ActionHandler('custom_field.define')
export class CustomFieldDefineHandler implements Handler<ActionInput<typeof customFieldDefine>, { key: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof customFieldDefine>) {
    return pv.definePreview(input);
  }

  async execute(_ctx: ActionContext, input: ActionInput<typeof customFieldDefine>, tx: TenantTx): Promise<HandlerOutcome<{ key: string }>> {
    const now = this.clock.now();
    if (!(await tx.customFieldDef.count({ where: { sys: true } }))) await seedSystemFields(tx, now);
    const key = await defineField(tx, input, now);
    return { result: { key }, after: { entity: input.entity, key }, events: [changed(input.entity, key)] };
  }
}

@Injectable()
@ActionHandler('custom_field.update')
export class CustomFieldUpdateHandler implements Handler<ActionInput<typeof customFieldUpdate>, { updated: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof customFieldUpdate>, tx: TenantTx) {
    return pv.updatePreview(tx, input);
  }

  async execute(_ctx: ActionContext, input: ActionInput<typeof customFieldUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ updated: number }>> {
    if (!(await tx.customFieldDef.count({ where: { sys: true } }))) await seedSystemFields(tx, this.clock.now());
    const defs = await tx.customFieldDef.findMany({ where: { entity: input.entity, deletedAt: null } });
    const by = new Map(defs.map((d) => [d.key, d]));
    let updated = 0;
    for (const { key, visible, label, type, options, visible_in, ...f } of input.fields ?? []) {
      const cur = by.get(key);
      if (!cur) throw new AppError('NOT_FOUND', 404, { key });
      if (cur.sys && ((label !== undefined && label !== cur.label) || (type !== undefined && type !== cur.type))) throw systemLocked();
      const vis = { ...(cur.visibleIn as Record<CustomFieldPlace, boolean>), ...(visible_in ?? {}), ...(visible === undefined ? {} : { list: visible }) };
      await tx.customFieldDef.update({
        where: { id: cur.id },
        data: {
          ...(label !== undefined ? { label } : {}),
          ...(type !== undefined ? { type } : {}),
          ...(options !== undefined ? { options: options.split(SEP).map((x) => x.trim()).filter(Boolean) } : {}),
          ...(f.required !== undefined ? { required: f.required } : {}),
          ...(f.ai !== undefined ? { ai: f.ai } : {}),
          ...(f.roles !== undefined ? { roles: f.roles } : {}),
          ...(f.condition !== undefined ? { condition: f.condition } : {}),
          visibleIn: Object.fromEntries(CUSTOM_FIELD_PLACES.map((p) => [p, !!vis[p]])),
        },
      });
      updated++;
    }
    if (input.order?.length) {
      const order = input.order.filter((k) => by.has(k));
      const rest = defs.filter((d) => !order.includes(d.key)).sort((a, b) => a.sort - b.sort).map((d) => d.key);
      for (const [i, key] of [...order, ...rest].entries()) await tx.customFieldDef.update({ where: { id: by.get(key)!.id }, data: { sort: i } });
      updated ||= 1;
    }
    return { result: { updated }, events: updated ? [changed(input.entity)] : [] };
  }
}

@Injectable()
@ActionHandler('custom_field.delete')
export class CustomFieldDeleteHandler implements Handler<ActionInput<typeof customFieldDelete>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  /** Xoá mềm — giá trị trong `custom` giữ nguyên (khôi phục được), không còn hiện / kiểm. */
  async preview(ctx: ActionContext, input: ActionInput<typeof customFieldDelete>, tx: TenantTx) {
    return pv.deletePreview(tx, input);
  }

  async execute(_ctx: ActionContext, input: ActionInput<typeof customFieldDelete>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const cur = await tx.customFieldDef.findUnique({ where: { entity_key: { entity: input.entity, key: input.key } } });
    if (!cur || cur.deletedAt) throw new AppError('NOT_FOUND', 404, { key: input.key });
    if (cur.sys) throw systemLocked();
    await tx.customFieldDef.update({ where: { id: cur.id }, data: { deletedAt: this.clock.now() } });
    return { result: { ok: true }, before: { id: cur.id }, events: [changed(input.entity, input.key)] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await tx.customFieldDef.update({ where: { id: (log.before as { id: string }).id }, data: { deletedAt: null } });
  }
}
