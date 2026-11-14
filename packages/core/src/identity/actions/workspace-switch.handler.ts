// workspace.switch (db platform, permission self) — đổi workspace đang dùng; đích phải là membership active (REQ-A04).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, workspaceSwitch } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { needPlatform } from './previews/platform-read';
import { switchPreview } from './previews/workspace-switch.handler.preview';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { WorkspacesService } from '../services/workspaces.service';

type Input = ActionInput<typeof workspaceSwitch>;

@Injectable()
@ActionHandler('workspace.switch')
export class WorkspaceSwitchHandler implements Handler<Input, { workspace_id: string }> {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(WorkspacesService) private readonly workspaces: WorkspacesService,
  ) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ workspace_id: string }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'workspace.switch cần PlatformTx');
    await this.workspaces.switchTo(ctx.onBehalfOfUserId ?? ctx.actor.id, input.workspace_id, ptx);
    return { result: { workspace_id: input.workspace_id }, after: { workspace_id: input.workspace_id } };
  }

  async preview(ctx: ActionContext, input: Input) {
    return switchPreview(needPlatform(this.platform, 'workspace.switch'), ctx.onBehalfOfUserId ?? ctx.actor.id, ctx.workspaceId, input);
  }
}
