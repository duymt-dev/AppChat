// pnpm --filter @appchat/db db:cleanup-test — dọn workspace do integration / E2E tạo (chủ sở hữu email @test.appchat.vn): DROP DB
// tenant (provisioner) + xoá dữ liệu nền tảng liên quan. Chỉ đụng workspace mà MỌI thành viên đều là user test. Hàng trăm DB test
// tồn làm vòng quét mọi workspace (relay outbox, channel sessions) mở cạn `max_connections` của Postgres dev → E2E http đỏ ngẫu nhiên.
// Cần env PLATFORM_DATABASE_URL + PROVISIONER_DATABASE_URL (.env máy dev). Không dùng ở production.
import { createPlatformDb, TenantProvisioner } from '../src/index';

if (process.env.NODE_ENV === 'production') throw new Error('Không dọn ở production');
const platform = createPlatformDb(process.env.PLATFORM_DATABASE_URL!);
const prov = new TenantProvisioner({ adminUrl: process.env.PROVISIONER_DATABASE_URL!, templateDb: process.env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator' });
const TEST = /@test\.appchat\.vn$/;
const say = (...a: unknown[]) => process.stdout.write(`${a.join(' ')}\n`);

const users = await platform.user.findMany({ select: { id: true, email: true } });
const testUsers = new Set(users.filter((u) => TEST.test(u.email)).map((u) => u.id));
const wss = await platform.workspace.findMany({ select: { id: true, dbName: true, ownerUserId: true } });
const members = await platform.membership.findMany({ select: { workspaceId: true, userId: true } });
const byWs = new Map<string, string[]>();
for (const m of members) byWs.set(m.workspaceId, [...(byWs.get(m.workspaceId) ?? []), m.userId]);
const target = wss.filter((w) => testUsers.has(w.ownerUserId) && (byWs.get(w.id) ?? []).every((u) => testUsers.has(u)));
say(`workspace ${wss.length}, test ${target.length}`);
let dropped = 0;
for (const w of target) {
  try {
    if (w.dbName) await prov.drop(w.dbName);
    dropped++;
  } catch (e) {
    say('drop lỗi', w.dbName, (e as Error).message);
  }
}
const ids = target.map((w) => w.id);
type Del = { deleteMany(a: { where: unknown }): Promise<unknown> };
const del = (m: string, where: unknown) =>
  ((platform as unknown as Record<string, Del>)[m]!.deleteMany({ where }) as Promise<unknown>).catch((e: Error) => say('xoá lỗi', m, e.message.slice(0, 120)));
for (const m of ['membership', 'invite', 'businessProfile', 'integrationInterest', 'tenantIntegrationRoute', 'tenantChannelRoute', 'tenantSignRoute', 'billingInvoice', 'creditLedger', 'creditWallet', 'subscription', 'tenantMigration'])
  if ((platform as unknown as Record<string, unknown>)[m]) await del(m, { workspaceId: { in: ids } });
await del('workspace', { id: { in: ids } });
say(`đã drop ${dropped} DB, xoá ${ids.length} workspace`);
await platform.$disconnect();
