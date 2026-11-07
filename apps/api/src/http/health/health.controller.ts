// GET /v1/health — liveness cho nginx / systemd (Blueprint §11). TIP-002 thêm kiểm DB + Redis ở /v1/health/ready.
import { Controller, Get, Inject } from '@nestjs/common';
import { CLOCK, type Clock } from '@appchat/core';

@Controller('health')
export class HealthController {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  @Get()
  health() {
    return { data: { status: 'ok', service: 'api', time: this.clock.now().toISOString() } };
  }
}
