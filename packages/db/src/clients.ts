// Tạo Prisma client có driver adapter pg — DUY NHẤT nơi gọi `new PrismaClient` (tenant-db §4: cấm tạo client tay ngoài packages/db).
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as PlatformClient } from './generated/platform/client';
import { PrismaClient as TenantClient } from './generated/tenant/client';

export type PlatformDb = InstanceType<typeof PlatformClient>;
export type TenantDb = InstanceType<typeof TenantClient>;

export function createPlatformDb(url: string, max = 10): PlatformDb {
  return new PlatformClient({ adapter: new PrismaPg({ connectionString: url, max }) });
}

export function createTenantDb(url: string, max = 3): TenantDb {
  return new TenantClient({ adapter: new PrismaPg({ connectionString: url, max, idleTimeoutMillis: 30_000 }) });
}

/** Dựng SQL tham số hoá cho `$queryRaw` trên DB tenant (`TenantSql.sql`, `TenantSql.join`) — không nối chuỗi tay. */
export { Prisma as TenantSql } from './generated/tenant/client';
