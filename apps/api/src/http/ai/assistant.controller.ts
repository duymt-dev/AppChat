// Trợ lý AI (TIP-023, Blueprint §4.4 assistant, §4.5): POST /v1/assistant/messages (lượt — JSON chờ cùng run, hoặc SSE theo Accept; `purpose` inbox_* → bản nháp Hộp thư) · POST
// /v1/assistant/confirm · POST /v1/assistant/preview-edit (SSE: assistant-stream.controller — GET /assistant/runs/:id/stream) · GET /v1/assistant/home · /assistant/sessions?q= · /assistant/sessions/:id/messages · /assistant/runs/:id/trace · GET /v1/action-logs.
// Cần `assistant.use` (nhật ký: mọi thành viên — theo quyền: của mình hoặc hết với `audit.view`).
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { AssistantService, LOG_DAYS, LOG_KINDS, LOG_STATUSES, REDIS, RequestContext, parseRecordIntent } from '@appchat/core';
import { AI_TIERS, AppError, type PermissionKey } from '@appchat/shared';
import { parseBody } from '../identity/http-util';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { pipeRunStream } from './run-stream';

const turnBody = z.object({
  /** Có thể rỗng khi chỉ gửi tệp (TIP-023f §4.1 — người dùng bấm Gửi tường minh); server điền câu hỏi mặc định theo ngôn ngữ. */
  text: z.string().trim().max(4000).default(''),
  mode: z.enum(['chat', 'cowork']).default('chat'),
  session_id: z.string().uuid().optional(),
  tier: z.enum(AI_TIERS).optional(),
  context: z
    .object({ route: z.string().max(300).optional(), entity: z.string().max(40).optional(), id: z.string().max(80).optional(), selection: z.array(z.string().max(80)).max(50).optional(), surface: z.enum(['drawer', 'assistant']).optional() })
    .optional(),
  attachments: z.array(z.object({ id: z.string().max(80), name: z.string().max(200) })).max(10).optional(),
  /** TIP-023f: tệp đã chuẩn bị qua assistant.attachment_prepare — handle + revision (server kiểm lại chủ / ready / nguồn). */
  inputs: z.array(z.object({ artifact_id: z.string().uuid(), revision: z.number().int().min(1) })).max(5).optional(),
  /** TIP-023d §4.3: bản nháp kế hoạch tái dùng gắn vào lượt này (server kiểm chủ / phiên / revision, một lần). */
  plan_draft: z.object({ plan_id: z.string().uuid(), revision: z.number().int().min(1) }).optional(),
  /** TIP-023d §5.1: agent đã chọn (UUID, không tên) — server ghim bản đã xuất bản; không còn chạy → 404, không rơi về agent khác. */
  selected_agent_id: z.string().uuid().nullish(),
  /** Khoá idempotent của lượt (TIP-023c) — gửi lại cùng khoá → cùng run. */
  request_id: z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/).optional(),
  /** TIP-023g: lối vào theo bản ghi — chỉ là tham chiếu (server đọc lại theo quyền hiện hành); kiểm chặt ở core (`parseRecordIntent`). */
  record_intent: z.unknown().optional(),
});
/** Soạn / viết lại tin Hộp thư (REQ-C05c) — cùng endpoint, rẽ theo `purpose` sang cổng chỉ-đề-xuất (không meta-tools). */
const draftBody = z.object({
  purpose: z.enum(['inbox_compose', 'inbox_rewrite']),
  conversation_id: z.string().uuid(),
  base_version: z.number().int().min(0),
  draft: z.string().max(8000).default(''),
  instruction: z.string().trim().max(300).optional(),
});
const editBody = z.object({ confirm_token: z.string().min(1).max(200), input: z.record(z.string(), z.unknown()) });
const confirmBody = z.object({ confirm_token: z.string().min(1).max(200), decision: z.enum(['confirm', 'cancel']), run_id: z.string().optional() });

