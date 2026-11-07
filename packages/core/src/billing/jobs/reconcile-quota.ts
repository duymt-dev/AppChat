// Đối soát hạn mức kênh / agent (TIP-045b annex E): tài nguyên đang dùng ở DB tenant (kênh chưa ngắt, agent chưa xoá — cùng cách đếm
// lúc kiểm hạn mức) cộng chỗ đặt `quota_reservation` còn mở ở DB nền tảng, so với `plan.max_*`. Chỗ đặt còn mở = thao tác chưa xong →
// lệch do nó là `pending`, không phải `mismatch`. Chỉ tính bản ghi tạo trước mốc cắt.
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { Finding, ReconcileInput } from './reconcile-types';

type Tenant = Pick<TenantDb, 'channelAccount' | 'aiAgent'>;
type Platform = Pick<PlatformDb, 'quotaReservation'>;

const RESOURCES = [
  { resource: 'channels', check: 'quota_channels' },
  { resource: 'agents', check: 'quota_agents' },
] as const;

async function live(t: Tenant, resource: 'channels' | 'agents', cutoff: Date): Promise<number> {
  return resource === 'channels'
    ? t.channelAccount.count({ where: { status: { not: 'disconnected' }, createdAt: { lte: cutoff } } })
    : t.aiAgent.count({ where: { deletedAt: null, createdAt: { lte: cutoff } } });
}

export async function checkQuotas(tenant: Tenant, platform: Platform, r: ReconcileInput): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const { resource, check } of RESOURCES) {
    const limit = r.limits[resource];
    if (limit === null) continue;
    const [used, reserved] = await Promise.all([
      live(tenant, resource, r.cutoff),
      platform.quotaReservation.count({ where: { workspaceId: r.workspaceId, resource, status: 'reserved' } }),
    ]);
    if (used > limit) out.push({ check, reference: resource, severity: 'mismatch', detail: { used, reserved, limit } });
    else if (used + reserved > limit) out.push({ check, reference: resource, severity: 'pending', detail: { used, reserved, limit } });
  }
  return out;
}
