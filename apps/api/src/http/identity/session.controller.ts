// Phiên + onboarding cho cổng FE (TIP-011; prototype L9555–9560): GET /v1/session (public — chưa đăng nhập → authed:false, không 401),
// POST /v1/session/ack, GET /v1/workspace/provisioning (workspace đang dùng), GET /v1/auth/brand (public).
import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import { BillingReadService, WorkspacesService } from '@appchat/core';
import { AppError, authBrand, type SessionDto } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { parseBody } from './http-util';

const SIGNED_OUT: SessionDto = { authed: false, declared: false, trialSeen: false, expiredSeen: false, trialDaysLeft: 0, provisioned: false, trialEndsAt: 0, workspace_id: null };
const ack = z.object({ notice: z.enum(['trial_welcome', 'trial_expired']) });

@Controller()
export class SessionController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(WorkspacesService) private readonly workspaces: WorkspacesService,
    @Inject(BillingReadService) private readonly billing: BillingReadService,
  ) {}

  private async userOrNull(req: IncomingMessage): Promise<string | null> {
    try {
      return await this.actors.user(req);
    } catch (e) {
      if (e instanceof AppError && e.code === 'UNAUTHENTICATED') return null;
      throw e;
    }
  }

  /** Workspace đang dùng: DB tenant `active` + đã có subscription (trial tạo bất đồng bộ khi khai báo) mới coi là khởi tạo xong. */
  private async state(userId: string) {
    const o = await this.workspaces.onboarding(userId);
    if (!o) return null;
    const trial = await this.billing.trialState(o.workspaceId);
    const provisioning = !o.declared ? 'running' : o.failed ? 'failed' : o.dbReady && trial.started ? 'ready' : 'running';
    return { o, trial, provisioning } as const;
  }

  @Get('session')
  async session(@Req() req: IncomingMessage): Promise<{ data: SessionDto }> {
    const userId = await this.userOrNull(req);
    if (!userId) return { data: SIGNED_OUT };
    const s = await this.state(userId);
    if (!s) return { data: { ...SIGNED_OUT, authed: true } };
    const { o, trial } = s;
    return {
      data: {
        authed: true,
        declared: o.declared,
        provisioned: s.provisioning === 'ready',
        trialDaysLeft: trial.daysLeft,
        trialEndsAt: trial.endsAt,
        trialSeen: o.notices.includes('trial_welcome'),
        // Chỉ nhắc khi đã hết trial và đang ở gói Miễn phí; gói trả phí / đang trial coi như đã xem.
        expiredSeen: !trial.expired || o.notices.includes('trial_expired'),
        workspace_id: o.workspaceId,
      },
    };
  }

  @Post('session/ack')
  @HttpCode(204)
  async ack(@Body() raw: unknown, @Req() req: IncomingMessage): Promise<void> {
    const userId = await this.actors.user(req);
    await this.workspaces.ackNotice(userId, parseBody(ack, raw).notice);
  }

  @Get('workspace/provisioning')
  async provisioning(@Req() req: IncomingMessage) {
    const s = await this.state(await this.actors.user(req));
    if (!s) throw new AppError('NOT_FOUND', 404, { workspace: 'none' });
    return { data: { status: s.provisioning } };
  }

  @Get('auth/brand')
  brand(@Query('locale') locale?: string) {
    return { data: authBrand(locale) };
  }
}
