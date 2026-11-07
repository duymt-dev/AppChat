// Seed mặc định của DB tenant mới (Blueprint §2.0 vòng đời — bước seed của `tenant.provision`).
// Mỗi domain đăng ký seed của mình (vai trò hệ thống — TIP-005; SLA, loyalty_config, governance, thẻ / agent mẫu — TIP sau).
// Seed phải idempotent (upsert theo khoá tự nhiên): job provision có thể chạy lại.
import type { TenantTx } from './actions/action-context';

export interface TenantSeed {
  /** Tên duy nhất, vd. `authz.system_roles`. */
  name: string;
  /** Thứ tự chạy tăng dần (seed phụ thuộc seed khác đặt số lớn hơn). */
  order: number;
  run(tx: TenantTx, ctx: { workspaceId: string; now: Date }): Promise<void>;
}

const seeds = new Map<string, TenantSeed>();

/** Đăng ký lúc nạp module (top-level của file seed domain); trùng tên → lỗi ngay khi boot. */
export function registerTenantSeed(seed: TenantSeed): void {
  if (seeds.has(seed.name) && seeds.get(seed.name) !== seed) throw new Error(`Trùng tenant seed: ${seed.name}`);
  seeds.set(seed.name, seed);
}

export const tenantSeeds = (): TenantSeed[] => [...seeds.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

/** Chạy mọi seed trong một transaction của DB tenant. */
export async function runTenantSeeds(db: { $transaction<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> }, ctx: { workspaceId: string; now: Date }): Promise<string[]> {
  const list = tenantSeeds();
  await db.$transaction(async (tx) => {
    for (const s of list) await s.run(tx, ctx);
  });
  return list.map((s) => s.name);
}
