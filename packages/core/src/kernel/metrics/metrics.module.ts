// Gắn metric vào tiến trình (TIP-045b): dựng registry theo tên dịch vụ (api / worker-<role>), lúc scrape đọc số client tenant đang mở;
// worker mở listener 127.0.0.1:<METRICS_PORT> (mỗi vai trò cổng riêng — env của tiến trình). Shutdown: đóng listener + dọn registry để
// module dựng lại (test) không đăng ký trùng.
import { Inject, Module, Optional, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import type { Server } from 'node:http';
import type { TenantDbResolver } from '@appchat/db';
import { ENV_SOURCE } from '../env-source';
import { TENANT_RESOLVER } from '../tenant/tenant.providers';
import { appMetrics, resetMetrics } from './registry';
import { onScrape, startMetricsServer } from './server';

@Module({})
export class MetricsModule implements OnModuleInit, OnApplicationShutdown {
  private server: Server | null = null;
  private off: (() => void) | null = null;

  constructor(
    @Optional() @Inject(ENV_SOURCE) private readonly env?: Record<string, string | undefined>,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants?: TenantDbResolver,
  ) {}

  async onModuleInit(): Promise<void> {
    const env = this.env ?? process.env;
    // Executor có thể đã dựng registry trước (factory provider) — đặt lại nhãn dịch vụ (prom-client gắn nhãn mặc định lúc xuất).
    const service = env.ROLE ? `worker-${env.ROLE}` : 'api';
    appMetrics(service).registry.setDefaultLabels({ service });
    const tenants = this.tenants;
    this.off = onScrape(() => {
      if (tenants) appMetrics().tenantPoolClients.set(tenants.openClients);
    });
    // Chỉ worker mở listener riêng; API phục vụ qua MetricsController trên cổng API.
    if (env.ROLE) this.server = await startMetricsServer(Number(env.METRICS_PORT ?? 0) || undefined, env.METRICS_TOKEN);
  }

  async onApplicationShutdown(): Promise<void> {
    this.off?.();
    if (this.server) await new Promise<void>((ok) => this.server!.close(() => ok()));
    this.server = null;
    resetMetrics();
  }
}
