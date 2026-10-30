// Cổng ghi thống nhất (Blueprint §4.3): POST /v1/actions/:id · GET /v1/actions · POST /v1/action-logs/:id/undo.
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { registry } from '@appchat/actions';
import { ActionExecutor, AUTHORIZER, RequestContext, UndoService, type ActionContext, type ActionSource, type Authorizer } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from './request-actor';

const SOURCES: ActionSource[] = ['ui', 'assistant', 'api'];
const body = z.object({ input: z.unknown().optional(), confirm_token: z.string().optional() });
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
      if (!(await this.authorizer.can(ctx, a.permission))) continue;
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
    const ctx = await this.context(req);
    ctx.confirmToken = parsed.data.confirm_token;
    const out = await this.executor.execute(ctx, id, parsed.data.input);
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