const partsQuery = z.object({ revision: z.coerce.number().int().min(1), cursor: z.string().max(64).optional(), limit: z.coerce.number().int().min(1).max(8).optional() });
/** Id không phải uuid → 404 như không có (không lộ, không lỗi DB). */
const uuid = (id: string) => {
  if (!z.string().uuid().safeParse(id).success) throw new AppError('NOT_FOUND', 404, { artifact_id: 'not_found' });
  return id;
};

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
    if (body && typeof body === 'object' && 'purpose' in body) {
      const d = parseBody(draftBody, body);
      return { data: await this.svc.draft(c, { purpose: d.purpose, conversationId: d.conversation_id, baseVersion: d.base_version, draft: d.draft, ...(d.instruction ? { instruction: d.instruction } : {}) }) };
    }
    const b = parseBody(turnBody, body);
    if (!b.text && !b.inputs?.length) throw new AppError('VALIDATION_FAILED', 422, { text: 'required' });
    const q = {
      text: b.text,
      mode: b.mode,
      ...(b.session_id ? { sessionId: b.session_id } : {}),
      ...(b.tier ? { tier: b.tier } : {}),
      ...(b.context ? { context: b.context } : {}),
      ...(b.attachments ? { attachments: b.attachments } : {}),
      ...(b.inputs?.length ? { inputs: b.inputs } : {}),
      ...(b.request_id ? { requestId: b.request_id } : {}),
      ...(b.plan_draft ? { planDraft: b.plan_draft } : {}),
      ...(b.selected_agent_id ? { selectedAgentId: b.selected_agent_id } : {}),
      ...(b.record_intent !== undefined ? { recordIntent: parseRecordIntent(b.record_intent) } : {}),
    };
    if (!String(req.headers.accept ?? '').includes('text/event-stream')) return { data: await this.svc.turn(c, q) };
    const t = await this.svc.claim(c, q);
    res.setHeader('x-assistant-session', t.session_id);
    res.setHeader('x-assistant-run', t.run_id);
    await pipeRunStream(this.svc, this.redis, req, res, c, t.run_id);
    return undefined;
  }

  /** TIP-023g §3: đề xuất chỉ đọc theo sản phẩm (combo / chiến dịch) — không ghi nghiệp vụ; áp dụng là thẻ xác nhận riêng. */
  @Post('assistant/record-proposals')
  @HttpCode(200)
  async propose(@Req() req: IncomingMessage, @Body() body: unknown) {
    return { data: await this.svc.propose(await this.caller(req, 'assistant.use'), body) };
  }

  @Get('assistant/record-proposals/:requestId')
  async proposal(@Req() req: IncomingMessage, @Param('requestId') requestId: string) {
    if (!z.string().uuid().safeParse(requestId).success) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
    return { data: await this.svc.proposal(await this.caller(req, 'assistant.use'), requestId) };
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

  /** AI Agent chọn làm chuyên viên Cowork (TIP-023d §5.2) — không cấp quyền agent.manage/view, chỉ metadata đã xuất bản. */
  @Get('assistant/agent-choices')
  async agentChoices(@Req() req: IncomingMessage, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const n = Number(limit);
    return this.svc.agentChoices(await this.caller(req, 'assistant.use'), { ...(cursor ? { cursor: cursor.slice(0, 200) } : {}), ...(Number.isInteger(n) && n > 0 ? { limit: n } : {}) });
  }

  @Get('assistant/sessions/:id/messages')
  async messages(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.svc.messages(await this.caller(req, 'assistant.use'), id), next_cursor: null };
  }

  @Get('assistant/input/:id')
  async input(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.svc.input(await this.caller(req, 'assistant.use'), uuid(id)) };
  }

  @Get('assistant/input/:id/parts')
  async inputParts(@Req() req: IncomingMessage, @Param('id') id: string, @Query() q: unknown) {
    const p = parseBody(partsQuery, q);
    return { data: await this.svc.inputParts(await this.caller(req, 'assistant.use'), { artifact_id: uuid(id), ...p }) };
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
