// workspace.update (db platform, settings.manage) — Cài đặt › Tổng quan (thông tin chung) + Ngôn ngữ (locale, múi giờ, định dạng ngày).
// `name` → tên workspace + tên pháp lý; `tax_code` / `address` → business_profile (chưa khai báo → 409); `locale` / `timezone` → cột
// workspace; còn lại → `workspace.settings.general` (DC-048).
import { Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, workspaceUpdate } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { generalOf, lockSettings } from '../settings/workspace-settings';

type Input = ActionInput<typeof workspaceUpdate>;
const GENERAL = ['website', 'support_phone', 'admin_email', 'date_format'] as const;

@Injectable()
@ActionHandler('workspace.update')
export class WorkspaceUpdateHandler implements Handler<Input, { workspace_id: string }> {
  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ workspace_id: string }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'workspace.update cần PlatformTx');
    const ws = ctx.workspaceId;
    const settings = await lockSettings(ptx, ws);
    const before = await ptx.workspace.findUniqueOrThrow({ where: { id: ws }, select: { name: true, locale: true, timezone: true } });
    const profile = await ptx.businessProfile.findUnique({ where: { workspaceId: ws }, select: { legalName: true, taxCode: true, address: true } });

    const bp = { ...(input.name !== undefined ? { legalName: input.name } : {}), ...(input.tax_code !== undefined ? { taxCode: input.tax_code || null } : {}), ...(input.address !== undefined ? { address: input.address } : {}) };
    if (!profile && (input.tax_code !== undefined || input.address !== undefined)) throw new AppError('CONFLICT', 409, { business_profile: 'not_declared' });
    if (profile && Object.keys(bp).length) await ptx.businessProfile.update({ where: { workspaceId: ws }, data: bp });

    const general = { ...generalOf(settings) };
    for (const k of GENERAL) if (input[k] !== undefined) (general as Record<string, string>)[k] = input[k]!;
    await ptx.workspace.update({
      where: { id: ws },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        settings: { ...settings, general } as object,
      },
    });
    return {
      result: { workspace_id: ws },
      before: { ...before, profile, general: generalOf(settings) },
      after: { name: input.name ?? before.name, locale: input.locale ?? before.locale, timezone: input.timezone ?? before.timezone, general },
    };
  }
}
