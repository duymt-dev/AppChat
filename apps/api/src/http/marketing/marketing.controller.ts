// Đọc Marketing (TIP-037, Blueprint §4.4 — shape packages/shared/src/api/marketing.ts): /v1/campaigns?status=&channel=&q=&page=&limit= (D42),
// /campaigns/meta (trước :id), /campaigns/:id (+ trang người nhận đầu), /campaigns/:id/recipients?status=&page=&limit=, /segments,
// /campaign-suggestions, /campaign-analyses/:run_id (trạng thái lượt phân tích của chính người xem). Quyền `campaign.view`; khách chỉ hiện trong scope CRM người xem (service). Ghi qua action segment.* / campaign.*.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CampaignReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v?: string) => (v && /^\d{1,5}$/.test(v) ? Number(v) : undefined);

@Controller()
export class MarketingController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CampaignReadService) private readonly read: CampaignReadService | null,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('campaign.view')) throw new AppError('FORBIDDEN', 403, { permission: 'campaign.view' });
    if (!this.read) throw new AppError('NOT_IMPLEMENTED', 501, { marketing: 'unavailable' });
    return { v: a, read: this.read };
  }

  @Get('campaigns')
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    const { v, read } = await this.viewer(req);
    return read.list(v, { status: q.status, channel: q.channel, q: q.q?.slice(0, 100) }, int(q.page), int(q.limit));
  }

  @Get('campaigns/meta')
  async meta(@Req() req: IncomingMessage) {
    const { v, read } = await this.viewer(req);
    return { data: await read.meta(v) };
  }

  @Get('campaigns/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { v, read } = await this.viewer(req);
    return { data: await read.get(v, id) };
  }

  @Get('campaigns/:id/recipients')
  async recipients(@Req() req: IncomingMessage, @Param('id') id: string, @Query() q: Record<string, string | undefined>) {
    const { v, read } = await this.viewer(req);
    return read.recipients(v, id, q.status, int(q.page), int(q.limit));
  }

  @Get('segments')
  async segments(@Req() req: IncomingMessage) {
    const { v, read } = await this.viewer(req);
    return { data: await read.segments(v) };
  }

  @Get('campaign-analyses/:runId')
  async analysis(@Req() req: IncomingMessage, @Param('runId') runId: string) {
    const { v, read } = await this.viewer(req);
    return { data: await read.analysis(v, runId) };
  }

  @Get('campaign-suggestions')
  async suggestions(@Req() req: IncomingMessage) {
    const { v, read } = await this.viewer(req);
    return { data: await read.suggestions(v) };
  }
}
