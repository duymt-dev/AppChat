// Nối TenantDbResolver vào kênh Redis `tenant-registry:invalidate` (TIP-006c, DEF-002-2): mỗi tiến trình có DB + Redis dùng hai kết nối
// nhân bản (publish / subscribe), đóng khi tắt. Lỗi kênh chỉ ghi cảnh báo — resolver vẫn theo TTL 60 giây + thế hệ trạng thái.
import type { FactoryProvider, OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { connectRegistryBus, type RegistryBusHandle, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../logger/logger';
import { REDIS } from '../redis';
import { TENANT_RESOLVER } from './tenant.providers';

class RegistryBusCloser implements OnApplicationShutdown {
  constructor(private readonly handle: RegistryBusHandle) {}
  async onApplicationShutdown(): Promise<void> {
    await this.handle.close();
  }
}

/** `logger` = token LOGGER của kernel (truyền vào để không import ngược kernel.module). */
export const registryBusProvider = (logger: symbol): FactoryProvider => ({
  provide: 'REGISTRY_BUS',
  inject: [TENANT_RESOLVER, REDIS, logger],
  useFactory: (resolver: TenantDbResolver, redis: Redis, log: AppLogger) =>
    new RegistryBusCloser(connectRegistryBus(resolver, redis.duplicate(), redis.duplicate(), (err) => log.warn({ err }, 'kênh vô hiệu registry lỗi'))),
});
