// Tiện ích SQL cho port vòng đời khách: mảng uuid tham số hoá + gom dòng `(kind, n, level)` thành phụ thuộc có count > 0.
import { TenantSql as Prisma } from '@appchat/db';
import type { LifecycleDependency } from './ports';

export type DepRow = { kind: string; n: bigint | number; level: 'block' | 'warn' };

export const idsSql = (ids: readonly string[]) => Prisma.sql`${[...ids]}::uuid[]`;

export const toDeps = (rows: DepRow[]): LifecycleDependency[] =>
  rows.map((r) => ({ kind: r.kind, count: Number(r.n), level: r.level })).filter((d) => d.count > 0);
