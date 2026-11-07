// Cổng ghi thống nhất (Blueprint §4.3): POST /v1/actions/:id · GET /v1/actions · POST /v1/action-logs/:id/undo.
// GenUI (TIP-023c hợp đồng 4): header `x-genui-intent` = handle server ký cho node action của cây Trợ lý → nguồn assistant, actor
// assistant(người dùng), run của cây — xem trước / xác nhận như call_action; không tin `x-action-source` / body khi có intent.
// Form có ô bí mật: lần đầu gửi bí mật thẳng (không qua model) → preview; bí mật cất vault ngắn hạn (mã hoá), lần xác nhận gửi
// `secret_vault` thay giá trị — confirm_token / log / idempotency không chứa bí mật thô.
// Action quản trị (`platform_admin` — TIP-040, DC-368): nhánh chọn theo REGISTRY (không theo header client) → chỉ xác thực JWT, không
// X-Workspace-Id / membership; ngữ cảnh nền tảng dựng phía server, quyền admin kiểm sống trong executor. Không qua GenUI / Trợ lý.
// Action vòng đời (`workspace.open` — TIP-041): workspace có thể ĐÃ LƯU TRỮ (không DB tenant) → không AuthzResolver; JWT + X-Workspace-Id,
// membership kiểm trong transaction nền tảng của handler. Chỉ nguồn ui, không GenUI.
import { Body, Controller, Get, HttpCode, Inject, Optional, Param, Post, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { registry } from '@appchat/actions';
import { ActionExecutor, AUTHORIZER, GenUiIntents, LIFECYCLE_ACTIONS, lifecycleContext, RequestContext, platformContext, runGenUiAction, SecretVault, UndoService, type ActionContext, type ActionSource, type Authorizer } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from './request-actor';

const SOURCES: ActionSource[] = ['ui', 'assistant', 'api'];
const body = z.object({ input: z.unknown().optional(), confirm_token: z.string().optional(), secret_vault: z.string().max(80).optional() });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const header = (req: IncomingMessage, k: string) => {
  const v = req.headers[k];
  return Array.isArray(v) ? v[0] : v;
};

@Controller()
export class ActionsController {
  constructor(
    @Inject(ActionExecutor) private readonly executor: ActionExecutor,
    @Inject(UndoService) private readonly undoService: UndoService,
    @Inject(AUTHORIZER) private readonly authorizer: Authorizer,
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Optional() @Inject(GenUiIntents) private readonly intents: GenUiIntents | null = null,
    @Optional() @Inject(SecretVault) private readonly vault: SecretVault | null = null,
  ) {}

  private async context(req: IncomingMessage): Promise<ActionContext> {
    const a = await this.actors.resolve(req);
    // Header nguồn chỉ nhận ui / assistant / api — agent / task / system chỉ đến từ worker, không qua HTTP.
    const src = (header(req, 'x-action-source') ?? 'ui') as ActionSource;
    if (!SOURCES.includes(src)) throw new AppError('VALIDATION_FAILED', 422, { 'x-action-source': 'invalid' });
    RequestContext.patch({ ws: a.workspaceId, userId: a.userId });
    return {
      workspaceId: a.workspaceId,
      source: src,
      actor: { type: 'user', id: a.userId },
      authz: a.authz,
      idempotencyKey: header(req, 'idempotency-key'),
    };
  }

  @Get('actions')
  async list(@Req() req: IncomingMessage) {
    const ctx = await this.context(req);
    const out = [];
    for (const a of registry) {
      // Action quản trị không thuộc danh mục của workspace (trang /admin đọc riêng — TIP-040).
      if (a.permission === 'platform_admin' || !(await this.authorizer.can(ctx, a.permission))) continue;
      out.push({
        id: a.id,
        module: a.module,
        title: a.title,
        risk: a.risk,
        permission: a.permission,
        agentGrantable: a.agentGrantable,
        input_schema: z.toJSONSchema(a.input, { unrepresentable: 'any' }),
      });
    }
    return { data: out };
  }

  @Post('actions/:id')
  async run(@Param('id') id: string, @Body() raw: unknown, @Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    const parsed = body.safeParse(raw ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_FAILED', 422, { body: 'invalid' });
    if (registry.find((a) => a.id === id)?.permission === 'platform_admin') {
      if (header(req, 'x-genui-intent') || (header(req, 'x-action-source') ?? 'ui') !== 'ui') throw new AppError('FORBIDDEN', 403, { source: 'platform' });
      const userId = await this.actors.user(req);
      RequestContext.patch({ userId });
      const out = await this.executor.executePlatform(platformContext(userId, { idempotencyKey: header(req, 'idempotency-key'), confirmToken: parsed.data.confirm_token }), id, parsed.data.input);
      res.statusCode = out.status;
      return { data: out.data };
    }
    if (LIFECYCLE_ACTIONS.has(id)) {
      if (header(req, 'x-genui-intent') || (header(req, 'x-action-source') ?? 'ui') !== 'ui') throw new AppError('FORBIDDEN', 403, { source: 'lifecycle' });
      const userId = await this.actors.user(req);
      const ws = header(req, 'x-workspace-id');
      if (!ws || !UUID.test(ws)) throw new AppError('FORBIDDEN', 403, { workspace: 'missing' });
      RequestContext.patch({ ws, userId });
      const out = await this.executor.executeLifecycle(lifecycleContext(userId, ws, { idempotencyKey: header(req, 'idempotency-key') }), id, parsed.data.input);
      res.statusCode = out.status;
      return { data: out.data };
    }
    const ctx = await this.context(req);
    ctx.confirmToken = parsed.data.confirm_token;
    const intent = header(req, 'x-genui-intent');
    const out = intent
      ? await runGenUiAction({ executor: this.executor, intents: this.intents, vault: this.vault }, ctx, id, { handle: intent, input: parsed.data.input, vault: parsed.data.secret_vault })
      : await this.executor.execute(ctx, id, parsed.data.input);
    res.statusCode = out.status;
    return { data: out.data };
  }

  @Post('action-logs/:id/undo')
  @HttpCode(200)
  async undo(@Param('id') id: string, @Req() req: IncomingMessage) {
    const ctx = await this.context(req);
    return { data: await this.undoService.undo(ctx, id) };
  }
}
