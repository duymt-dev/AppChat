// @appchat/db — PlatformDb, TenantDbResolver, provisioner, tenant-migrate (TIP-002).
// Schema đa file ở prisma/{platform,tenant}/<file>.prisma; mỗi file thuộc đúng một TIP (02-TASK-GRAPH.md → Bản đồ sở hữu file).
export const DB_SCHEMAS = ['platform', 'tenant'] as const;
export type DbSchema = (typeof DB_SCHEMAS)[number];

export * from './errors';
export * from './registry';
export * from './workspace-registry';
export * from './db-name';
export * from './env';
export * from './tenant-context';
export * from './clients';
export * from './tenant-resolver';
export * from './registry-pubsub';
export * from './provisioner';
export * from './migrations';
export * from './tenant-migrate';
export * from './platform-recorder';
export * from './setup';
export * from './test-env';
// Vòng đời DB tenant (TIP-041): khoá thao tác theo cluster, bản lưu trữ mã hoá, khôi phục vào DB tạm.
export * from './lifecycle/pg-process';
export * from './lifecycle/archive-storage';
export * from './lifecycle/operation-lock';
export * from './lifecycle/archive';
export * from './lifecycle/restore';
