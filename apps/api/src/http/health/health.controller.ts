// GET /v1/health — liveness cho nginx / systemd (Blueprint §11). TIP-002 thêm kiểm DB + Redis ở /v1/health/ready.
import { Controller, Get, Inject } from '@nestjs/common';
import { CLOCK, type Clock } from '@appchat/core';

@Controller('health')
export class HealthController {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  @Get()
  health() {
    // `instance` (TIP-035d): harness E2E / AI live kiểm đúng worktree đang trả lời cổng — không bao giờ chạy test vào backend lạ.
    return { data: { status: 'ok', service: 'api', instance: process.env.WORKTREE_ID ?? 'main', time: this.clock.now().toISOString() } };
  }
}
