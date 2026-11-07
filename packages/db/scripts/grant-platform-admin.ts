// pnpm --filter @appchat/db db:grant-platform-admin <email> [--revoke] [--test] — cấp / thu quyền quản trị nền tảng cho một user đã có
// (TIP-040, DC-368). Đây là đường DUY NHẤT để cấp: không action, không UI, không API tự cấp (vận hành chạy trên máy chủ, có quyền DB). Ghi
// `platform_audit_log` (action `ops.platform_admin.grant | revoke`, không actor người — chạy từ shell). `--test` → DB nền tảng test (DC-358),
// dùng cho E2E http. Không tạo user mới: user phải đăng ký trước.
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createPlatformDb, testDbEnv } from '../src';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const readEnv = (f: string): Record<string, string> =>
  existsSync(f)
    ? Object.fromEntries(
        readFileSync(f, 'utf8')
          .split(/\r?\n/)
          .filter((l) => /^[A-Z_]+=/.test(l))
          .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
      )
    : {};
const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase();
const revoke = args.includes('--revoke');
if (!email) throw new Error('Dùng: db:grant-platform-admin <email> [--revoke] [--test]');
const base = { ...readEnv(join(ROOT, '.env')), ...process.env } as Record<string, string>;
const env = args.includes('--test') ? { ...base, ...testDbEnv(base) } : base;
if (!env.PLATFORM_DATABASE_URL) throw new Error('Thiếu PLATFORM_DATABASE_URL');

const db = createPlatformDb(env.PLATFORM_DATABASE_URL);
try {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, isPlatformAdmin: true } });
  if (!user) throw new Error('Không có user với email này — đăng ký trước rồi cấp quyền');
  if (user.isPlatformAdmin === !revoke) {
    process.stdout.write(`không đổi (đã ${revoke ? 'không phải' : 'là'} admin nền tảng)\n`);
  } else {
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { isPlatformAdmin: !revoke } }),
      db.platformAuditLog.create({
        data: { id: randomUUID(), actorUserId: null, actionId: revoke ? 'ops.platform_admin.revoke' : 'ops.platform_admin.grant', workspaceId: null, input: { user_id: user.id, via: 'shell' }, result: { platform_admin: !revoke } },
      }),
    ]);
    process.stdout.write(`${revoke ? 'đã thu' : 'đã cấp'} quyền quản trị nền tảng\n`);
  }
} finally {
  await db.$disconnect();
}
