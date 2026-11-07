// Tài nguyên mua thêm (TIP-039, DC-056 / DC-242): quyền lợi một dòng mỗi hoá đơn addon (unique invoice_id — ghi nhận lại / backfill / hai
// worker không cấp đôi), hạn mức = hạn mức gói + addon còn hạn (gói không giới hạn vẫn không giới hạn). Addon hết hạn chỉ thôi tính vào
// hạn mức — không xoá kênh / người đang có (hạ hạn mức không xoá tài nguyên).
import type { QuotaResource } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

type Db = Pick<PlatformDb, 'subscriptionAddon'> | Pick<PlatformTx, 'subscriptionAddon'>;

/** Tổng số lượng addon còn hạn tại `now` theo tài nguyên (users / channels). Agent không có addon. */
export async function activeAddons(
  db: Db,
  workspaceId: string,
  now: Date,
): Promise<Record<'users' | 'channels', number>> {
  const rows = await (db as Pick<PlatformDb, 'subscriptionAddon'>).subscriptionAddon.groupBy({
    by: ['resource'],
    where: { workspaceId, status: 'active', endsAt: { gt: now } },
    _sum: { quantity: true },
  });
  const out = { users: 0, channels: 0 };
  for (const r of rows)
    if (r.resource === 'users' || r.resource === 'channels') out[r.resource] = r._sum.quantity ?? 0;
  return out;
}

/** Hạn mức hiệu lực: gói + addon; `null` (không giới hạn) giữ nguyên. */
export const withAddons = (
  base: number | null,
  resource: QuotaResource,
  add: Record<'users' | 'channels', number>,
) => (base === null || resource === 'agents' ? base : base + add[resource]);

/** Cấp quyền lợi addon cho hoá đơn (trong tx người gọi). false = đã cấp trước đó. */
export async function grantAddon(
  t: PlatformTx,
  a: {
    workspaceId: string;
    invoiceId: string;
    resource: 'users' | 'channels';
    quantity: number;
    startsAt: Date;
    endsAt: Date;
  },
): Promise<boolean> {
  const r = await t.subscriptionAddon.createMany({
    data: [
      {
        id: uuidv7(a.startsAt.getTime()),
        workspaceId: a.workspaceId,
        invoiceId: a.invoiceId,
        resource: a.resource,
        quantity: a.quantity,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: 'active',
        createdAt: a.startsAt,
      },
    ],
    skipDuplicates: true,
  });
  return r.count === 1;
}
