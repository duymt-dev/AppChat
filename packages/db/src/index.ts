// @appchat/db — PlatformDb, TenantDbResolver, provisioner, tenant-migrate: TIP-002. Stub TIP-001.
// Schema đa file ở prisma/{platform,tenant}/<file>.prisma; mỗi file thuộc đúng một TIP (02-TASK-GRAPH.md → Bản đồ sở hữu file).
export const DB_SCHEMAS = ['platform', 'tenant'] as const;
export type DbSchema = (typeof DB_SCHEMAS)[number];
