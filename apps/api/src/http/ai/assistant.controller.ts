// Trợ lý AI (TIP-023, Blueprint §4.4 assistant, §4.5): POST /v1/assistant/messages (lượt — JSON chờ cùng run, hoặc SSE theo Accept) · POST
// /v1/assistant/confirm · POST /v1/assistant/preview-edit (SSE: assistant-stream.controller — GET /assistant/runs/:id/stream) · GET /v1/assistant/home · /assistant/sessions?q= · /assistant/sessions/:id/messages · /assistant/runs/:id/trace · GET /v1/action-logs.
// Cần `assistant.use` (nhật ký: mọi thành viên — theo quyền: của mình hoặc hết với `audit.view`).
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { AssistantService, LOG_DAYS, LOG_KINDS, LOG_STATUSES, REDIS, RequestContext } from '@appchat/core';
import { AI_TIERS, AppError, type PermissionKey } from '@appchat/shared';
import { parseBody } from '../identity/http-util';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { pipeRunStream } from './run-stream';

const turnBody = z.object({
  text: z.string().trim().min(1).max(4000),
  mode: z.enum(['chat', 'cowork']).default('chat'),
  session_id: z.string().uuid().optional(),
  tier: z.enum(AI_TIERS).optional(),
  context: z
    .object({ route: z.string().max(300).optional(), entity: z.string().max(40).optional(), id: z.string().max(80).optional(), selection: z.array(z.string().max(80)).max(50).optional(), surface: z.enum(['drawer', 'assistant']).optional() })
    .optional(),
  attachments: z.array(z.object({ id: z.string().max(80), name: z.string().max(200) })).max(10).optional(),
  /** Khoá idempotent của lượt (TIP-023c) — gửi lại cùng khoá → cùng run. */
  request_id: z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/).optional(),
});
const editBody = z.object({ confirm_token: z.string().min(1).max(200), input: z.record(z.string(), z.unknown()) });
const confirmBody = z.object({ confirm_token: z.string().min(1).max(200), decision: z.enum(['confirm', 'cancel']), run_id: z.string().optional() });

const pick = <T extends string>(v: string | undefined, all: readonly T[]): T | undefined => (v && v !== 'all' && (all as readonly string[]).includes(v) ? (v as T) : undefined);

@Controller()
export class AssistantController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(AssistantService) private readonly svc: AssistantService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async caller(req: IncomingMessage, perm?: PermissionKey) {
    const a = await this.actors.resolve(req);
    if (perm && !a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    RequestContext.patch({ ws: a.workspaceId, userId: a.userId });
    return a;
  }

  /** Lượt: JSON (chờ cùng run tới done) hoặc SSE khi `Accept: text/event-stream` (claim rồi nối luồng run ngay — đóng DV-006). */
  @Post('assistant/messages')
  @HttpCode(200)
  async send(@Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse, @Body() body: unknown) {
    const c = await this.caller(req, 'assistant.use');
    const b = parseBody(turnBody, body);
    const q = {
      text: b.text,
      mode: b.mode,
      ...(b.session_id ? { sessionId: b.session_id } : {}),
      ...(b.tier ? { tier: b.tier } : {}),
      ...(b.context ? { context: b.context } : {}),
      ...(b.attachments ? { attachments: b.attachments } : {}),
      ...(b.request_id ? { requestId: b.request_id } : {}),
    };
    if (!String(req.headers.accept ?? '').includes('text/event-stream')) return { data: await this.svc.turn(c, q) };
    const t = await this.svc.claim(c, q);
    res.setHeader('x-assistant-session', t.session_id);
    res.setHeader('x-assistant-run', t.run_id);
    await pipeRunStream(this.svc, this.redis, req, res, c, t.run_id);
    return undefined;
  }

  @Post('assistant/confirm')
  @HttpCode(200)
  async confirm(@Req() req: IncomingMessage, @Body() body: unknown) {
    const c = await this.caller(req, 'assistant.use');
    const b = parseBody(confirmBody, body);
    return { data: await this.svc.confirm(c, { token: b.confirm_token, decision: b.decision }) };
  }

  @Post('assistant/preview-edit')
  @HttpCode(200)
  async editPreview(@Req() req: IncomingMessage, @Body() body: unknown) {
    const c = await this.caller(req, 'assistant.use');
    const b = parseBody(editBody, body);
    return { data: await this.svc.editPreview(c, b.confirm_token, b.input) };
  }

  @Get('assistant/home')
  async home(@Req() req: IncomingMessage) {
    return { data: await this.svc.home(await this.caller(req, 'assistant.use')) };
  }

  @Get('assistant/sessions')
  async sessions(@Req() req: IncomingMessage, @Query('q') q?: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const n = Number(limit);
    return this.svc.sessions(await this.caller(req, 'assistant.use'), (q ?? '').slice(0, 100), { ...(cursor ? { cursor: cursor.slice(0, 200) } : {}), ...(Number.isInteger(n) && n > 0 ? { limit: n } : {}) });
  }

  @Get('assistant/sessions/:id/messages')
  async messages(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.svc.messages(await this.caller(req, 'assistant.use'), id), next_cursor: null };
  }

  @Get('assistant/runs/:id/trace')
  async trace(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.svc.trace(await this.caller(req, 'assistant.use'), id) };
  }

  @Get('action-logs')
  async logs(@Req() req: IncomingMessage, @Query('kind') kind?: string, @Query('status') status?: string, @Query('day') day?: string, @Query('q') q?: string) {
    const c = await this.caller(req);
    const f = { kind: pick(kind, LOG_KINDS), status: pick(status, LOG_STATUSES), day: pick(day, LOG_DAYS), q: (q ?? '').slice(0, 100) };
    return this.svc.actionLogs(c, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)));
  }
}
