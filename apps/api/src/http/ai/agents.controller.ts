// AI Agents + hàng chờ duyệt + governance (TIP-021, Blueprint §4.4): GET /v1/agents · /agents/meta · /agents/:id ·
// /agents/:id/versions · /agents/:id/tools (D51) · /agent-templates · /approvals?status= · /settings/governance (+ /governance) ·
// /conversations/:id/agent-tools (REQ-C11 — quyền hiệu lực của agent phụ trách, chỉ đọc). Ghi qua action `agent.*` / `approval.*`.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import {
  CLOCK,
  InsightsReadService,
  PLATFORM_DB,
  TENANT_RESOLVER,
  agentTools,
  agentVersions,
  agentsMeta,
  conversationAgentTools,
  getAgent,
  governanceDto,
  isApprovalTab,
  listAgents,
  listApprovals,
  listTemplates,
  readGovernance,
  readHandoffSummary,
  channelBindingPreview,
  visibleConversation,
  type Clock,
} from '@appchat/core';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError, type PermissionKey } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class AgentsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(InsightsReadService) private readonly insights: InsightsReadService,
  ) {}

  /** Người gọi phải có ít nhất một permission trong `perms` (Owner luôn được). */
  private async db(req: IncomingMessage, ...perms: PermissionKey[]) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !perms.some((p) => a.authz.permissions.has(p))) throw new AppError('FORBIDDEN', 403, { permission: perms[0]! });
    return { a, db: await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId)) };
  }

  private names = async (ids: string[]) =>
    new Map((ids.length ? await this.platform.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : []).map((u) => [u.id, u.name || u.email]));

  // Danh sách agent: người gán agent cho kênh / Cowork / menu ＋ Hộp thư cũng cần đọc (tên + kênh) — không chỉ agents.manage.
  @Get('agents')
  async list(@Req() req: IncomingMessage) {
    const { a, db } = await this.db(req, 'agents.manage', 'channels.manage', 'inbox.view', 'assistant.use');
    return { data: await listAgents(db, (ids) => this.insights.cards(a, ids)), next_cursor: null };
  }

  @Get('agents/meta')
  async meta(@Req() req: IncomingMessage) {
    const { a, db } = await this.db(req, 'agents.manage');
    const u = await this.platform.user.findUnique({ where: { id: a.userId }, select: { locale: true } });
    return { data: await agentsMeta(this.platform, db, this.clock.now(), u?.locale ?? 'vi') };
  }

  /**
   * TIP-022b: cảnh báo gán khi tạo / xuất bản agent — agent đang gán THẬT ở từng tài khoản theo loại kênh (`?types=zalo_personal,webchat`).
   * Đổi gán cần `channels.manage` qua `channel.update_settings` (kèm `version`).
   */
  @Get('agents/channel-binding-preview')
  async bindingPreview(@Req() req: IncomingMessage, @Query('types') types?: string) {
    const { db } = await this.db(req, 'agents.manage', 'channels.manage');
    const list = (types ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10);
    return { data: await channelBindingPreview(db, list) };
  }

  @Get('agents/:id')
  async one(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { a, db } = await this.db(req, 'agents.manage');
    return { data: await getAgent(db, id, (ids) => this.insights.cards(a, ids)) };
  }

  @Get('agents/:id/versions')
  async versions(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { db } = await this.db(req, 'agents.manage');
    return { data: await agentVersions(db, id, this.names), next_cursor: null };
  }

  @Get('agents/:id/tools')
  async tools(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { db } = await this.db(req, 'agents.manage');
    return { data: await agentTools(db, id) };
  }

  @Get('agent-templates')
  async templates(@Req() req: IncomingMessage, @Query('q') q?: string, @Query('group') group?: string, @Query('industry') industry?: string, @Query('name') name?: string, @Query('role') role?: string) {
    await this.db(req, 'agents.manage');
    const r = await listTemplates(this.platform, { q: (q ?? '').slice(0, 100), ...(group ? { group } : {}), ...(industry ? { industry } : {}), ...(name ? { name } : {}), ...(role ? { role } : {}) });
    return { data: { data: r.data, total: r.total } };
  }

  @Get('approvals')
  async approvals(@Req() req: IncomingMessage, @Query('status') status?: string) {
    const { a, db } = await this.db(req, 'approvals.decide', 'assistant.use');
    const tab = status ?? 'pending';
    if (!isApprovalTab(tab)) throw new AppError('VALIDATION_FAILED', 400, { status: 'invalid' });
    const ws = await this.platform.workspace.findUnique({ where: { id: a.workspaceId }, select: { timezone: true } });
    return { data: await listApprovals(db, a.authz, tab, this.clock.now(), ws?.timezone ?? 'Asia/Ho_Chi_Minh'), next_cursor: null };
  }

  @Get('settings/governance')
  async governance(@Req() req: IncomingMessage) {
    const { db } = await this.db(req, 'ai.governance');
    return { data: governanceDto(await readGovernance(db)) };
  }

  /** Blueprint §4.4 đặt tên `/v1/governance` — cùng dữ liệu với trang Cài đặt. */
  @Get('governance')
  governanceAlias(@Req() req: IncomingMessage) {
    return this.governance(req);
  }

  @Get('conversations/:id/agent-tools')
  async conversationTools(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { a, db } = await this.db(req, 'inbox.view');
    return {
      data: await db.$transaction(async (tx) => {
        const c = await visibleConversation(tx, a.authz, id);
        return conversationAgentTools(tx, c);
      }),
    };
  }

  /** TIP-022b: tóm tắt bàn giao có cấu trúc — tham chiếu chiếu theo quyền người xem hiện tại. */
  @Get('conversations/:id/handoff-summary')
  async handoffSummary(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { a, db } = await this.db(req, 'inbox.view');
    return { data: await db.$transaction((tx) => readHandoffSummary(tx, a.authz, id)) };
  }
}
